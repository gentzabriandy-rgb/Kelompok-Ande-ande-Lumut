import React, { useMemo, useState } from 'react';
import { Clapperboard, Edit3, ExternalLink, Film, Plus, Trash2 } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { PubdokCategory, PubdokMedia } from '../../types/kaskelompok';
import { formatDateTime, generateId, safeOpenUrl } from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const PubdokTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<PubdokCategory>('RAW_FOOTAGE');

  const allMedia = useMemo(
    () =>
      Object.values(modules.pubdok_media).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.pubdok_media]
  );

  const rawList = allMedia.filter((m) => m.category === 'RAW_FOOTAGE');
  const finalList = allMedia.filter((m) => m.category === 'FINAL_CUT');
  const activeList = subTab === 'RAW_FOOTAGE' ? rawList : finalList;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PubdokMedia | null>(null);
  const [category, setCategory] = useState<PubdokCategory>('RAW_FOOTAGE');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('Google Drive');
  const [sceneOrDate, setSceneOrDate] = useState('');
  const [duration, setDuration] = useState('01:30');
  const [editorName, setEditorName] = useState(user.displayName || '');

  const openAdd = () => {
    setEditing(null);
    setCategory(subTab);
    setTitle('');
    setUrl('');
    setPlatform('Google Drive');
    setSceneOrDate('');
    setDuration('01:30');
    setEditorName(user.displayName || user.email?.split('@')[0] || '');
    setModalOpen(true);
  };

  const openEdit = (m: PubdokMedia) => {
    setEditing(m);
    setCategory(m.category);
    setTitle(m.title);
    setUrl(m.mediaUrlOrUri);
    setPlatform(m.sourcePlatform);
    setSceneOrDate(m.sceneOrDate);
    setDuration(m.durationLabel);
    setEditorName(m.editorName);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = editing?.id || generateId('pub');
    const data: PubdokMedia = {
      id,
      category,
      title: title.trim(),
      mediaUrlOrUri: url.trim(),
      sourcePlatform: platform.trim() || 'Google Drive',
      sceneOrDate: sceneOrDate.trim() || '-',
      durationLabel: duration.trim() || '-',
      editorName: editorName.trim() || 'Pubdok',
      createdAtMs: editing?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'pubdok_media',
      itemId: id,
      itemData: data,
      docExists: moduleExists.pubdok_media,
      user,
    });
    setModalOpen(false);
    onToast(editing ? 'Media pubdok diperbarui.' : 'Media pubdok ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('RAW_FOOTAGE')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'RAW_FOOTAGE' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="h-4 w-4" />
            <span>Video Mentahan ({rawList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('FINAL_CUT')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'FINAL_CUT' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clapperboard className="h-4 w-4" />
            <span>Hasil Edit ({finalList.length})</span>
          </button>
        </div>

        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Tambah Media</span>
          </button>
        )}
      </div>

      {activeList.length === 0 ? (
        <EmptyState
          title={
            subTab === 'RAW_FOOTAGE'
              ? 'Belum Ada Video Mentahan'
              : 'Belum Ada Hasil Edit Final'
          }
          description="Simpan tautan Google Drive, YouTube, atau folder dokumentasi lengkap dengan durasi dan editor."
          actionLabel={isEditor ? 'Tambah Tautan Media' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((m) => {
            const link = safeOpenUrl(m.mediaUrlOrUri);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-[#F5C451]">{m.sourcePlatform}</span> ·{' '}
                        {m.sceneOrDate} ·{' '}
                        <span className="font-mono tabular-nums">{m.durationLabel}</span>
                      </p>
                      <h4 className="mt-1 font-display text-base font-bold text-slate-100">
                        {m.title}
                      </h4>
                    </div>
                    {isEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'pubdok_media',
                              itemId: m.id,
                              user,
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
                  <span className="text-slate-400 truncate">
                    Editor: {m.editorName} · {formatDateTime(m.createdAtMs)}
                  </span>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300 shrink-0"
                    >
                      <span>Buka Media</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Media Pubdok' : 'Tambah Media Pubdok'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PubdokCategory)}
                className={selectClass}
              >
                <option value="RAW_FOOTAGE">Video Mentahan (Raw)</option>
                <option value="FINAL_CUT">Hasil Edit (Final Cut)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Platform Sumber</label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Google Drive / YouTube / CapCut"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Judul Klip / Video</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Tautan URL Media</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Adegan / Tanggal</label>
              <input
                type="text"
                value={sceneOrDate}
                onChange={(e) => setSceneOrDate(e.target.value)}
                placeholder="Gladi 2 / Scene 4"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Durasi</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="02:45"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>Editor / Kameramen</label>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Media
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
