import React, { useMemo, useState } from 'react';
import { Edit3, Lightbulb, Plus, Trash2, Wrench } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type {
  LightingCue,
  LightingGear,
  LightingGearStatus,
} from '../../types/kaskelompok';
import { formatRupiah, generateId, parsePositiveNumber } from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

const GEAR_STATUS_LABEL: Record<LightingGearStatus, string> = {
  MILIK: 'Milik Sendiri',
  PINJAM: 'Pinjam',
  SEWA_BELUM_BAYAR: 'Sewa (Belum Bayar)',
  SEWA_DP: 'Sewa (DP)',
  SEWA_LUNAS: 'Sewa (Lunas)',
};

export const LightingTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'cues' | 'gear'>('cues');

  const cues = useMemo(
    () =>
      Object.values(modules.lighting_cues).sort((a, b) =>
        `${a.cueNumber}`.localeCompare(`${b.cueNumber}`, undefined, { numeric: true })
      ),
    [modules.lighting_cues]
  );
  const gear = useMemo(
    () =>
      Object.values(modules.lighting_gear).sort((a, b) =>
        a.equipmentName.localeCompare(b.equipmentName)
      ),
    [modules.lighting_gear]
  );

  // Cue modal
  const [cueModal, setCueModal] = useState(false);
  const [editCue, setEditCue] = useState<LightingCue | null>(null);
  const [cScene, setCScene] = useState('Scene 1');
  const [cNum, setCNum] = useState('Q1');
  const [cGel, setCGel] = useState('Warm Amber');
  const [cDimmer, setCDimmer] = useState('80');
  const [cEffect, setCEffect] = useState('Fade In');
  const [cTime, setCTime] = useState('00:00');
  const [cNote, setCNote] = useState('');

  // Gear modal
  const [gearModal, setGearModal] = useState(false);
  const [editGear, setEditGear] = useState<LightingGear | null>(null);
  const [gName, setGName] = useState('');
  const [gQty, setGQty] = useState('2');
  const [gVendor, setGVendor] = useState('');
  const [gStatus, setGStatus] = useState<LightingGearStatus>('MILIK');
  const [gCost, setGCost] = useState('0');
  const [gNote, setGNote] = useState('');

  const openAddCue = () => {
    setEditCue(null);
    setCScene('Scene 1');
    setCNum(`Q${cues.length + 1}`);
    setCGel('Warm Amber');
    setCDimmer('80');
    setCEffect('Fade In');
    setCTime('00:00');
    setCNote('');
    setCueModal(true);
  };

  const openEditCue = (c: LightingCue) => {
    setEditCue(c);
    setCScene(c.sceneLabel);
    setCNum(c.cueNumber);
    setCGel(c.gelColor);
    setCDimmer(String(c.dimmerPct));
    setCEffect(c.effectType);
    setCTime(c.timestampLabel);
    setCNote(c.note || '');
    setCueModal(true);
  };

  const handleSaveCue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cNum.trim()) return;
    const id = editCue?.id || generateId('lcue');
    const data: LightingCue = {
      id,
      sceneLabel: cScene.trim() || 'Scene',
      cueNumber: cNum.trim(),
      gelColor: cGel.trim() || 'White',
      dimmerPct: Math.min(100, Math.max(0, Math.round(parsePositiveNumber(cDimmer)))),
      effectType: cEffect.trim() || 'Steady',
      timestampLabel: cTime.trim() || '00:00',
      note: cNote.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'lighting_cues',
      itemId: id,
      itemData: data,
      docExists: moduleExists.lighting_cues,
      user,
    });
    setCueModal(false);
    onToast(editCue ? 'Cue lighting diperbarui.' : 'Cue lighting ditambahkan.', 'success');
  };

  const openAddGear = () => {
    setEditGear(null);
    setGName('');
    setGQty('2');
    setGVendor('');
    setGStatus('MILIK');
    setGCost('0');
    setGNote('');
    setGearModal(true);
  };

  const openEditGear = (g: LightingGear) => {
    setEditGear(g);
    setGName(g.equipmentName);
    setGQty(String(g.qty));
    setGVendor(g.sourceOrVendor);
    setGStatus(g.status);
    setGCost(String(g.cost));
    setGNote(g.note || '');
    setGearModal(true);
  };

  const handleSaveGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim()) return;
    const id = editGear?.id || generateId('lgear');
    const data: LightingGear = {
      id,
      equipmentName: gName.trim(),
      qty: Math.max(1, Math.round(parsePositiveNumber(gQty))),
      sourceOrVendor: gVendor.trim() || '-',
      status: gStatus,
      cost: parsePositiveNumber(gCost),
      note: gNote.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'lighting_gear',
      itemId: id,
      itemData: data,
      docExists: moduleExists.lighting_gear,
      user,
    });
    setGearModal(false);
    onToast(editGear ? 'Alat lighting diperbarui.' : 'Alat lighting ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('cues')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'cues' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            <span>Cue Sheet ({cues.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('gear')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'gear' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Inventaris Alat ({gear.length})</span>
          </button>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={subTab === 'cues' ? openAddCue : openAddGear}
            className={primaryBtnClass}
          >
            <Plus className="h-4 w-4" />
            <span>{subTab === 'cues' ? 'Tambah Cue' : 'Tambah Alat'}</span>
          </button>
        )}
      </div>

      {subTab === 'cues' ? (
        cues.length === 0 ? (
          <EmptyState
            title="Belum Ada Lighting Cue Sheet"
            description="Atur nomor cue, adegan, warna gel, dimmer %, efek, dan waktu masuk lampu."
            actionLabel={isEditor ? 'Tambah Cue Pertama' : undefined}
            onAction={isEditor ? openAddCue : undefined}
          />
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#111520] divide-y divide-white/[0.06]">
            {cues.map((c) => (
              <div
                key={c.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#F5C451]">{c.cueNumber}</span>
                    <span className="text-slate-500">·</span>
                    <span className="font-semibold text-slate-200">{c.sceneLabel}</span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-blue-400 tabular-nums">{c.timestampLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-100">
                    Gel: <strong>{c.gelColor}</strong> · Dimmer{' '}
                    <span className="font-mono text-[#F5C451] tabular-nums">{c.dimmerPct}%</span> ·{' '}
                    Efek {c.effectType}
                  </p>
                  {c.note && <p className="mt-0.5 text-xs text-slate-400">{c.note}</p>}
                </div>
                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCue(c)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'lighting_cues',
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
      ) : gear.length === 0 ? (
        <EmptyState
          title="Belum Ada Inventaris Alat Lighting"
          description="Catat PAR LED, follow spot, kabel DMX, vendor sewa, serta status kepemilikan atau pembayarannya."
          actionLabel={isEditor ? 'Tambah Alat Lighting' : undefined}
          onAction={isEditor ? openAddGear : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gear.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    {g.sourceOrVendor} ·{' '}
                    <span className="font-semibold text-[#F5C451]">
                      {GEAR_STATUS_LABEL[g.status]}
                    </span>
                  </p>
                  <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                    {g.equipmentName}{' '}
                    <span className="font-mono text-sm text-blue-400 tabular-nums">×{g.qty}</span>
                  </h4>
                </div>
                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditGear(g)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'lighting_gear',
                          itemId: g.id,
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
              <div className="flex items-center justify-between text-xs border-t border-white/[0.06] pt-2.5">
                <span className="text-slate-400">Biaya</span>
                <span className="font-mono font-semibold text-slate-100 tabular-nums">
                  {formatRupiah(g.cost)}
                </span>
              </div>
              {g.note && <p className="text-xs text-slate-400">{g.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Cue Modal */}
      <ModalShell
        open={cueModal}
        onClose={() => setCueModal(false)}
        title={editCue ? 'Edit Lighting Cue' : 'Tambah Lighting Cue'}
      >
        <form onSubmit={(e) => void handleSaveCue(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Nomor Cue</label>
              <input
                type="text"
                value={cNum}
                onChange={(e) => setCNum(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Adegan</label>
              <input
                type="text"
                value={cScene}
                onChange={(e) => setCScene(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Timestamp</label>
              <input
                type="text"
                value={cTime}
                onChange={(e) => setCTime(e.target.value)}
                placeholder="02:15"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Warna Gel</label>
              <input
                type="text"
                value={cGel}
                onChange={(e) => setCGel(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Dimmer (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={cDimmer}
                onChange={(e) => setCDimmer(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>Efek</label>
              <input
                type="text"
                value={cEffect}
                onChange={(e) => setCEffect(e.target.value)}
                placeholder="Blackout / Strobe / Fade"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Teknis</label>
            <textarea
              rows={2}
              value={cNote}
              onChange={(e) => setCNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCueModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Cue
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Gear Modal */}
      <ModalShell
        open={gearModal}
        onClose={() => setGearModal(false)}
        title={editGear ? 'Edit Alat Lighting' : 'Tambah Alat Lighting'}
      >
        <form onSubmit={(e) => void handleSaveGear(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nama Alat</label>
              <input
                type="text"
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                placeholder="Contoh: PAR LED 54x3W"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Jumlah</label>
              <input
                type="number"
                min={1}
                value={gQty}
                onChange={(e) => setGQty(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Sumber / Vendor</label>
              <input
                type="text"
                value={gVendor}
                onChange={(e) => setGVendor(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={gStatus}
                onChange={(e) => setGStatus(e.target.value as LightingGearStatus)}
                className={selectClass}
              >
                <option value="MILIK">Milik Sendiri</option>
                <option value="PINJAM">Pinjam</option>
                <option value="SEWA_BELUM_BAYAR">Sewa (Belum Bayar)</option>
                <option value="SEWA_DP">Sewa (DP)</option>
                <option value="SEWA_LUNAS">Sewa (Lunas)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Biaya Sewa (Rp)</label>
            <input
              type="number"
              min={0}
              value={gCost}
              onChange={(e) => setGCost(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan</label>
            <textarea
              rows={2}
              value={gNote}
              onChange={(e) => setGNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setGearModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Alat
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
