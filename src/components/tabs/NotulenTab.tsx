import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BookmarkPlus,
  ExternalLink,
  History,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  deleteModuleItem,
  saveCollabDoc,
  upsertModuleItem,
} from '../../lib/groupService';
import type { CollabDocData, DocAlign, VersionSnapshot } from '../../types/kaskelompok';
import { computeFinancialSummary } from '../../utils/calculations';
import {
  formatDateTime,
  formatRupiah,
  generateId,
  safeOpenUrl,
} from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  goldBtnClass,
  inputClass,
  labelClass,
  SafeImage,
  secondaryBtnClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const NotulenTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenLightbox,
  onToast,
}) => {
  const remoteDoc = modules.collab_doc;
  const [draft, setDraft] = useState<CollabDocData>(remoteDoc);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Sync incoming remote updates when local user is not actively typing
  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(remoteDoc);
    }
  }, [remoteDoc]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const scheduleAutoSave = (next: CollabDocData) => {
    if (!isEditor) return;
    dirtyRef.current = true;
    setSaveState('saving');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          await saveCollabDoc({
            groupId: group.id,
            data: next,
            docExists: moduleExists.collab_doc,
            user,
          });
          dirtyRef.current = false;
          setSaveState('saved');
        } catch {
          setSaveState('idle');
        }
      })();
    }, 650);
  };

  const updateField = <K extends keyof CollabDocData>(
    key: K,
    value: CollabDocData[K]
  ) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    scheduleAutoSave(next);
  };

  const handleManualSave = async () => {
    if (!isEditor) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaveState('saving');
    await saveCollabDoc({
      groupId: group.id,
      data: draft,
      docExists: moduleExists.collab_doc,
      user,
    });
    dirtyRef.current = false;
    setSaveState('saved');
    onToast('Notulen disimpan.', 'success');
  };

  const handleClearNotulen = async () => {
    if (!isEditor) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const cleared: CollabDocData = {
      docTitle: '',
      docContent: '',
      docAlign: 'LEFT',
      docLinkUrl: '',
      docImageUrl: '',
    };
    setDraft(cleared);
    dirtyRef.current = false;
    await saveCollabDoc({
      groupId: group.id,
      data: cleared,
      docExists: moduleExists.collab_doc,
      user,
    });
    setSaveState('saved');
    onToast('Isi notulen dikosongkan.', 'info');
  };

  // Versions Snapshot
  const versions = useMemo(
    () =>
      Object.values(modules.versions).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.versions]
  );
  const [snapModalOpen, setSnapModalOpen] = useState(false);
  const [snapLabel, setSnapLabel] = useState('');

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) return;
    const summary = computeFinancialSummary(group, modules);
    const id = generateId('ver');
    const snap: VersionSnapshot = {
      id,
      label: snapLabel.trim() || `Snapshot ${new Date().toLocaleDateString('id-ID')}`,
      authorName: user.displayName?.trim() || user.email?.split('@')[0] || 'Editor',
      createdAtMs: Date.now(),
      netBalance: summary.netBalance,
      docTitle: draft.docTitle,
      docContent: draft.docContent,
      docAlign: draft.docAlign,
      summaryText: `Saldo ${formatRupiah(summary.netBalance)} · Target ${summary.targetPct}% · ${Object.keys(modules.members).length} anggota`,
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'versions',
      itemId: id,
      itemData: snap,
      docExists: moduleExists.versions,
      user,
    });
    setSnapLabel('');
    setSnapModalOpen(false);
    onToast('Snapshot versi berhasil disimpan.', 'success');
  };

  const handleRestoreSnapshot = async (snap: VersionSnapshot) => {
    if (!isEditor) return;
    const restored: CollabDocData = {
      ...draft,
      docTitle: snap.docTitle,
      docContent: snap.docContent,
      docAlign: snap.docAlign || 'LEFT',
    };
    setDraft(restored);
    dirtyRef.current = false;
    await saveCollabDoc({
      groupId: group.id,
      data: restored,
      docExists: moduleExists.collab_doc,
      user,
    });
    onToast(`Notulen dipulihkan ke versi "${snap.label}".`, 'success');
  };

  const alignClass =
    draft.docAlign === 'CENTER'
      ? 'text-center'
      : draft.docAlign === 'RIGHT'
      ? 'text-right'
      : 'text-left';

  const safeLink = safeOpenUrl(draft.docLinkUrl || '');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Main Collab Doc */}
      <section className="xl:col-span-8 rounded-2xl border border-white/[0.08] bg-[#111520] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
              Notulen Rapat &amp; Catatan Bersama
            </h3>
            <p className="text-xs text-slate-400">
              {saveState === 'saving'
                ? 'Menyimpan perubahan otomatis...'
                : saveState === 'saved'
                ? 'Tersinkronisasi otomatis'
                : remoteDoc.updatedByName
                ? `Terakhir diperbarui oleh ${remoteDoc.updatedByName}`
                : 'Auto-save aktif untuk Mode Editor'}
            </p>
          </div>

          {isEditor && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-[#090B10] p-0.5">
                {(
                  [
                    ['LEFT', AlignLeft],
                    ['CENTER', AlignCenter],
                    ['RIGHT', AlignRight],
                  ] as const
                ).map(([al, Icon]) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => updateField('docAlign', al as DocAlign)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                      draft.docAlign === al
                        ? 'bg-[#2563EB] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Rata ${al}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleManualSave()}
                className={secondaryBtnClass}
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan</span>
              </button>
              <button
                type="button"
                onClick={() => setSnapModalOpen(true)}
                className={goldBtnClass}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span>Simpan Versi</span>
              </button>
              <button
                type="button"
                onClick={() => void handleClearNotulen()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Notulen</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Judul Notulen</label>
          <input
            type="text"
            readOnly={!isEditor}
            value={draft.docTitle}
            onChange={(e) => updateField('docTitle', e.target.value)}
            placeholder="Contoh: Notulen Rapat Koordinasi H-14"
            className={`${inputClass} font-display font-bold text-base ${alignClass} read-only:opacity-90`}
          />
        </div>

        <div>
          <label className={labelClass}>Isi Notulen</label>
          <textarea
            rows={11}
            readOnly={!isEditor}
            value={draft.docContent}
            onChange={(e) => updateField('docContent', e.target.value)}
            placeholder="Tulis poin keputusan rapat, pembagian tugas, atau agenda latihan..."
            className={`${textareaClass} leading-relaxed ${alignClass} read-only:opacity-90`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className={labelClass}>Tautan Referensi (GDrive / Docs)</label>
            <div className="flex gap-2">
              <input
                type="url"
                readOnly={!isEditor}
                value={draft.docLinkUrl}
                onChange={(e) => updateField('docLinkUrl', e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
              {safeLink && (
                <a
                  href={safeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                  aria-label="Buka tautan notulen"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Tautan Gambar Lampiran</label>
            <input
              type="url"
              readOnly={!isEditor}
              value={draft.docImageUrl}
              onChange={(e) => updateField('docImageUrl', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>

        {draft.docImageUrl?.trim() && (
          <div className="pt-2">
            <SafeImage
              src={draft.docImageUrl}
              alt={draft.docTitle || 'Lampiran notulen'}
              fallbackTitle="Lampiran gambar notulen"
              onClick={() =>
                onOpenLightbox(draft.docImageUrl, draft.docTitle || 'Lampiran Notulen')
              }
              className="max-h-64 w-full rounded-xl object-cover border border-white/10 cursor-zoom-in"
            />
          </div>
        )}
      </section>

      {/* Version History Sidebar */}
      <section className="xl:col-span-4 rounded-2xl border border-white/[0.08] bg-[#111520] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#F5C451]" />
            <h3 className="font-display text-base font-bold text-slate-100">
              Riwayat Versi ({versions.length})
            </h3>
          </div>
        </div>

        {versions.length === 0 ? (
          <p className="text-xs text-slate-400 leading-relaxed">
            Belum ada snapshot tersimpan. Gunakan tombol &quot;Simpan Versi&quot; untuk membekukan kondisi saldo dan notulen saat ini.
          </p>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-white/[0.06] bg-[#0B0E16] p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-bold text-slate-100 truncate">
                      {v.label}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {v.authorName} · {formatDateTime(v.createdAtMs)}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#F5C451] tabular-nums shrink-0">
                    {formatRupiah(v.netBalance)}
                  </span>
                </div>
                {v.docTitle && (
                  <p className="text-xs text-slate-300 truncate">Notulen: {v.docTitle}</p>
                )}
                {v.summaryText && (
                  <p className="text-[11px] text-slate-500">{v.summaryText}</p>
                )}
                {isEditor && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleRestoreSnapshot(v)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'versions',
                          itemId: v.id,
                          user,
                        })
                      }
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ModalShell
        open={snapModalOpen}
        onClose={() => setSnapModalOpen(false)}
        title="Simpan Snapshot Versi"
        subtitle="Menyimpan salinan notulen & saldo kas bersih saat ini."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={(e) => void handleCreateSnapshot(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Label Snapshot</label>
            <input
              type="text"
              autoFocus
              value={snapLabel}
              onChange={(e) => setSnapLabel(e.target.value)}
              placeholder="Contoh: Rapat Finalisasi H-7"
              className={inputClass}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSnapModalOpen(false)}
              className={secondaryBtnClass}
            >
              Batal
            </button>
            <button type="submit" className={goldBtnClass}>
              Simpan Snapshot
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
