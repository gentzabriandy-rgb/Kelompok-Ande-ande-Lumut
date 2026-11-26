import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  ALL_MODULE_IDS,
  type CollabDocData,
  type ModuleId,
  type ModulesState,
  type StageAlert,
} from '../types/kaskelompok';

const DEFAULT_COLLAB_DOC: CollabDocData = {
  docTitle: 'Notulen Rapat Produksi',
  docContent: '',
  docAlign: 'LEFT',
  docLinkUrl: '',
  docImageUrl: '',
};

export function createEmptyModulesState(): ModulesState {
  return {
    danus_products: {},
    danus_sales: {},
    danus_posters: {},
    konsumsi: {},
    members: {},
    fines: {},
    cashbook: {},
    versions: {},
    suggestions: {},
    presence: {},
    collab_doc: { ...DEFAULT_COLLAB_DOC },
    naskah_scripts: {},
    naskah_cast: {},
    koreo_videos: {},
    koreo_blocking: {},
    lighting_cues: {},
    lighting_gear: {},
    dekor_props: {},
    dekor_sketches: {},
    pubdok_media: {},
    audio_cues: {},
    stage_rundown: {},
    stage_crew: {},
    perkap_gear: {},
    perkap_transport: {},
    stage_alerts: {},
  };
}

export function useGroupModules(
  groupId: string | null,
  uid: string | null,
  onNewStageAlert?: (alert: StageAlert) => void
) {
  const [modules, setModules] = useState<ModulesState>(createEmptyModulesState);
  const [moduleExists, setModuleExists] = useState<Record<ModuleId, boolean>>(() => {
    const map = {} as Record<ModuleId, boolean>;
    for (const id of ALL_MODULE_IDS) map[id] = false;
    return map;
  });
  const [loading, setLoading] = useState(false);

  const alertCallbackRef = useRef(onNewStageAlert);
  alertCallbackRef.current = onNewStageAlert;

  const knownAlertIdsRef = useRef<Set<string>>(new Set());
  const initialAlertLoadedRef = useRef(false);

  useEffect(() => {
    if (!groupId || !uid) {
      setModules(createEmptyModulesState());
      knownAlertIdsRef.current = new Set();
      initialAlertLoadedRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    setModules(createEmptyModulesState());
    knownAlertIdsRef.current = new Set();
    initialAlertLoadedRef.current = false;

    const initialMap: Record<ModuleId, boolean> = {} as Record<ModuleId, boolean>;
    for (const id of ALL_MODULE_IDS) initialMap[id] = false;
    setModuleExists(initialMap);

    let loadedCount = 0;
    const seenInitial = new Set<ModuleId>();

    const unsubscribers = ALL_MODULE_IDS.map((moduleId) => {
      const path = `groups/${groupId}/modules/${moduleId}`;
      const ref = doc(db, 'groups', groupId, 'modules', moduleId);

      return onSnapshot(
        ref,
        (snapshot) => {
          const exists = snapshot.exists();
          setModuleExists((prev) => ({ ...prev, [moduleId]: exists }));

          if (moduleId === 'collab_doc') {
            if (exists) {
              const data = snapshot.data();
              setModules((prev) => ({
                ...prev,
                collab_doc: {
                  docTitle: String(data?.docTitle ?? 'Notulen Rapat Produksi'),
                  docContent: String(data?.docContent ?? ''),
                  docAlign:
                    data?.docAlign === 'CENTER' || data?.docAlign === 'RIGHT'
                      ? data.docAlign
                      : 'LEFT',
                  docLinkUrl: String(data?.docLinkUrl ?? ''),
                  docImageUrl: String(data?.docImageUrl ?? ''),
                  updatedBy: data?.updatedBy ? String(data.updatedBy) : undefined,
                  updatedByName: data?.updatedByName ? String(data.updatedByName) : undefined,
                },
              }));
            } else {
              setModules((prev) => ({ ...prev, collab_doc: { ...DEFAULT_COLLAB_DOC } }));
            }
          } else {
            const rawItems = exists && snapshot.data()?.items && typeof snapshot.data()?.items === 'object'
              ? (snapshot.data()!.items as Record<string, Record<string, unknown>>)
              : {};

            const normalized: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(rawItems)) {
              if (val && typeof val === 'object') {
                normalized[key] = { ...val, id: val.id || key };
              }
            }

            if (moduleId === 'stage_alerts') {
              const alertEntries = Object.entries(normalized) as [string, StageAlert][];
              if (!initialAlertLoadedRef.current) {
                for (const [id] of alertEntries) {
                  knownAlertIdsRef.current.add(id);
                }
                initialAlertLoadedRef.current = true;
              } else {
                const newAlerts = alertEntries
                  .filter(([id]) => !knownAlertIdsRef.current.has(id))
                  .map(([, alert]) => alert)
                  .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

                for (const alert of newAlerts) {
                  knownAlertIdsRef.current.add(alert.id);
                  alertCallbackRef.current?.(alert);
                }
              }
            }

            setModules((prev) => ({
              ...prev,
              [moduleId]: normalized,
            }));
          }

          if (!seenInitial.has(moduleId)) {
            seenInitial.add(moduleId);
            loadedCount += 1;
            if (loadedCount >= ALL_MODULE_IDS.length) {
              setLoading(false);
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    });

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [groupId, uid]);

  return { modules, moduleExists, loading };
}
