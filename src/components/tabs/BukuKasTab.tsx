import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Edit3, Plus, Trash2 } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { CashbookItem, CashbookType } from '../../types/kaskelompok';
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
  selectClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

const TYPE_LABEL: Record<CashbookType, string> = {
  SPONSOR: 'Sponsor',
  PEMASUKAN_LAIN: 'Pemasukan Lain',
  PENGELUARAN: 'Pengeluaran',
};

export const BukuKasTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const entries = useMemo(
    () =>
      Object.values(modules.cashbook).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.cashbook]
  );

  const [filter, setFilter] = useState<'ALL' | CashbookType>('ALL');
  const filtered = useMemo(
    () => (filter === 'ALL' ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter]
  );

  const totalSponsor = entries
    .filter((e) => e.type === 'SPONSOR')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalOther = entries
    .filter((e) => e.type === 'PEMASUKAN_LAIN')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpense = entries
    .filter((e) => e.type === 'PENGELUARAN')
    .reduce((s, e) => s + (e.amount || 0), 0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CashbookItem | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CashbookType>('SPONSOR');
  const [amount, setAmount] = useState('');
  const [picName, setPicName] = useState(user.displayName || '');
  const [dateLabel, setDateLabel] = useState(todayDateLabel());
  const [note, setNote] = useState('');

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setType('SPONSOR');
    setAmount('');
    setPicName(user.displayName || user.email?.split('@')[0] || '');
    setDateLabel(todayDateLabel());
    setNote('');
    setModalOpen(true);
  };

  const openEdit = (item: CashbookItem) => {
    setEditing(item);
    setTitle(item.title);
    setType(item.type);
    setAmount(String(item.amount));
    setPicName(item.picName);
    setDateLabel(item.dateLabel);
    setNote(item.note || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = editing?.id || generateId('cb');
    const data: CashbookItem = {
      id,
      title: title.trim(),
      type,
      amount: parsePositiveNumber(amount),
      picName: picName.trim() || 'Bendahara',
      dateLabel: dateLabel.trim() || todayDateLabel(),
      note: note.trim(),
      createdAtMs: editing?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'cashbook',
      itemId: id,
      itemData: data,
      docExists: moduleExists.cashbook,
      user,
    });
    setModalOpen(false);
    onToast(editing ? 'Transaksi diperbarui.' : 'Transaksi buku kas ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Dana Sponsor</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#F5C451] tabular-nums">
            {formatRupiah(totalSponsor)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Pemasukan Lain</p>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
            {formatRupiah(totalOther)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4">
          <p className="text-xs text-slate-400">Pengeluaran Umum</p>
          <p className="mt-1 font-mono text-xl font-bold text-red-400 tabular-nums">
            {formatRupiah(totalExpense)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'SPONSOR', 'PEMASUKAN_LAIN', 'PENGELUARAN'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                filter === t
                  ? 'bg-[#2563EB] text-white'
                  : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
              }`}
            >
              {t === 'ALL' ? `Semua (${entries.length})` : TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Catat Transaksi</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum Ada Catatan Buku Kas"
          description="Catat dana masuk dari sponsor, pemasukan tambahan, serta pengeluaran umum kegiatan."
          actionLabel={isEditor ? 'Catat Transaksi Pertama' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] divide-y divide-white/[0.06]">
          {filtered.map((item) => {
            const isOut = item.type === 'PENGELUARAN';
            return (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isOut
                        ? 'bg-red-500/15 text-red-400'
                        : item.type === 'SPONSOR'
                        ? 'bg-[#D4AF37]/15 text-[#F5C451]'
                        : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {isOut ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{TYPE_LABEL[item.type]}</span> ·{' '}
                      {item.dateLabel} · PIC {item.picName}
                    </p>
                    <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-slate-100">
                      {item.title}
                    </h4>
                    {item.note && <p className="mt-0.5 text-xs text-slate-400">{item.note}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                  <span
                    className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
                      isOut ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {isOut ? '-' : '+'}
                    {formatRupiah(item.amount)}
                  </span>
                  {isEditor && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteModuleItem({
                            groupId: group.id,
                            moduleId: 'cashbook',
                            itemId: item.id,
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
            );
          })}
        </div>
      )}

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Transaksi Kas' : 'Catat Transaksi Kas & Sponsor'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Jenis Transaksi</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CashbookType)}
              className={selectClass}
            >
              <option value="SPONSOR">Sponsor (Pemasukan)</option>
              <option value="PEMASUKAN_LAIN">Pemasukan Lain</option>
              <option value="PENGELUARAN">Pengeluaran Umum</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Judul / Sumber</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Sponsorship Bank Daerah / Sewa Sound"
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Nominal (Rp)</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>PIC</label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tanggal</label>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Tambahan</label>
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
              Simpan Transaksi
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
