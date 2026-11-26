import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckSquare,
  Clock,
  Edit3,
  ListOrdered,
  Plus,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { StageAlert, StageCrew, StageRundown } from '../../types/kaskelompok';
import {
  formatDateTime,
  generateId,
  parsePositiveNumber,
} from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  goldBtnClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const StageManagerTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'rundown' | 'crew' | 'alerts'>('rundown');
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const rundown = useMemo(
    () =>
      Object.values(modules.stage_rundown).sort(
        (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
      ),
    [modules.stage_rundown]
  );
  const crew = useMemo(
    () =>
      Object.values(modules.stage_crew).sort((a, b) =>
        a.roleOrTask.localeCompare(b.roleOrTask)
      ),
    [modules.stage_crew]
  );
  const alerts = useMemo(
    () =>
      Object.values(modules.stage_alerts).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.stage_alerts]
  );

  // Rundown modal
  const [runModal, setRunModal] = useState(false);
  const [editRun, setEditRun] = useState<StageRundown | null>(null);
  const [rOrder, setROrder] = useState('1');
  const [rTime, setRTime] = useState('19:00');
  const [rDur, setRDur] = useState('15 menit');
  const [rScene, setRScene] = useState('');
  const [rProp, setRProp] = useState('');
  const [rLightAudio, setRLightAudio] = useState('');

  // Crew modal
  const [crewModal, setCrewModal] = useState(false);
  const [editCrew, setEditCrew] = useState<StageCrew | null>(null);
  const [cRole, setCRole] = useState('');
  const [cPic, setCPic] = useState('');
  const [cReady, setCReady] = useState(false);
  const [cNote, setCNote] = useState('');

  // Alert form
  const [alertTitle, setAlertTitle] = useState('');
  const [alertScene, setAlertScene] = useState('Standby Backstage');
  const [alertMsg, setAlertMsg] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') {
      onToast('Browser ini belum mendukung notifikasi desktop.', 'info');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      onToast('Notifikasi browser diaktifkan untuk panggilan kru.', 'success');
    } else {
      onToast('Izin notifikasi belum diberikan.', 'info');
    }
  };

  const openAddRun = () => {
    setEditRun(null);
    setROrder(String(rundown.length + 1));
    setRTime('19:00');
    setRDur('15 menit');
    setRScene('');
    setRProp('');
    setRLightAudio('');
    setRunModal(true);
  };

  const openEditRun = (r: StageRundown) => {
    setEditRun(r);
    setROrder(String(r.orderIndex));
    setRTime(r.timeLabel);
    setRDur(r.durationLabel);
    setRScene(r.sceneLabel);
    setRProp(r.propCueNotes);
    setRLightAudio(r.lightingAudioNotes);
    setRunModal(true);
  };

  const handleSaveRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rScene.trim()) return;
    const id = editRun?.id || generateId('run');
    const data: StageRundown = {
      id,
      orderIndex: Math.round(parsePositiveNumber(rOrder)),
      timeLabel: rTime.trim() || '00:00',
      durationLabel: rDur.trim() || '-',
      sceneLabel: rScene.trim(),
      propCueNotes: rProp.trim(),
      lightingAudioNotes: rLightAudio.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'stage_rundown',
      itemId: id,
      itemData: data,
      docExists: moduleExists.stage_rundown,
      user,
    });
    setRunModal(false);
    onToast(editRun ? 'Rundown diperbarui.' : 'Rundown ditambahkan.', 'success');
  };

  const openAddCrew = () => {
    setEditCrew(null);
    setCRole('');
    setCPic('');
    setCReady(false);
    setCNote('');
    setCrewModal(true);
  };

  const openEditCrew = (c: StageCrew) => {
    setEditCrew(c);
    setCRole(c.roleOrTask);
    setCPic(c.picName);
    setCReady(c.ready);
    setCNote(c.note || '');
    setCrewModal(true);
  };

  const handleSaveCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cRole.trim()) return;
    const id = editCrew?.id || generateId('crew');
    const data: StageCrew = {
      id,
      roleOrTask: cRole.trim(),
      picName: cPic.trim() || '-',
      ready: cReady,
      note: cNote.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'stage_crew',
      itemId: id,
      itemData: data,
      docExists: moduleExists.stage_crew,
      user,
    });
    setCrewModal(false);
    onToast(editCrew ? 'Checklist kru diperbarui.' : 'Tugas kru ditambahkan.', 'success');
  };

  const toggleCrewReady = async (c: StageCrew) => {
    if (!isEditor) return;
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'stage_crew',
      itemId: c.id,
      itemData: { ...c, ready: !c.ready },
      docExists: moduleExists.stage_crew,
      user,
    });
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor || !alertTitle.trim()) return;
    setSendingAlert(true);
    try {
      const id = generateId('alt');
      const data: StageAlert = {
        id,
        title: alertTitle.trim(),
        message: alertMsg.trim(),
        sceneLabel: alertScene.trim() || 'Stage Call',
        senderName: user.displayName?.trim() || user.email?.split('@')[0] || 'Stage Manager',
        createdAtMs: Date.now(),
      };
      await upsertModuleItem({
        groupId: group.id,
        moduleId: 'stage_alerts',
        itemId: id,
        itemData: data,
        docExists: moduleExists.stage_alerts,
        user,
      });
      setAlertTitle('');
      setAlertMsg('');
      onToast('Panggilan kru dikirim real-time ke semua perangkat.', 'success');
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('rundown')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'rundown' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            <span>Rundown ({rundown.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('crew')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'crew' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Checklist Kru ({crew.filter((c) => c.ready).length}/{crew.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('alerts')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'alerts' ? 'bg-[#D4AF37] text-[#090B10]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Panggilan Kru ({alerts.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notifPerm !== 'unsupported' && notifPerm !== 'granted' && (
            <button
              type="button"
              onClick={() => void requestNotifPermission()}
              className={secondaryBtnClass}
            >
              <Bell className="h-3.5 w-3.5 text-[#F5C451]" />
              <span>Aktifkan Notifikasi Browser</span>
            </button>
          )}
          {isEditor && subTab !== 'alerts' && (
            <button
              type="button"
              onClick={subTab === 'rundown' ? openAddRun : openAddCrew}
              className={primaryBtnClass}
            >
              <Plus className="h-4 w-4" />
              <span>{subTab === 'rundown' ? 'Tambah Rundown' : 'Tambah Tugas Kru'}</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'rundown' && (
        rundown.length === 0 ? (
          <EmptyState
            title="Belum Ada Rundown Acara"
            description="Susun urutan waktu, durasi, adegan, cue properti, serta catatan lampu & audio."
            actionLabel={isEditor ? 'Tambah Rundown Pertama' : undefined}
            onAction={isEditor ? openAddRun : undefined}
          />
        ) : (
          <div className="space-y-3">
            {rundown.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 font-mono text-sm font-bold text-[#F5C451] tabular-nums">
                    #{r.orderIndex}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-blue-400 tabular-nums">
                        <Clock className="h-3.5 w-3.5" />
                        {r.timeLabel}
                      </span>
                      <span>·</span>
                      <span>Durasi {r.durationLabel}</span>
                    </div>
                    <h4 className="font-display text-base font-bold text-slate-100">
                      {r.sceneLabel}
                    </h4>
                    {r.propCueNotes && (
                      <p className="text-xs text-slate-300">
                        <span className="text-[#F5C451] font-medium">Properti:</span> {r.propCueNotes}
                      </p>
                    )}
                    {r.lightingAudioNotes && (
                      <p className="text-xs text-slate-400">
                        <span className="text-blue-400 font-medium">Lampu/Audio:</span> {r.lightingAudioNotes}
                      </p>
                    )}
                  </div>
                </div>

                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditRun(r)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'stage_rundown',
                          itemId: r.id,
                          user,
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {subTab === 'crew' && (
        crew.length === 0 ? (
          <EmptyState
            title="Belum Ada Checklist Kru"
            description="Catat tugas kru panggung, PIC, dan status kesiapan saat gladi maupun hari-H."
            actionLabel={isEditor ? 'Tambah Tugas Kru' : undefined}
            onAction={isEditor ? openAddCrew : undefined}
          />
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#111520] divide-y divide-white/[0.06]">
            {crew.map((c) => (
              <div
                key={c.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  disabled={!isEditor}
                  onClick={() => void toggleCrewReady(c)}
                  className="flex items-start gap-3 text-left min-w-0 flex-1 disabled:cursor-default"
                >
                  <span className="mt-0.5 shrink-0">
                    {c.ready ? (
                      <CheckSquare className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-500" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h4
                      className={`font-display text-sm sm:text-base font-bold ${
                        c.ready ? 'text-emerald-300 line-through' : 'text-slate-100'
                      }`}
                    >
                      {c.roleOrTask}
                    </h4>
                    <p className="text-xs text-slate-400">
                      PIC: <strong className="text-slate-200">{c.picName}</strong>
                      {c.note ? ` · ${c.note}` : ''}
                    </p>
                  </div>
                </button>
                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCrew(c)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'stage_crew',
                          itemId: c.id,
                          user,
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {subTab === 'alerts' && (
        <div className="space-y-6">
          {isEditor && (
            <form
              onSubmit={(e) => void handleSendAlert(e)}
              className="rounded-2xl border border-[#D4AF37]/30 bg-[#111520] p-5 space-y-4"
            >
              <div>
                <h4 className="font-display text-base font-bold text-[#F5C451]">
                  Kirim Panggilan Kru Real-Time
                </h4>
                <p className="text-xs text-slate-400">
                  Panggilan akan muncul sebagai banner langsung &amp; notifikasi di seluruh perangkat yang membuka grup ini.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Judul Panggilan</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="Contoh: Pemeran Scene 3 Standby di Wing Kiri!"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Label Adegan / Area</label>
                  <input
                    type="text"
                    value={alertScene}
                    onChange={(e) => setAlertScene(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Pesan Instruksi (Opsional)</label>
                <textarea
                  rows={2}
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  placeholder="Bawa properti kursi kayu dan mic wireless 2."
                  className={textareaClass}
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={sendingAlert} className={goldBtnClass}>
                  <Send className="h-4 w-4" />
                  <span>{sendingAlert ? 'Mengirim...' : 'Siarkan Panggilan Kru'}</span>
                </button>
              </div>
            </form>
          )}

          {alerts.length === 0 ? (
            <EmptyState
              title="Belum Ada Riwayat Panggilan Kru"
              description="Panggilan darurat atau instruksi standby dari Stage Manager akan tercatat di sini."
            />
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[#F5C451] font-semibold">
                      {al.sceneLabel} · Oleh {al.senderName} · {formatDateTime(al.createdAtMs)}
                    </p>
                    <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-slate-100">
                      {al.title}
                    </h4>
                    {al.message && <p className="mt-1 text-xs text-slate-300">{al.message}</p>}
                  </div>
                  {isEditor && (
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'stage_alerts',
                          itemId: al.id,
                          user,
                        })
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rundown Modal */}
      <ModalShell
        open={runModal}
        onClose={() => setRunModal(false)}
        title={editRun ? 'Edit Item Rundown' : 'Tambah Item Rundown'}
      >
        <form onSubmit={(e) => void handleSaveRun(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Urutan (#)</label>
              <input
                type="number"
                min={1}
                value={rOrder}
                onChange={(e) => setROrder(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Jam Mulai</label>
              <input
                type="text"
                value={rTime}
                onChange={(e) => setRTime(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Durasi</label>
              <input
                type="text"
                value={rDur}
                onChange={(e) => setRDur(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Adegan / Segmen</label>
            <input
              type="text"
              value={rScene}
              onChange={(e) => setRScene(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Cue Properti</label>
            <textarea
              rows={2}
              value={rProp}
              onChange={(e) => setRProp(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cue Lighting &amp; Audio</label>
            <textarea
              rows={2}
              value={rLightAudio}
              onChange={(e) => setRLightAudio(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRunModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Rundown
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Crew Modal */}
      <ModalShell
        open={crewModal}
        onClose={() => setCrewModal(false)}
        title={editCrew ? 'Edit Tugas Kru' : 'Tambah Tugas Kru'}
      >
        <form onSubmit={(e) => void handleSaveCrew(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Peran / Tugas Kru</label>
            <input
              type="text"
              value={cRole}
              onChange={(e) => setCRole(e.target.value)}
              placeholder="Contoh: Stage Hand Wing Kiri"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Nama PIC</label>
            <input
              type="text"
              value={cPic}
              onChange={(e) => setCPic(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Catatan</label>
            <textarea
              rows={2}
              value={cNote}
              onChange={(e) => setCNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cReady}
              onChange={(e) => setCReady(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            <span>Sudah Siap (Ready)</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCrewModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Tugas
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
