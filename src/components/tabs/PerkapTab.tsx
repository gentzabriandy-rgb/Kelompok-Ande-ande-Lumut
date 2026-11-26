import React, { useMemo, useState } from 'react';
import { Edit3, Package, Plus, Trash2, Truck } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type {
  PerkapGear,
  PerkapGearStatus,
  PerkapTransport,
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

const PERKAP_STATUS_LABEL: Record<PerkapGearStatus, string> = {
  MILIK: 'Milik Sendiri',
  PINJAM: 'Pinjam',
  SEWA_BELUM: 'Sewa (Belum Bayar)',
  SEWA_LUNAS: 'Sewa (Lunas)',
};

export const PerkapTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'gear' | 'transport'>('gear');

  const gear = useMemo(
    () =>
      Object.values(modules.perkap_gear).sort((a, b) =>
        a.itemName.localeCompare(b.itemName)
      ),
    [modules.perkap_gear]
  );
  const transports = useMemo(
    () =>
      Object.values(modules.perkap_transport).sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      ),
    [modules.perkap_transport]
  );

  // Gear modal
  const [gearModal, setGearModal] = useState(false);
  const [editGear, setEditGear] = useState<PerkapGear | null>(null);
  const [gName, setGName] = useState('');
  const [gQty, setGQty] = useState('1');
  const [gSource, setGSource] = useState('');
  const [gCost, setGCost] = useState('0');
  const [gPic, setGPic] = useState(user.displayName || '');
  const [gStatus, setGStatus] = useState<PerkapGearStatus>('MILIK');
  const [gNote, setGNote] = useState('');

  // Transport modal
  const [transModal, setTransModal] = useState(false);
  const [editTrans, setEditTrans] = useState<PerkapTransport | null>(null);
  const [tVehicle, setTVehicle] = useState('');
  const [tRoute, setTRoute] = useState('');
  const [tTime, setTTime] = useState('07:00 WIB');
  const [tCost, setTCost] = useState('0');
  const [tPic, setTPic] = useState(user.displayName || '');
  const [tNote, setTNote] = useState('');

  const openAddGear = () => {
    setEditGear(null);
    setGName('');
    setGQty('1');
    setGSource('');
    setGCost('0');
    setGPic(user.displayName || user.email?.split('@')[0] || '');
    setGStatus('MILIK');
    setGNote('');
    setGearModal(true);
  };

  const openEditGear = (g: PerkapGear) => {
    setEditGear(g);
    setGName(g.itemName);
    setGQty(String(g.qty));
    setGSource(g.sourceName);
    setGCost(String(g.rentalCost));
    setGPic(g.picName);
    setGStatus(g.status);
    setGNote(g.note || '');
    setGearModal(true);
  };

  const handleSaveGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim()) return;
    const id = editGear?.id || generateId('pgear');
    const data: PerkapGear = {
      id,
      itemName: gName.trim(),
      qty: Math.max(1, Math.round(parsePositiveNumber(gQty))),
      sourceName: gSource.trim() || '-',
      rentalCost: parsePositiveNumber(gCost),
      picName: gPic.trim() || 'Perkap',
      status: gStatus,
      note: gNote.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'perkap_gear',
      itemId: id,
      itemData: data,
      docExists: moduleExists.perkap_gear,
      user,
    });
    setGearModal(false);
    onToast(editGear ? 'Perlengkapan diperbarui.' : 'Perlengkapan ditambahkan.', 'success');
  };

  const openAddTrans = () => {
    setEditTrans(null);
    setTVehicle('');
    setTRoute('');
    setTTime('07:00 WIB');
    setTCost('0');
    setTPic(user.displayName || user.email?.split('@')[0] || '');
    setTNote('');
    setTransModal(true);
  };

  const openEditTrans = (t: PerkapTransport) => {
    setEditTrans(t);
    setTVehicle(t.vehicleName);
    setTRoute(t.routeDesc);
    setTTime(t.departureTime);
    setTCost(String(t.fuelOrRentalCost));
    setTPic(t.picName);
    setTNote(t.note || '');
    setTransModal(true);
  };

  const handleSaveTrans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tVehicle.trim()) return;
    const id = editTrans?.id || generateId('ptrans');
    const data: PerkapTransport = {
      id,
      vehicleName: tVehicle.trim(),
      routeDesc: tRoute.trim(),
      departureTime: tTime.trim() || '-',
      fuelOrRentalCost: parsePositiveNumber(tCost),
      picName: tPic.trim() || 'Perkap',
      note: tNote.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'perkap_transport',
      itemId: id,
      itemData: data,
      docExists: moduleExists.perkap_transport,
      user,
    });
    setTransModal(false);
    onToast(editTrans ? 'Jadwal transport diperbarui.' : 'Jadwal transport ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('gear')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'gear' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Perlengkapan ({gear.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('transport')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'transport' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Transportasi ({transports.length})</span>
          </button>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={subTab === 'gear' ? openAddGear : openAddTrans}
            className={primaryBtnClass}
          >
            <Plus className="h-4 w-4" />
            <span>{subTab === 'gear' ? 'Tambah Perlengkapan' : 'Tambah Transport'}</span>
          </button>
        )}
      </div>

      {subTab === 'gear' ? (
        gear.length === 0 ? (
          <EmptyState
            title="Belum Ada Inventaris Perlengkapan"
            description="Catat HT, kabel rol, lakban, meja registrasi, sumber barang, dan PIC-nya."
            actionLabel={isEditor ? 'Tambah Perlengkapan' : undefined}
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
                      {g.sourceName} · PIC {g.picName} ·{' '}
                      <span className="font-semibold text-[#F5C451]">
                        {PERKAP_STATUS_LABEL[g.status]}
                      </span>
                    </p>
                    <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                      {g.itemName}{' '}
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
                            moduleId: 'perkap_gear',
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
                  <span className="text-slate-400">Biaya Sewa</span>
                  <span className="font-mono font-semibold text-slate-100 tabular-nums">
                    {formatRupiah(g.rentalCost)}
                  </span>
                </div>
                {g.note && <p className="text-xs text-slate-400">{g.note}</p>}
              </div>
            ))}
          </div>
        )
      ) : transports.length === 0 ? (
        <EmptyState
          title="Belum Ada Jadwal Transportasi"
          description="Catat armada mobil/pick-up, rute pengiriman properti, jam keberangkatan, dan estimasi biaya."
          actionLabel={isEditor ? 'Tambah Jadwal Transport' : undefined}
          onAction={isEditor ? openAddTrans : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transports.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    <span className="font-mono font-semibold text-blue-400">{t.departureTime}</span>{' '}
                    · PIC {t.picName}
                  </p>
                  <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                    {t.vehicleName}
                  </h4>
                  {t.routeDesc && <p className="mt-1 text-xs text-slate-300">Rute: {t.routeDesc}</p>}
                </div>
                {isEditor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditTrans(t)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'perkap_transport',
                          itemId: t.id,
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
                <span className="text-slate-400">BBM / Sewa</span>
                <span className="font-mono font-semibold text-[#F5C451] tabular-nums">
                  {formatRupiah(t.fuelOrRentalCost)}
                </span>
              </div>
              {t.note && <p className="text-xs text-slate-400">{t.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Gear Modal */}
      <ModalShell
        open={gearModal}
        onClose={() => setGearModal(false)}
        title={editGear ? 'Edit Perlengkapan' : 'Tambah Perlengkapan'}
      >
        <form onSubmit={(e) => void handleSaveGear(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nama Barang</label>
              <input
                type="text"
                value={gName}
                onChange={(e) => setGName(e.target.value)}
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
                value={gSource}
                onChange={(e) => setGSource(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={gStatus}
                onChange={(e) => setGStatus(e.target.value as PerkapGearStatus)}
                className={selectClass}
              >
                <option value="MILIK">Milik Sendiri</option>
                <option value="PINJAM">Pinjam</option>
                <option value="SEWA_BELUM">Sewa (Belum Bayar)</option>
                <option value="SEWA_LUNAS">Sewa (Lunas)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className={labelClass}>PIC</label>
              <input
                type="text"
                value={gPic}
                onChange={(e) => setGPic(e.target.value)}
                className={inputClass}
              />
            </div>
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
              Simpan Perlengkapan
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Transport Modal */}
      <ModalShell
        open={transModal}
        onClose={() => setTransModal(false)}
        title={editTrans ? 'Edit Jadwal Transport' : 'Tambah Jadwal Transport'}
      >
        <form onSubmit={(e) => void handleSaveTrans(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kendaraan / Armada</label>
              <input
                type="text"
                value={tVehicle}
                onChange={(e) => setTVehicle(e.target.value)}
                placeholder="Contoh: Pick-up L300"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Jam Berangkat</label>
              <input
                type="text"
                value={tTime}
                onChange={(e) => setTTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Rute Perjalanan</label>
            <input
              type="text"
              value={tRoute}
              onChange={(e) => setTRoute(e.target.value)}
              placeholder="Sekolah → Gedung Teater"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Biaya BBM / Sewa (Rp)</label>
              <input
                type="number"
                min={0}
                value={tCost}
                onChange={(e) => setTCost(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>PIC</label>
              <input
                type="text"
                value={tPic}
                onChange={(e) => setTPic(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Muatan</label>
            <textarea
              rows={2}
              value={tNote}
              onChange={(e) => setTNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTransModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Jadwal
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
