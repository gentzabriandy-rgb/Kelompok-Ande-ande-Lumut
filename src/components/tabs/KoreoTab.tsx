import React, { useMemo, useState } from 'react';
import { Edit3, ExternalLink, Film, LayoutGrid, Plus, Trash2, ZoomIn } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { KoreoBlocking, KoreoVideo } from '../../types/kaskelompok';
import { generateId, parsePositiveNumber, safeOpenUrl } from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  SafeImage,
  secondaryBtnClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const KoreoTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenLightbox,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'videos' | 'blocking'>('videos');

  const videos = useMemo(
    () =>
      Object.values(modules.koreo_videos).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.koreo_videos]
  );
  const blockings = useMemo(
    () =>
      Object.values(modules.koreo_blocking).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.koreo_blocking]
  );

  // Video modal
  const [vidModal, setVidModal] = useState(false);
  const [editVid, setEditVid] = useState<KoreoVideo | null>(null);
  const [vScene, setVScene] = useState('Scene 1');
  const [vTitle, setVTitle] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vTempo, setVTempo] = useState('');
  const [vPct, setVPct] = useState('50');
  const [vPic, setVPic] = useState(user.displayName || '');

  // Blocking modal
  const [blkModal, setBlkModal] = useState(false);
  const [editBlk, setEditBlk] = useState<KoreoBlocking | null>(null);
  const [bScene, setBScene] = useState('Scene 1');
  const [bTitle, setBTitle] = useState('');
  const [bUrl, setBUrl] = useState('');
  const [bIn, setBIn] = useState('');
  const [bOut, setBOut] = useState('');

  const openAddVid = () => {
    setEditVid(null);
    setVScene('Scene 1');
    setVTitle('');
    setVUrl('');
    setVTempo('');
    setVPct('50');
    setVPic(user.displayName || user.email?.split('@')[0] || '');
    setVidModal(true);
  };

  const openEditVid = (v: KoreoVideo) => {
    setEditVid(v);
    setVScene(v.sceneLabel);
    setVTitle(v.title);
    setVUrl(v.urlOrUri);
    setVTempo(v.tempoNotes);
    setVPct(String(v.memorizationPct));
    setVPic(v.picName);
    setVidModal(true);
  };

  const handleSaveVid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vTitle.trim()) return;
    const id = editVid?.id || generateId('kvid');
    const data: KoreoVideo = {
      id,
      sceneLabel: vScene.trim() || 'Scene',
      title: vTitle.trim(),
      urlOrUri: vUrl.trim(),
      tempoNotes: vTempo.trim(),
      memorizationPct: Math.min(100, Math.max(0, Math.round(parsePositiveNumber(vPct)))),
      picName: vPic.trim() || 'Penata Tari',
      createdAtMs: editVid?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'koreo_videos',
      itemId: id,
      itemData: data,
      docExists: moduleExists.koreo_videos,
      user,
    });
    setVidModal(false);
    onToast(editVid ? 'Video koreo diperbarui.' : 'Video koreo ditambahkan.', 'success');
  };

  const openAddBlk = () => {
    setEditBlk(null);
    setBScene('Scene 1');
    setBTitle('');
    setBUrl('');
    setBIn('');
    setBOut('');
    setBlkModal(true);
  };

  const openEditBlk = (b: KoreoBlocking) => {
    setEditBlk(b);
    setBScene(b.sceneLabel);
    setBTitle(b.title);
    setBUrl(b.imageUrlOrUri);
    setBIn(b.entranceNotes);
    setBOut(b.exitNotes);
    setBlkModal(true);
  };

  const handleSaveBlk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim()) return;
    const id = editBlk?.id || generateId('kblk');
    const data: KoreoBlocking = {
      id,
      sceneLabel: bScene.trim() || 'Scene',
      title: bTitle.trim(),
      imageUrlOrUri: bUrl.trim(),
      entranceNotes: bIn.trim(),
      exitNotes: bOut.trim(),
      createdAtMs: editBlk?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'koreo_blocking',
      itemId: id,
      itemData: data,
      docExists: moduleExists.koreo_blocking,
      user,
    });
    setBlkModal(false);
    onToast(editBlk ? 'Pola lantai diperbarui.' : 'Pola lantai ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('videos')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'videos' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="h-4 w-4" />
            <span>Video Referensi ({videos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('blocking')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'blocking' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Pola Lantai ({blockings.length})</span>
          </button>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={subTab === 'videos' ? openAddVid : openAddBlk}
            className={primaryBtnClass}
          >
            <Plus className="h-4 w-4" />
            <span>{subTab === 'videos' ? 'Tambah Video' : 'Tambah Pola Lantai'}</span>
          </button>
        )}
      </div>

      {subTab === 'videos' ? (
        videos.length === 0 ? (
          <EmptyState
            title="Belum Ada Video Referensi Koreo"
            description="Tambahkan tautan video latihan, catatan tempo, PIC, dan progres hafalan tim."
            actionLabel={isEditor ? 'Tambah Video Koreo' : undefined}
            onAction={isEditor ? openAddVid : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((v) => {
              const link = safeOpenUrl(v.urlOrUri);
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-[#F5C451]">{v.sceneLabel}</span> · PIC{' '}
                        {v.picName}
                      </p>
                      <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                        {v.title}
                      </h4>
                    </div>
                    {isEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditVid(v)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'koreo_videos',
                              itemId: v.id,
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

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Progres Hafalan</span>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        {v.memorizationPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.max(0, v.memorizationPct))}%` }}
                      />
                    </div>
                  </div>

                  {v.tempoNotes && (
                    <p className="text-xs text-slate-300 leading-relaxed">{v.tempoNotes}</p>
                  )}

                  {link && (
                    <div className="pt-1">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
                      >
                        <span>Buka Video Referensi</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : blockings.length === 0 ? (
        <EmptyState
          title="Belum Ada Pola Lantai"
          description="Simpan denah blocking panggung beserta arah masuk dan keluar penari/pemeran."
          actionLabel={isEditor ? 'Tambah Pola Lantai' : undefined}
          onAction={isEditor ? openAddBlk : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blockings.map((b) => {
            const imgSrc = safeOpenUrl(b.imageUrlOrUri) || (b.imageUrlOrUri?.startsWith('data:') ? b.imageUrlOrUri : null);
            return (
              <div
                key={b.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111520] flex flex-col"
              >
                <div className="relative">
                  <SafeImage
                    src={imgSrc}
                    alt={b.title}
                    fallbackTitle={b.title}
                    onClick={
                      imgSrc
                        ? () => onOpenLightbox(imgSrc, b.title, b.sceneLabel)
                        : undefined
                    }
                    className={`h-44 w-full object-cover ${imgSrc ? 'cursor-zoom-in' : ''}`}
                  />
                  {imgSrc && (
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(imgSrc, b.title, b.sceneLabel)}
                      className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-sm hover:bg-black"
                      aria-label="Perbesar pola lantai"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-2.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F5C451]">{b.sceneLabel}</p>
                      <h4 className="font-display text-base font-bold text-slate-100">{b.title}</h4>
                    </div>
                    {isEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBlk(b)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'koreo_blocking',
                              itemId: b.id,
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
                  {b.entranceNotes && (
                    <p className="text-xs text-slate-300">
                      <span className="text-emerald-400 font-medium">Masuk:</span> {b.entranceNotes}
                    </p>
                  )}
                  {b.exitNotes && (
                    <p className="text-xs text-slate-300">
                      <span className="text-amber-400 font-medium">Keluar:</span> {b.exitNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal */}
      <ModalShell
        open={vidModal}
        onClose={() => setVidModal(false)}
        title={editVid ? 'Edit Video Koreo' : 'Tambah Video Koreo'}
      >
        <form onSubmit={(e) => void handleSaveVid(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Label Adegan</label>
              <input
                type="text"
                value={vScene}
                onChange={(e) => setVScene(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Judul Koreografi</label>
              <input
                type="text"
                value={vTitle}
                onChange={(e) => setVTitle(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>URL Video Referensi</label>
            <input
              type="url"
              value={vUrl}
              onChange={(e) => setVUrl(e.target.value)}
              placeholder="https://youtube.com/... atau GDrive"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Progres Hafalan (0–100%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={vPct}
                onChange={(e) => setVPct(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>PIC Penata Tari</label>
              <input
                type="text"
                value={vPic}
                onChange={(e) => setVPic(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Tempo &amp; Ketukan</label>
            <textarea
              rows={2}
              value={vTempo}
              onChange={(e) => setVTempo(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setVidModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Video
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Blocking Modal */}
      <ModalShell
        open={blkModal}
        onClose={() => setBlkModal(false)}
        title={editBlk ? 'Edit Pola Lantai' : 'Tambah Pola Lantai'}
      >
        <form onSubmit={(e) => void handleSaveBlk(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Label Adegan</label>
              <input
                type="text"
                value={bScene}
                onChange={(e) => setBScene(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Judul Formasi</label>
              <input
                type="text"
                value={bTitle}
                onChange={(e) => setBTitle(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>URL Gambar Denah Pola Lantai</label>
            <input
              type="url"
              value={bUrl}
              onChange={(e) => setBUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan Arah Masuk (Entrance)</label>
            <input
              type="text"
              value={bIn}
              onChange={(e) => setBIn(e.target.value)}
              placeholder="Contoh: Dari wing kiri 4 penari..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan Arah Keluar (Exit)</label>
            <input
              type="text"
              value={bOut}
              onChange={(e) => setBOut(e.target.value)}
              placeholder="Contoh: Mundur ke wing kanan saat blackout..."
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBlkModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Pola Lantai
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
