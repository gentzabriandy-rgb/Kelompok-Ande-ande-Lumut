import React, { useMemo, useState } from 'react';
import { Edit3, ExternalLink, Music2, Plus, Trash2, Volume2 } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { AudioCue } from '../../types/kaskelompok';
import { generateId, parsePositiveNumber, safeOpenUrl } from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const AudioTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const cues = useMemo(
    () =>
      Object.values(modules.audio_cues).sort((a, b) =>
        `${a.sceneLabel}_${a.entryTimestampSec}`.localeCompare(
          `${b.sceneLabel}_${b.entryTimestampSec}`,
          undefined,
          { numeric: true }
        )
      ),
    [modules.audio_cues]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AudioCue | null>(null);
  const [sceneLabel, setSceneLabel] = useState('Scene 1');
  const [cueTitle, setCueTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [entrySec, setEntrySec] = useState('0');
  const [gearNeeds, setGearNeeds] = useState('Mixer 2 ch + Speaker');
  const [isSfx, setIsSfx] = useState(false);
  const [note, setNote] = useState('');

  const openAdd = () => {
    setEditing(null);
    setSceneLabel('Scene 1');
    setCueTitle('');
    setAudioUrl('');
    setEntrySec('0');
    setGearNeeds('2 Mic Wireless / DI Box');
    setIsSfx(false);
    setNote('');
    setModalOpen(true);
  };

  const openEdit = (a: AudioCue) => {
    setEditing(a);
    setSceneLabel(a.sceneLabel);
    setCueTitle(a.cueTitle);
    setAudioUrl(a.audioUrlOrUri);
    setEntrySec(String(a.entryTimestampSec));
    setGearNeeds(a.audioGearNeeds);
    setIsSfx(Boolean(a.isSfx));
    setNote(a.note || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cueTitle.trim()) return;
    const id = editing?.id || generateId('aud');
    const data: AudioCue = {
      id,
      sceneLabel: sceneLabel.trim() || 'Scene',
      cueTitle: cueTitle.trim(),
      audioUrlOrUri: audioUrl.trim(),
      entryTimestampSec: Math.round(parsePositiveNumber(entrySec)),
      audioGearNeeds: gearNeeds.trim(),
      isSfx,
      note: note.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'audio_cues',
      itemId: id,
      itemData: data,
      docExists: moduleExists.audio_cues,
      user,
    });
    setModalOpen(false);
    onToast(editLabel(editing), 'success');
  };

  function editLabel(e: AudioCue | null) {
    return e ? 'Cue audio diperbarui.' : 'Cue audio ditambahkan.';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
          Cue Musik &amp; Efek Suara ({cues.length})
        </h3>
        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Tambah Audio Cue</span>
          </button>
        )}
      </div>

      {cues.length === 0 ? (
        <EmptyState
          title="Belum Ada Cue Musik & Audio"
          description="Atur BGM, SFX, detik masuk audio, tautan file lagu, serta kebutuhan alat audio per adegan."
          actionLabel={isEditor ? 'Tambah Cue Pertama' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] divide-y divide-white/[0.06]">
          {cues.map((a) => {
            const link = safeOpenUrl(a.audioUrlOrUri);
            return (
              <div
                key={a.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      a.isSfx
                        ? 'bg-[#D4AF37]/15 text-[#F5C451]'
                        : 'bg-[#2563EB]/15 text-blue-400'
                    }`}
                  >
                    {a.isSfx ? <Volume2 className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-[#F5C451]">{a.sceneLabel}</span> ·{' '}
                      <span>{a.isSfx ? 'SFX' : 'Musik / BGM'}</span> · Masuk detik ke-
                      <span className="font-mono text-blue-400 tabular-nums">{a.entryTimestampSec}s</span>
                    </p>
                    <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-slate-100">
                      {a.cueTitle}
                    </h4>
                    {a.audioGearNeeds && (
                      <p className="mt-0.5 text-xs text-slate-300">Alat: {a.audioGearNeeds}</p>
                    )}
                    {a.note && <p className="mt-0.5 text-xs text-slate-400">{a.note}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      <span>Putar / File</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {isEditor && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteModuleItem({
                            groupId: group.id,
                            moduleId: 'audio_cues',
                            itemId: a.id,
                            user,
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
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
        title={editing ? 'Edit Audio Cue' : 'Tambah Audio Cue'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Adegan</label>
              <input
                type="text"
                value={sceneLabel}
                onChange={(e) => setSceneLabel(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Detik Masuk (detik)</label>
              <input
                type="number"
                min={0}
                value={entrySec}
                onChange={(e) => setEntrySec(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Judul Musik / Efek Suara</label>
            <input
              type="text"
              value={cueTitle}
              onChange={(e) => setCueTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>URL File Audio / Spotify / Drive</label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kebutuhan Peralatan Audio</label>
            <input
              type="text"
              value={gearNeeds}
              onChange={(e) => setGearNeeds(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isSfx}
              onChange={(e) => setIsSfx(e.target.checked)}
              className="h-4 w-4 rounded accent-[#D4AF37]"
            />
            <span>Tipe Efek Suara (SFX)</span>
          </label>
          <div>
            <label className={labelClass}>Catatan Operator</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Audio Cue
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
