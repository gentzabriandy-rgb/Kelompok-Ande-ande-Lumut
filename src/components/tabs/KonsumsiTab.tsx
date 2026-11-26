import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { KonsumsiItem, KonsumsiStatus } from '../../types/kaskelompok';
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

const STATUS_LABELS: Record<KonsumsiStatus, string> = {
  BELUM_DP: 'Belum DP',
  DP: 'Sudah DP',
  LUNAS: 'Lunas',
};

export const KonsumsiTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const items = useMemo(
    () => Object.values(modules.konsumsi).sort((a, b) => a.title.localeCompare(b.title)),
    [modules.konsumsi]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KonsumsiItem | null>(null);
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [portions, setPortions] = useState('50');
  const [pricePerPortion, setPricePerPortion] = useState('15000');
  const [dpPaid, setDpPaid] = useState('0');
  const [status, setStatus] = useState<KonsumsiStatus>('BELUM_DP');
  const [note, setNote] = useState('');

  const totals = useMemo(() => {
    let totalCost = 0;
    let totalPaid = 0;
    for (const k of items) {
      const sub = (k.portions || 0) * (k.pricePerPortion || 0);
      totalCost += sub;
      totalPaid += k.status === 'LUNAS' ? Math.max(k.dpPaid || 0, sub) : k.status === 'DP' ? k.dpPaid || 0 : 0;
    }
    return { totalCost, totalPaid, remaining: Math.max(0, totalCost - totalPaid) };
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setVendor('');
    setPortions('50');
    setPricePerPortion('15000');
    setDpPaid('0');
    setStatus('BELUM_DP');
    setNote('');
    setModalOpen(true);
  };

  const openEdit = (k: KonsumsiItem) => {
    setEditing(k);
    setTitle(k.title);
    setVendor(k.vendor);
    setPortions(String(k.portions));
    setPricePerPortion(String(k.pricePerPortion));
    setDpPaid(String(k.dpPaid));
    setStatus(k.status);
    setNote(k.note || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const p = Math.round(parsePositiveNumber(portions));
    const ppp = parsePositiveNumber(pricePerPortion);
    const total = p * ppp;
    const paid = status === 'LUNAS' ? total : status === 'BELUM_DP' ? 0 : parsePositiveNumber(dpPaid);
    const id = editing?.id || generateId('kons');
    const data: KonsumsiItem = {
      id,
      title: title.trim(),
      vendor: vendor.trim() || '-',
      portions: p,
      pricePerPortion: ppp,
      dpPaid: paid,
      status,
      note: note.trim(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'konsumsi',
      itemId: id,
      itemData: data,
      docExists: moduleExists.konsumsi,
      user,
    });
    setModalOpen(false);
    onToast(editing ? 'Data konsumsi diperbarui.' : 'Pesanan konsumsi ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Total Anggaran Konsumsi</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-100 tabular-nums">
            {formatRupiah(totals.totalCost)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Sudah Dibayar / DP</p>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
            {formatRupiah(totals.totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Sisa Tagihan</p>
          <p className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
            {formatRupiah(totals.remaining)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
          Daftar Konsumsi &amp; Catering ({items.length})
        </h3>
        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Tambah Konsumsi</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Belum Ada Daftar Konsumsi"
          description="Catat pesanan snack, makan siang kru, dan konsumsi panitia lengkap dengan status DP atau Lunas."
          actionLabel={isEditor ? 'Tambah Konsumsi' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((k) => {
            const total = (k.portions || 0) * (k.pricePerPortion || 0);
            const paid = k.status === 'LUNAS' ? Math.max(k.dpPaid || 0, total) : k.status === 'DP' ? k.dpPaid || 0 : 0;
            const remain = Math.max(0, total - paid);
            return (
              <div
                key={k.id}
                className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      {k.vendor} ·{' '}
                      <span
                        className={`font-semibold ${
                          k.status === 'LUNAS'
                            ? 'text-emerald-400'
                            : k.status === 'DP'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {STATUS_LABELS[k.status]}
                      </span>
                    </p>
                    <h4 className="mt-0.5 font-display text-base font-bold text-slate-100 truncate">
                      {k.title}
                    </h4>
                  </div>
                  {isEditor && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(k)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteModuleItem({
                            groupId: group.id,
                            moduleId: 'konsumsi',
                            itemId: k.id,
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

                <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-xs font-mono tabular-nums">
                  <div>
                    <span className="block font-sans text-[11px] text-slate-500">
                      {k.portions} porsi × {formatRupiah(k.pricePerPortion)}
                    </span>
                    <span className="text-slate-100 font-semibold">{formatRupiah(total)}</span>
                  </div>
                  <div>
                    <span className="block font-sans text-[11px] text-slate-500">Terbayar</span>
                    <span className="text-emerald-400">{formatRupiah(paid)}</span>
                  </div>
                  <div>
                    <span className="block font-sans text-[11px] text-slate-500">Sisa</span>
                    <span className="text-amber-400 font-semibold">{formatRupiah(remain)}</span>
                  </div>
                </div>
                {k.note && <p className="text-xs text-slate-400">{k.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Pesanan Konsumsi' : 'Tambah Pesanan Konsumsi'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Judul / Kebutuhan</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Nasi Box Kru Gladi"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Vendor / Catering</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Contoh: Dapur Nusantara"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jumlah Porsi</label>
              <input
                type="number"
                min={1}
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Harga per Porsi (Rp)</label>
              <input
                type="number"
                min={0}
                value={pricePerPortion}
                onChange={(e) => setPricePerPortion(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status Pembayaran</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KonsumsiStatus)}
                className={selectClass}
              >
                <option value="BELUM_DP">Belum DP</option>
                <option value="DP">Sudah DP</option>
                <option value="LUNAS">Lunas</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nominal DP Terbayar (Rp)</label>
              <input
                type="number"
                min={0}
                disabled={status !== 'DP'}
                value={
                  status === 'LUNAS'
                    ? String(Math.round(parsePositiveNumber(portions) * parsePositiveNumber(pricePerPortion)))
                    : status === 'BELUM_DP'
                    ? '0'
                    : dpPaid
                }
                onChange={(e) => setDpPaid(e.target.value)}
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Catatan</label>
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
              Simpan Konsumsi
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
