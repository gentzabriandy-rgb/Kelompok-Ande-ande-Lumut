import React, { useMemo, useState } from 'react';
import { Edit3, ExternalLink, FileText, Plus, Trash2, Users, ZoomIn } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { NaskahCast, NaskahScript } from '../../types/kaskelompok';
import { formatDateTime, generateId, safeOpenUrl } from '../../utils/formatters';
import { compressImageToBase64, resolveImageSrc } from '../../utils/imageCompress';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  SafeImage,
  secondaryBtnClass,
  selectClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const NaskahTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenLightbox,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'scripts' | 'cast'>('scripts');

  const scripts = useMemo(
    () =>
      Object.values(modules.naskah_scripts).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.naskah_scripts]
  );
  const cast = useMemo(
    () =>
      Object.values(modules.naskah_cast).sort((a, b) =>
        a.characterName.localeCompare(b.characterName)
      ),
    [modules.naskah_cast]
  );

  // Script modal
  const [scriptModal, setScriptModal] = useState(false);
  const [editScript, setEditScript] = useState<NaskahScript | null>(null);
  const [sTitle, setSTitle] = useState('');
  const [sVersion, setSVersion] = useState('v1.0');
  const [sType, setSType] = useState('Google Docs');
  const [sUrl, setSUrl] = useState('');
  const [sNotes, setSNotes] = useState('');

  // Cast modal
  const [castModal, setCastModal] = useState(false);
  const [editCast, setEditCast] = useState<NaskahCast | null>(null);
  const [cChar, setCChar] = useState('');
  const [cActor, setCActor] = useState('');
  const [cClass, setCClass] = useState('XII F1');
  const [cScenes, setCScenes] = useState('');
  const [cCostumeNotes, setCCostumeNotes] = useState('');
  const [cCostumeUrl, setCCostumeUrl] = useState('');
  const [cCostumeB64, setCCostumeB64] = useState('');
  const [compressing, setCompressing] = useState(false);

  const openAddScript = () => {
    setEditScript(null);
    setSTitle('');
    setSVersion('v1.0');
    setSType('Google Docs');
    setSUrl('');
    setSNotes('');
    setScriptModal(true);
  };

  const openEditScript = (item: NaskahScript) => {
    setEditScript(item);
    setSTitle(item.title);
    setSVersion(item.versionLabel);
    setSType(item.fileType || 'Google Docs');
    setSUrl(item.urlOrUri);
    setSNotes(item.sceneNotes || '');
    setScriptModal(true);
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) return;
    const id = editScript?.id || generateId('scr');
    const data: NaskahScript = {
      id,
      title: sTitle.trim(),
      versionLabel: sVersion.trim() || 'v1.0',
      fileType: sType,
      urlOrUri: sUrl.trim(),
      sceneNotes: sNotes.trim(),
      updatedByName: user.displayName?.trim() || user.email?.split('@')[0] || 'Sutradara',
      createdAtMs: editScript?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'naskah_scripts',
      itemId: id,
      itemData: data,
      docExists: moduleExists.naskah_scripts,
      user,
    });
    setScriptModal(false);
    onToast(editScript ? 'Naskah diperbarui.' : 'Naskah ditambahkan.', 'success');
  };

  const openAddCast = () => {
    setEditCast(null);
    setCChar('');
    setCActor('');
    setCClass('XII F1');
    setCScenes('');
    setCCostumeNotes('');
    setCCostumeUrl('');
    setCCostumeB64('');
    setCastModal(true);
  };

  const openEditCast = (item: NaskahCast) => {
    setEditCast(item);
    setCChar(item.characterName);
    setCActor(item.actorName);
    setCClass(item.className);
    setCScenes(item.sceneList);
    setCCostumeNotes(item.costumeNotes);
    setCCostumeUrl(item.costumeImageUrlOrUri || '');
    setCCostumeB64(item.costumeThumbnailB64 || '');
    setCastModal(true);
  };

  const handleCostumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImageToBase64(file, 35 * 1024);
      setCCostumeB64(b64);
      onToast(`Foto kostum dikompresi (${Math.round(b64.length / 1024)} KB).`, 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses gambar.', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const handleSaveCast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cChar.trim() || !cActor.trim()) return;
    const id = editCast?.id || generateId('cast');
    const data: NaskahCast = {
      id,
      characterName: cChar.trim(),
      actorName: cActor.trim(),
      className: cClass.trim() || 'Umum',
      sceneList: cScenes.trim(),
      costumeNotes: cCostumeNotes.trim(),
      costumeImageUrlOrUri: cCostumeUrl.trim(),
      ...(cCostumeB64 ? { costumeThumbnailB64: cCostumeB64 } : {}),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'naskah_cast',
      itemId: id,
      itemData: data,
      docExists: moduleExists.naskah_cast,
      user,
    });
    setCastModal(false);
    onToast(editCast ? 'Data pemeran diperbarui.' : 'Pemeran ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('scripts')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'scripts' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Arsip Naskah ({scripts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cast')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'cast' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Daftar Pemeran ({cast.length})</span>
          </button>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={subTab === 'scripts' ? openAddScript : openAddCast}
            className={primaryBtnClass}
          >
            <Plus className="h-4 w-4" />
            <span>{subTab === 'scripts' ? 'Tambah Naskah' : 'Tambah Pemeran'}</span>
          </button>
        )}
      </div>

      {subTab === 'scripts' ? (
        scripts.length === 0 ? (
          <EmptyState
            title="Belum Ada Arsip Naskah"
            description="Simpan tautan Google Docs, PDF, atau DOCX naskah drama lengkap dengan versi dan catatan adegan."
            actionLabel={isEditor ? 'Tambah Naskah Pertama' : undefined}
            onAction={isEditor ? openAddScript : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scripts.map((s) => {
              const link = safeOpenUrl(s.urlOrUri);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">
                          <span className="font-mono text-[#F5C451]">{s.versionLabel}</span> ·{' '}
                          {s.fileType} · {formatDateTime(s.createdAtMs)}
                        </p>
                        <h4 className="mt-1 font-display text-base font-bold text-slate-100">
                          {s.title}
                        </h4>
                      </div>
                      {isEditor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditScript(s)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void deleteModuleItem({
                                groupId: group.id,
                                moduleId: 'naskah_scripts',
                                itemId: s.id,
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
                    {s.sceneNotes && (
                      <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {s.sceneNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
                    <span className="text-slate-500 truncate">Oleh {s.updatedByName}</span>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300 shrink-0"
                      >
                        <span>Buka Dokumen</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-500">Tanpa tautan</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : cast.length === 0 ? (
        <EmptyState
          title="Belum Ada Daftar Pemeran"
          description="Catat nama karakter, pemeran, daftar adegan, catatan kostum, dan referensi gambar kostum."
          actionLabel={isEditor ? 'Tambah Pemeran Pertama' : undefined}
          onAction={isEditor ? openAddCast : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cast.map((c) => {
            const imgSrc = resolveImageSrc(c.costumeImageUrlOrUri, c.costumeThumbnailB64);
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111520] flex flex-col"
              >
                <div className="relative">
                  <SafeImage
                    src={imgSrc}
                    alt={`Kostum ${c.characterName}`}
                    fallbackTitle={`Kostum ${c.characterName}`}
                    onClick={
                      imgSrc
                        ? () =>
                            onOpenLightbox(
                              imgSrc,
                              `Kostum: ${c.characterName}`,
                              `${c.actorName} · ${c.className}`
                            )
                        : undefined
                    }
                    className={`h-44 w-full object-cover ${imgSrc ? 'cursor-zoom-in' : ''}`}
                  />
                  {imgSrc && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLightbox(
                          imgSrc,
                          `Kostum: ${c.characterName}`,
                          `${c.actorName} · ${c.className}`
                        )
                      }
                      className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-sm hover:bg-black"
                      aria-label="Perbesar kostum"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-[#F5C451] font-semibold truncate">
                          {c.actorName} · {c.className}
                        </p>
                        <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                          {c.characterName}
                        </h4>
                      </div>
                      {isEditor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditCast(c)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void deleteModuleItem({
                                groupId: group.id,
                                moduleId: 'naskah_cast',
                                itemId: c.id,
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
                    {c.sceneList && (
                      <p className="mt-2 text-xs text-slate-300">
                        <span className="text-slate-500">Adegan:</span> {c.sceneList}
                      </p>
                    )}
                    {c.costumeNotes && (
                      <p className="mt-1 text-xs text-slate-400">{c.costumeNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Script Modal */}
      <ModalShell
        open={scriptModal}
        onClose={() => setScriptModal(false)}
        title={editScript ? 'Edit Arsip Naskah' : 'Tambah Arsip Naskah'}
      >
        <form onSubmit={(e) => void handleSaveScript(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Judul Naskah</label>
            <input
              type="text"
              value={sTitle}
              onChange={(e) => setSTitle(e.target.value)}
              placeholder="Contoh: Naskah Utama Babak 1-3"
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Versi</label>
              <input
                type="text"
                value={sVersion}
                onChange={(e) => setSVersion(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipe Dokumen</label>
              <select
                value={sType}
                onChange={(e) => setSType(e.target.value)}
                className={selectClass}
              >
                <option value="Google Docs">Google Docs</option>
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tautan URL Dokumen</label>
            <input
              type="url"
              value={sUrl}
              onChange={(e) => setSUrl(e.target.value)}
              placeholder="https://docs.google.com/..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan Adegan / Revisi</label>
            <textarea
              rows={3}
              value={sNotes}
              onChange={(e) => setSNotes(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setScriptModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Naskah
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Cast Modal */}
      <ModalShell
        open={castModal}
        onClose={() => setCastModal(false)}
        title={editCast ? 'Edit Pemeran & Kostum' : 'Tambah Pemeran & Kostum'}
      >
        <form onSubmit={(e) => void handleSaveCast(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nama Karakter</label>
              <input
                type="text"
                value={cChar}
                onChange={(e) => setCChar(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nama Pemeran (Aktor)</label>
              <input
                type="text"
                value={cActor}
                onChange={(e) => setCActor(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kelas</label>
              <input
                type="text"
                value={cClass}
                onChange={(e) => setCClass(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Daftar Adegan</label>
              <input
                type="text"
                value={cScenes}
                onChange={(e) => setCScenes(e.target.value)}
                placeholder="Scene 1, 3, 5"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Kostum</label>
            <textarea
              rows={2}
              value={cCostumeNotes}
              onChange={(e) => setCCostumeNotes(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>Unggah Gambar Gambaran Kostum (Kompres ≤ 35KB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleCostumeUpload(e)}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-[#2563EB] file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
            />
            {compressing && <p className="mt-1 text-xs text-[#F5C451]">Mengompresi foto...</p>}
            {cCostumeB64 && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={`data:image/jpeg;base64,${cCostumeB64}`}
                  alt="Kostum preview"
                  className="h-14 w-14 rounded-lg object-cover border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setCCostumeB64('')}
                  className="text-xs text-red-400 hover:underline"
                >
                  Hapus gambar lokal
                </button>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Atau Tautan URL Gambar Kostum (Opsional)</label>
            <input
              type="url"
              value={cCostumeUrl}
              onChange={(e) => setCCostumeUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCastModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" disabled={compressing} className={primaryBtnClass}>
              Simpan Pemeran
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
