import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { MemberItem } from '../../types/kaskelompok';
import {
  formatDateTime,
  formatRupiah,
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
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

const PRESET_CLASSES = ['XII F1', 'XII F4', 'XII F7', 'XII F9'];

export const KasAnggotaTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onToast,
}) => {
  const members = useMemo(
    () =>
      Object.values(modules.members).sort((a, b) =>
        `${a.className}_${a.name}`.localeCompare(`${b.className}_${b.name}`)
      ),
    [modules.members]
  );

  const classes = useMemo(() => {
    const set = new Set<string>(members.map((m) => m.className).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [members]);

  const [classFilter, setClassFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (classFilter !== 'ALL' && m.className !== classFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            (m.className || '').toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [members, classFilter, search]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemberItem | null>(null);
  const [name, setName] = useState('');
  const [className, setClassName] = useState('XII F1');
  const [targetKas, setTargetKas] = useState('100000');
  const [totalPaid, setTotalPaid] = useState('0');

  const [payModalMember, setPayModalMember] = useState<MemberItem | null>(null);
  const [payAmount, setPayAmount] = useState('25000');

  const openAdd = () => {
    setEditing(null);
    setName('');
    setClassName('XII F1');
    setTargetKas('100000');
    setTotalPaid('0');
    setModalOpen(true);
  };

  const openEdit = (m: MemberItem) => {
    setEditing(m);
    setName(m.name);
    setClassName(m.className);
    setTargetKas(String(m.targetKas));
    setTotalPaid(String(m.totalPaid));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = editing?.id || generateId('mem');
    const item: MemberItem = {
      id,
      name: name.trim(),
      className: className.trim() || 'Umum',
      targetKas: parsePositiveNumber(targetKas),
      totalPaid: parsePositiveNumber(totalPaid),
      lastUpdatedMs: Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'members',
      itemId: id,
      itemData: item,
      docExists: moduleExists.members,
      user,
    });
    setModalOpen(false);
    onToast(editing ? 'Data anggota diperbarui.' : 'Anggota ditambahkan.', 'success');
  };

  const handleQuickDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalMember) return;
    const delta = parsePositiveNumber(payAmount);
    if (delta <= 0) return;
    const updated: MemberItem = {
      ...payModalMember,
      totalPaid: (payModalMember.totalPaid || 0) + delta,
      lastUpdatedMs: Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'members',
      itemId: payModalMember.id,
      itemData: updated,
      docExists: moduleExists.members,
      user,
    });
    setPayModalMember(null);
    onToast(`Setoran ${formatRupiah(delta)} untuk ${payModalMember.name} dicatat.`, 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama anggota atau kelas..."
            className={`${inputClass} pl-10`}
          />
        </div>
        {isEditor && (
          <button type="button" onClick={openAdd} className={primaryBtnClass}>
            <Plus className="h-4 w-4" />
            <span>Tambah Anggota</span>
          </button>
        )}
      </div>

      {/* Class filter buttons */}
      <div className="flex flex-wrap gap-1.5">
        {classes.map((cls) => (
          <button
            key={cls}
            type="button"
            onClick={() => setClassFilter(cls)}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
              classFilter === cls
                ? 'bg-[#D4AF37] text-[#090B10]'
                : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
            }`}
          >
            {cls === 'ALL' ? `Semua (${members.length})` : cls}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak Ada Anggota Ditemukan"
          description="Tambahkan daftar anggota beserta kelas dan target iuran kas masing-masing."
          actionLabel={isEditor ? 'Tambah Anggota' : undefined}
          onAction={isEditor ? openAdd : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((m) => {
              const pct =
                m.targetKas > 0
                  ? Math.min(100, Math.round(((m.totalPaid || 0) / m.targetKas) * 100))
                  : 100;
              const lunas = m.targetKas > 0 && (m.totalPaid || 0) >= m.targetKas;
              return (
                <div
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#F5C451]">{m.className}</span>
                      <span className="text-slate-500">·</span>
                      <span className={lunas ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                        {lunas ? 'Lunas' : `${pct}% tercapai`}
                      </span>
                      <span className="text-slate-500 hidden sm:inline">·</span>
                      <span className="text-slate-500 hidden sm:inline">
                        {formatDateTime(m.lastUpdatedMs)}
                      </span>
                    </div>
                    <h4 className="mt-0.5 font-display text-sm sm:text-base font-bold text-slate-100 truncate">
                      {m.name}
                    </h4>
                    <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full ${lunas ? 'bg-emerald-500' : 'bg-[#2563EB]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right font-mono tabular-nums">
                      <p className="text-sm font-bold text-slate-100">
                        {formatRupiah(m.totalPaid)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        dari {formatRupiah(m.targetKas)}
                      </p>
                    </div>

                    {isEditor && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPayModalMember(m);
                            setPayAmount('25000');
                          }}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#F5C451] hover:bg-[#D4AF37]/20"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          <span>Setor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
                          aria-label="Edit anggota"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'members',
                              itemId: m.id,
                              user,
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                          aria-label="Hapus anggota"
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
        </div>
      )}

      {/* Add/Edit Modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Data Anggota' : 'Tambah Anggota Kas'}
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Nadira Putri"
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
              placeholder="XII F1 / Custom"
              className={inputClass}
              required
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_CLASSES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassName(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
                    className === c
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5C451]'
                      : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Target Kas (Rp)</label>
              <input
                type="number"
                min={0}
                value={targetKas}
                onChange={(e) => setTargetKas(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Sudah Dibayar (Rp)</label>
              <input
                type="number"
                min={0}
                value={totalPaid}
                onChange={(e) => setTotalPaid(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Anggota
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Quick Deposit Modal */}
      <ModalShell
        open={!!payModalMember}
        onClose={() => setPayModalMember(null)}
        title="Input Setoran Kas Cepat"
        subtitle={payModalMember ? `${payModalMember.name} · ${payModalMember.className}` : ''}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={(e) => void handleQuickDeposit(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Nominal Setoran Masuk (Rp)</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={`${inputClass} font-mono text-base`}
              required
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[10000, 20000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPayAmount(String(amt))}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-white/10"
                >
                  +{formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPayModalMember(null)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={goldBtnClass}>
              Catat Setoran
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
