import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Copy,
  MessageSquarePlus,
  Settings2,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import {
  clearModuleItems,
  deleteModuleItem,
  updateGroupSettings,
  upsertModuleItem,
} from '../../lib/groupService';
import type { SuggestionItem } from '../../types/kaskelompok';
import { buildWhatsAppReport, computeFinancialSummary } from '../../utils/calculations';
import {
  formatDateTime,
  formatRupiah,
  generateId,
  parsePositiveNumber,
} from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  goldBtnClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

export const RingkasanTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenTab,
  onToast,
}) => {
  const summary = useMemo(
    () => computeFinancialSummary(group, modules),
    [group, modules]
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetInput, setTargetInput] = useState(String(group.targetAmount || 10000000));
  const [fineRateInput, setFineRateInput] = useState(String(group.fineRate || 50000));
  const [groupNameInput, setGroupNameInput] = useState(group.name);
  const [savingSettings, setSavingSettings] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const suggestions = useMemo(
    () =>
      Object.values(modules.suggestions).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.suggestions]
  );

  const handleCopyWA = async () => {
    const text = buildWhatsAppReport(group, summary);
    try {
      await navigator.clipboard.writeText(text);
      onToast('Laporan WA berhasil disalin ke clipboard.', 'success');
    } catch {
      onToast('Gagal menyalin otomatis. Silakan coba lagi.', 'error');
    }
  };

  const handleOpenSettings = () => {
    setGroupNameInput(group.name);
    setTargetInput(String(group.targetAmount || 10000000));
    setFineRateInput(String(group.fineRate || 50000));
    setSettingsOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateGroupSettings({
        groupId: group.id,
        name: groupNameInput,
        targetAmount: parsePositiveNumber(targetInput),
        fineRate: parsePositiveNumber(fineRateInput),
      });
      setSettingsOpen(false);
      onToast('Target dana & tarif denda berhasil diperbarui.', 'success');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const id = generateId('sug');
      const item: SuggestionItem = {
        id,
        authorUid: user.uid,
        authorName: user.displayName?.trim() || user.email?.split('@')[0] || 'Anggota',
        authorPhotoUrl: user.photoURL || '',
        text,
        resolved: false,
        createdAtMs: Date.now(),
      };
      await upsertModuleItem({
        groupId: group.id,
        moduleId: 'suggestions',
        itemId: id,
        itemData: item,
        docExists: moduleExists.suggestions,
        user,
      });
      setCommentText('');
      onToast('Komentar terkirim.', 'success');
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleResolved = async (item: SuggestionItem) => {
    if (!isEditor) return;
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'suggestions',
      itemId: item.id,
      itemData: { ...item, resolved: !item.resolved },
      docExists: moduleExists.suggestions,
      user,
    });
  };

  const handleDeleteSuggestion = async (item: SuggestionItem) => {
    if (!isEditor && item.authorUid !== user.uid) return;
    await deleteModuleItem({
      groupId: group.id,
      moduleId: 'suggestions',
      itemId: item.id,
      user,
    });
    onToast('Komentar dihapus.', 'info');
  };

  const handleClearAllSuggestions = async () => {
    if (!isEditor || suggestions.length === 0) return;
    await clearModuleItems({
      groupId: group.id,
      moduleId: 'suggestions',
      docExists: moduleExists.suggestions,
      user,
    });
    onToast('Semua komentar dibersihkan.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Hero KPI Card */}
      <section className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#141927] via-[#111520] to-[#0D111A] p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-[#F5C451]">
              Saldo Kas Bersih · Kode Grup {group.inviteCode}
            </p>
            <h2 className="mt-1.5 font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-50 tabular-nums">
              {formatRupiah(summary.netBalance)}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Pemasukan <span className="font-mono text-emerald-400 tabular-nums">{formatRupiah(summary.totalMemberKas + summary.totalSponsor + summary.totalOtherIncome + summary.totalDanusDeposited + summary.totalFinesPaid)}</span>
              {' · '}
              Pengeluaran <span className="font-mono text-red-400 tabular-nums">{formatRupiah(summary.totalExpense + summary.totalKonsumsiPaid + summary.totalPropertySpent)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => void handleCopyWA()} className={goldBtnClass}>
              <Copy className="h-4 w-4" />
              <span>Salin Laporan WA</span>
            </button>
            {isEditor && (
              <button type="button" onClick={handleOpenSettings} className={secondaryBtnClass}>
                <Settings2 className="h-4 w-4" />
                <span>Atur Target &amp; Denda</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Progress */}
        <div className="mt-6 pt-5 border-t border-white/[0.07]">
          <div className="flex items-center justify-between gap-4 text-xs sm:text-sm mb-2">
            <span className="text-slate-300 font-medium">
              Progres Target Dana ({formatRupiah(summary.targetAmount)})
            </span>
            <span className="font-mono font-bold text-[#F5C451] tabular-nums">
              {summary.targetPct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#D4AF37] transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, summary.targetPct))}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Total Sponsor</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-100 tabular-nums">
            {formatRupiah(summary.totalSponsor)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pemasukan Lain: <span className="font-mono tabular-nums text-slate-300">{formatRupiah(summary.totalOtherIncome)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Laba Danus (Disetor / Total)</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold text-[#F5C451] tabular-nums">
            {formatRupiah(summary.totalDanusDeposited)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total Laba: <span className="font-mono tabular-nums text-slate-300">{formatRupiah(summary.totalDanusProfit)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Denda Latihan (Lunas / Tunggakan)</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
            {formatRupiah(summary.totalFinesPaid)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tunggakan: <span className="font-mono tabular-nums text-red-400">{formatRupiah(summary.totalFinesUnpaid)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 sm:p-5">
          <p className="text-xs text-slate-400">Sisa Tagihan Konsumsi</p>
          <p className="mt-2 font-mono text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">
            {formatRupiah(summary.totalKonsumsiRemaining)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Terbayar: <span className="font-mono tabular-nums text-slate-300">{formatRupiah(summary.totalKonsumsiPaid)}</span>
          </p>
        </div>
      </section>

      {/* Rekap Kontribusi Per Kelas */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
              Grafik &amp; Rekap Kontribusi Per Kelas
            </h3>
            <p className="text-xs text-slate-400">
              Otomatis dihitung dari data Kas Anggota (XII F1, XII F4, XII F7, XII F9 &amp; kelas lain)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenTab('kas_anggota')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            Kelola Kas Anggota →
          </button>
        </div>

        {summary.classBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Belum ada data anggota. Tambahkan anggota di tab Kas Anggota untuk melihat rekap per kelas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.classBreakdown.map((cls) => (
              <div
                key={cls.className}
                className="rounded-xl border border-white/[0.06] bg-[#0B0E16] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-display text-sm font-bold text-slate-100">
                      {cls.className}
                    </span>
                    <span className="ml-2 text-xs text-slate-400 tabular-nums">
                      · {cls.memberCount} anggota
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#F5C451] tabular-nums">
                    {cls.pct}%
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#D4AF37]"
                    style={{ width: `${cls.pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                  <span>Terkumpul: {formatRupiah(cls.totalPaid)}</span>
                  <span>Target: {formatRupiah(cls.targetTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progres Semua Divisi (11 Divisi) */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
            Progres Semua Divisi
          </h3>
          <p className="text-xs text-slate-400">
            Ketuk kartu divisi untuk langsung membuka halaman koordinasinya.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {summary.divisionProgress.map((div) => (
            <button
              key={div.id}
              type="button"
              onClick={() => onOpenTab(div.tab)}
              className="group text-left rounded-xl border border-white/[0.07] bg-[#0B0E16] p-4 transition hover:border-[#2563EB]/50 hover:bg-[#101522]"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-semibold text-slate-100 group-hover:text-blue-300 transition truncate">
                  {div.title}
                </h4>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs font-bold text-[#F5C451] tabular-nums">
                    {div.progressPct}%
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400" />
                </div>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                  style={{ width: `${div.progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 truncate tabular-nums">
                {div.itemCount} item · {div.statusLabel}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Komentar & Saran */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
              Komentar &amp; Saran Anggota
            </h3>
            <p className="text-xs text-slate-400">
              Viewer dan Editor dapat mengirim masukan. Viewer hanya dapat menghapus komentarnya sendiri.
            </p>
          </div>
          {isEditor && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearAllSuggestions()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>

        <form onSubmit={(e) => void handleAddSuggestion(e)} className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Tulis saran, catatan rapat, atau masukan untuk tim..."
            className={inputClass}
          />
          <button
            type="submit"
            disabled={postingComment || !commentText.trim()}
            className={primaryBtnClass}
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{postingComment ? 'Mengirim...' : 'Kirim Saran'}</span>
          </button>
        </form>

        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">Belum ada komentar atau saran.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {suggestions.map((item) => {
              const canDelete = isEditor || item.authorUid === user.uid;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-200">{item.authorName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{formatDateTime(item.createdAtMs)}</span>
                      {item.resolved && (
                        <>
                          <span className="text-slate-500">·</span>
                          <span className="font-medium text-emerald-400">Selesai</span>
                        </>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-sm leading-relaxed ${
                        item.resolved ? 'text-slate-400 line-through' : 'text-slate-200'
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditor && (
                      <button
                        type="button"
                        onClick={() => void handleToggleResolved(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                        title={item.resolved ? 'Tandai belum selesai' : 'Tandai selesai'}
                      >
                        {item.resolved ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSuggestion(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-red-400 hover:bg-red-500/15"
                        title="Hapus komentar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Settings Modal */}
      <ModalShell
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Pengaturan Target & Tarif Denda"
        subtitle="Perubahan disinkronkan real-time ke seluruh anggota grup."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={(e) => void handleSaveSettings(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Grup</label>
            <input
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Target Dana Keseluruhan (Rp)</label>
            <input
              type="number"
              min={0}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Tarif Denda Latihan Default (Rp)</label>
            <input
              type="number"
              min={0}
              value={fineRateInput}
              onChange={(e) => setFineRateInput(e.target.value)}
              className={`${inputClass} font-mono tabular-nums`}
              required
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className={secondaryBtnClass}
            >
              Batal
            </button>
            <button type="submit" disabled={savingSettings} className={goldBtnClass}>
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
