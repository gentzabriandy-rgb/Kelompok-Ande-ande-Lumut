import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Edit3, Plus, Trash2 } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { FineItem } from '../../types/kaskelompok';
import {
  formatRupiah,
  generateId,
  parsePositiveNumber,
  todayDateLabel,
} from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const DendaTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const fines = useMemo(
    () =>
      Object.values(modules.fines).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.fines]
  );

  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const filtered = useMemo(() => {
    if (filter === 'UNPAID') return fines.filter((f) => !f.paid);
    if (filter === 'PAID') return fines.filter((f) => f.paid);
    return fines;
  }, [fines, filter]);

  const totalPaid = fines.filter((f) => f.paid).reduce((s, f) => s + (f.amount || 0), 0);
  const totalUnpaid = fines.filter((f) => !f.paid).reduce((s, f) => s + (f.amount || 0), 0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FineItem | null>(null);
  const [memberName, setMemberName] = useState('');
  const [className, setClassName] = useState('XII F1');
  const [dateLabel, setDateLabel] = useState(todayDateLabel());
  const [reason, setReason] = useState('Terlambat / Tidak Hadir Latihan');
  const [amount, setAmount] = useState(String(group.fineRate || 50000));
  const [paid, setPaid] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setMemberName('');
    setClassName('XII F1');
    setDateLabel(todayDateLabel());
    setReason('Terlambat / Tidak Hadir Latihan');
    setAmount(String(group.fineRate || 50000));
    setPaid(false);
    setModalOpen(true);
  };

  const openEdit = (f: FineItem) => {
    setEditing(f);
    setMemberName(f.memberName);
    setClassName(f.className);
    setDateLabel(f.dateLabel);
    setReason(f.reason);
    setAmount(String(f.amount));
    setPaid(f.paid);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    const id = editing?.id || generateId('fine');
    const data: FineItem = {
      id,
      memberName: memberName.trim(),
      className: className.trim() || 'Umum',
      dateLabel: dateLabel.trim() || todayDateLabel(),
      reason: reason.trim() || 'Pelanggaran Latihan',
      amount: parsePositiveNumber(amount),
      paid,
      createdAtMs: editing?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'fines',
      itemId: id,
      itemData: data,
      docExists: moduleExists.fines,
      user,
    });
    setModalOpen(false);
    onToast(editing ? 'Catatan denda diperbarui.' : 'Denda latihan ditambahkan.', 'success');
  };

  const togglePaid = async (f: FineItem) => {
    if (!isEditor) return;
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'fines',
      itemId: f.id,
      itemData: { ...f, paid: !f.paid },
      docExists: moduleExists.fines,
      user,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Denda Sudah Lunas (Masuk Kas)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {formatRupiah(totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Total Tunggakan Denda</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-400 tabular-nums">
            {formatRupiah(totalUnpaid)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['ALL', `Semua (${fines.length})`],
              ['UNPAID', `Belum Bayar (${fines.filter((f) => !f.paid).length})`],
              ['PAID', `Lunas (${fines.filter((f) => f.paid).length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                filter === key
                  ? 'bg-[#D4AF37] text-[#090B10]'
                  : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Catat Denda</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum Ada Catatan Denda"
          description={`Tarif denda default grup saat ini adalah ${formatRupiah(group.fineRate || 50000)}.`}
          actionLabel={isEditor ? 'Catat Denda Baru' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] divide-y divide-white/[0.06]">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-[#F5C451]">{f.className}</span> · {f.dateLabel}
                </p>
                <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-slate-100">
                  {f.memberName}
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">{f.reason}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
                <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {formatRupiah(f.amount)}
                </span>
                <button
                  type="button"
                  disabled={!isEditor}
                  onClick={() => void togglePaid(f)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    f.paid
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/15 text-red-300'
                  } ${!isEditor ? 'opacity-80 cursor-default' : 'hover:opacity-90'}`}
                >
                  {f.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  <span>{f.paid ? 'Lunas' : 'Belum Bayar'}</span>
                </button>
                {isEditor && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteModuleItem({
                          groupId: group.id,
                          moduleId: 'fines',
                          itemId: f.id,
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
            </div>
          ))}
        </div>
      )}

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Denda Latihan' : 'Catat Denda Latihan'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nama Anggota</label>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Kelas</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tanggal Latihan</label>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nominal Denda (Rp)</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Alasan / Keterangan</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            <span>Sudah dibayar lunas</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Denda
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
