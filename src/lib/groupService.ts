import type { User } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ALL_MODULE_IDS,
  type CollabDocData,
  type ModuleId,
} from '../types/kaskelompok';
import {
  buildFirestoreErrorInfo,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function getUserDisplayName(user: User): string {
  return user.displayName?.trim() || user.email?.split('@')[0] || 'Pengguna';
}

export async function createGroup(params: {
  name: string;
  targetAmount: number;
  fineRate: number;
  pin: string;
  user: User;
}): Promise<string> {
  const { name, targetAmount, fineRate, pin, user } = params;
  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;
  const inviteCode = generateInviteCode(6);
  const pinHash = await sha256Hex(pin.trim());
  const displayName = getUserDisplayName(user);

  // Batch 1: group + security/config + groupInvites/{inviteCode}
  const batch1 = writeBatch(db);
  batch1.set(groupRef, {
    name: name.trim(),
    inviteCode,
    ownerId: user.uid,
    memberUids: [user.uid],
    editorUids: [user.uid],
    targetAmount: Math.max(0, Math.round(targetAmount)),
    fineRate: Math.max(0, Math.round(fineRate)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch1.set(doc(db, 'groups', groupId, 'security', 'config'), {
    pinHash,
  });
  batch1.set(doc(db, 'groupInvites', inviteCode), {
    groupId,
    inviteCode,
    createdAt: serverTimestamp(),
  });

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}`);
  }

  // Batch 2: module documents
  const batch2 = writeBatch(db);
  for (const moduleId of ALL_MODULE_IDS) {
    const modRef = doc(db, 'groups', groupId, 'modules', moduleId);
    const basePayload: Record<string, unknown> = {
      groupId,
      moduleType: moduleId,
      items: {},
      updatedBy: user.uid,
      updatedByName: displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (moduleId === 'collab_doc') {
      basePayload.docTitle = 'Notulen Rapat Produksi';
      basePayload.docContent = '';
      basePayload.docAlign = 'LEFT';
      basePayload.docLinkUrl = '';
      basePayload.docImageUrl = '';
    }
    batch2.set(modRef, basePayload);
  }

  try {
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/modules`);
  }

  return groupId;
}

export async function joinGroupByCode(params: {
  rawCode: string;
  uid: string;
}): Promise<string> {
  const code = params.rawCode.trim().toUpperCase();
  if (!code) {
    throw new Error('Kode undangan tidak boleh kosong.');
  }

  const invitePath = `groupInvites/${code}`;
  let inviteSnap;
  try {
    inviteSnap = await getDoc(doc(db, 'groupInvites', code));
  } catch (error) {
    const info = buildFirestoreErrorInfo(error, OperationType.GET, invitePath);
    console.error('Firestore Error: ', JSON.stringify(info));
    throw new Error('Gagal memeriksa kode undangan. Periksa koneksi atau izin akses.');
  }

  if (!inviteSnap.exists()) {
    throw new Error(`Kode undangan "${code}" tidak ditemukan.`);
  }

  const groupId = String(inviteSnap.data()?.groupId || '');
  if (!groupId) {
    throw new Error('Data kode undangan tidak valid.');
  }

  const groupPath = `groups/${groupId}`;
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      memberUids: arrayUnion(params.uid),
      joinCodeUsed: code,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const info = buildFirestoreErrorInfo(error, OperationType.UPDATE, groupPath);
    console.error('Firestore Error: ', JSON.stringify(info));
    throw new Error('Gagal bergabung ke grup. Pastikan kode undangan benar.');
  }

  return groupId;
}

export async function unlockEditorWithPin(params: {
  groupId: string;
  pin: string;
  uid: string;
}): Promise<void> {
  const cleanPin = params.pin.trim();
  if (!cleanPin) {
    throw new Error('PIN tidak boleh kosong.');
  }
  const pinProof = await sha256Hex(cleanPin);
  const path = `groups/${params.groupId}`;

  try {
    await updateDoc(doc(db, 'groups', params.groupId), {
      editorUids: arrayUnion(params.uid),
      pinProof,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const info = buildFirestoreErrorInfo(error, OperationType.UPDATE, path);
    console.error('Firestore Error: ', JSON.stringify(info));
    throw new Error('PIN Editor salah atau akses ditolak.');
  }
}

export async function updateGroupSettings(params: {
  groupId: string;
  name?: string;
  targetAmount: number;
  fineRate: number;
}): Promise<void> {
  const path = `groups/${params.groupId}`;
  const payload: Record<string, unknown> = {
    targetAmount: Math.max(0, Math.round(params.targetAmount)),
    fineRate: Math.max(0, Math.round(params.fineRate)),
    updatedAt: serverTimestamp(),
  };
  if (params.name && params.name.trim()) {
    payload.name = params.name.trim();
  }
  try {
    await updateDoc(doc(db, 'groups', params.groupId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertModuleItem<T extends object>(params: {
  groupId: string;
  moduleId: ModuleId;
  itemId: string;
  itemData: T;
  docExists: boolean;
  user: User;
  silentOnError?: boolean;
}): Promise<void> {
  const { groupId, moduleId, itemId, itemData, docExists, user, silentOnError } = params;
  const path = `groups/${groupId}/modules/${moduleId}`;
  const ref = doc(db, 'groups', groupId, 'modules', moduleId);
  const updatedByName = getUserDisplayName(user);

  try {
    if (!docExists) {
      await setDoc(ref, {
        groupId,
        moduleType: moduleId,
        items: { [itemId]: itemData },
        updatedBy: user.uid,
        updatedByName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        [`items.${itemId}`]: itemData,
        updatedBy: user.uid,
        updatedByName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (silentOnError) {
      const info = buildFirestoreErrorInfo(error, OperationType.WRITE, path);
      console.warn('Silent Firestore Write Warning:', JSON.stringify(info));
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteModuleItem(params: {
  groupId: string;
  moduleId: ModuleId;
  itemId: string;
  user: User;
}): Promise<void> {
  const { groupId, moduleId, itemId, user } = params;
  const path = `groups/${groupId}/modules/${moduleId}`;
  const ref = doc(db, 'groups', groupId, 'modules', moduleId);

  try {
    await updateDoc(ref, {
      [`items.${itemId}`]: deleteField(),
      updatedBy: user.uid,
      updatedByName: getUserDisplayName(user),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function clearModuleItems(params: {
  groupId: string;
  moduleId: ModuleId;
  docExists: boolean;
  user: User;
}): Promise<void> {
  const { groupId, moduleId, docExists, user } = params;
  if (!docExists) return;
  const path = `groups/${groupId}/modules/${moduleId}`;
  const ref = doc(db, 'groups', groupId, 'modules', moduleId);
  try {
    await updateDoc(ref, {
      items: {},
      updatedBy: user.uid,
      updatedByName: getUserDisplayName(user),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveCollabDoc(params: {
  groupId: string;
  data: CollabDocData;
  docExists: boolean;
  user: User;
}): Promise<void> {
  const { groupId, data, docExists, user } = params;
  const path = `groups/${groupId}/modules/collab_doc`;
  const ref = doc(db, 'groups', groupId, 'modules', 'collab_doc');
  const updatedByName = getUserDisplayName(user);

  const fields = {
    docTitle: data.docTitle,
    docContent: data.docContent,
    docAlign: data.docAlign,
    docLinkUrl: data.docLinkUrl,
    docImageUrl: data.docImageUrl,
    updatedBy: user.uid,
    updatedByName,
    updatedAt: serverTimestamp(),
  };

  try {
    if (!docExists) {
      await setDoc(ref, {
        groupId,
        moduleType: 'collab_doc',
        items: {},
        ...fields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, fields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
