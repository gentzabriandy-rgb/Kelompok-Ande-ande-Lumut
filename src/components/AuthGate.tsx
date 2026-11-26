import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  ArrowRight,
  LogOut,
  Plus,
  Shield,
  Ticket,
  Users,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { createGroup, joinGroupByCode } from '../lib/groupService';
import type { GroupDoc } from '../types/kaskelompok';
import { formatRupiah, parsePositiveNumber } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';
import {
  goldBtnClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from './ui/SharedUI';

interface AuthGateProps {
  user: User | null;
  groups: GroupDoc[];
  groupsLoading: boolean;
  onSelectGroup: (groupId: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  user,
  groups,
  groupsLoading,
  onSelectGroup,
}) => {
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [portalMode, setPortalMode] = useState<'list' | 'join' | 'create'>('list');
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('10000000');
  const [newFineRate, setNewFineRate] = useState('50000');
  const [newPin, setNewPin] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan popup tidak diblokir browser.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const joinedId = await joinGroupByCode({ rawCode: inviteCode, uid: user.uid });
      setInviteCode('');
      onSelectGroup(joinedId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Gagal bergabung ke grup.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newName.trim()) {
      setCreateError('Nama grup wajib diisi.');
      return;
    }
    if (newPin.trim().length < 4) {
      setCreateError('PIN Mode Editor minimal 4 karakter.');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const createdId = await createGroup({
        name: newName,
        targetAmount: parsePositiveNumber(newTarget) || 10_000_000,
        fineRate: parsePositiveNumber(newFineRate) || 50_000,
        pin: newPin,
        user,
      });
      setNewName('');
      setNewPin('');
      onSelectGroup(createdId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat grup.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col justify-between p-5 sm:p-8">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="KasKelompok"
              className="h-9 w-9 rounded-xl border border-[#D4AF37]/30"
            />
            <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap">
              KasKelompok
            </span>
          </div>
          <PWAInstallButton />
        </header>

        <main className="mx-auto my-auto w-full max-w-5xl py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-semibold tracking-wide text-[#F5C451]">
              Sinkronisasi Real-Time Android & Web PWA
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-100 leading-[1.12] text-balance">
              Kendali Kas Kelompok &amp; Produksi Pertunjukan dalam Satu Ruang Kerja.
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-slate-400 leading-relaxed">
              Pantau saldo kas bersih, setoran per kelas, dana usaha, konsumsi, notulen rapat, hingga cue sheet lighting, audio, dekorasi, dan rundown stage manager secara langsung lintas perangkat.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 max-w-xl">
              <div className="rounded-xl border border-white/[0.08] bg-[#111520] p-3.5">
                <p className="font-mono text-lg font-bold text-[#F5C451] tabular-nums">1:1</p>
                <p className="mt-0.5 text-xs text-slate-400">Sinkron dengan Android</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#111520] p-3.5">
                <p className="font-mono text-lg font-bold text-blue-400 tabular-nums">11 Divisi</p>
                <p className="mt-0.5 text-xs text-slate-400">Keuangan &amp; Produksi</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/[0.08] bg-[#111520] p-3.5">
                <p className="font-mono text-lg font-bold text-emerald-400 tabular-nums">PIN Lock</p>
                <p className="mt-0.5 text-xs text-slate-400">Mode Viewer &amp; Editor</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-6 sm:p-8 shadow-2xl">
              <h2 className="font-display text-xl font-bold text-slate-100">
                Masuk ke KasKelompok
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Gunakan akun Google Anda untuk mengakses grup yang sudah terhubung di aplikasi Android atau membuat grup baru.
              </p>

              {authError && (
                <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                  {authError}
                </p>
              )}

              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleGoogleSignIn()}
                className={`${goldBtnClass} mt-6 w-full`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{signingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
              </button>

              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Data tersimpan di Firebase Firestore project yang sama dengan aplikasi mobile KasKelompok.
              </p>
            </div>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-5xl text-xs text-slate-500 flex items-center justify-between gap-4">
          <span>KasKelompok Web PWA</span>
          <span>Obsidian Ledger</span>
        </footer>
      </div>
    );
  }

  // Signed in: Group Portal
  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="KasKelompok"
              className="h-9 w-9 rounded-xl border border-[#D4AF37]/30"
            />
            <div>
              <h1 className="font-display text-lg font-bold text-slate-100">KasKelompok</h1>
              <p className="text-xs text-slate-400">
                {user.displayName || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className={secondaryBtnClass}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Action mode tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPortalMode('list')}
            className={`min-h-[42px] rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              portalMode === 'list'
                ? 'bg-[#2563EB] text-white'
                : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
            }`}
          >
            Grup Saya ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('join')}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              portalMode === 'join'
                ? 'bg-[#2563EB] text-white'
                : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
            }`}
          >
            <Ticket className="h-4 w-4" />
            <span>Gabung Kode Undangan</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('create')}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              portalMode === 'create'
                ? 'bg-[#D4AF37] text-[#090B10]'
                : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Buat Grup Baru</span>
          </button>
        </div>

        {portalMode === 'list' && (
          <section className="space-y-4">
            {groupsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-2xl border border-white/[0.06] bg-[#111520]"
                  />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#111520] p-8 text-center">
                <Users className="mx-auto h-9 w-9 text-[#F5C451]" />
                <h2 className="mt-3 font-display text-lg font-bold text-slate-100">
                  Belum Ada Grup Terhubung
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
                  Gabung ke grup yang sudah ada menggunakan kode undangan dari aplikasi Android, atau buat grup baru sekarang.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPortalMode('join')}
                    className={primaryBtnClass}
                  >
                    Gabung Kode Undangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortalMode('create')}
                    className={goldBtnClass}
                  >
                    Buat Grup Baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groups.map((g) => {
                  const isEditor = g.editorUids?.includes(user.uid);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelectGroup(g.id)}
                      className="group text-left rounded-2xl border border-white/[0.08] bg-[#111520] p-5 transition hover:border-[#D4AF37]/40 hover:bg-[#151A28]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-bold text-slate-100 truncate">
                            {g.name}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Kode: <span className="font-mono text-[#F5C451]">{g.inviteCode}</span> ·{' '}
                            {isEditor ? 'Mode Editor' : 'Mode Viewer'}
                          </p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300 group-hover:bg-[#2563EB] group-hover:text-white transition">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-slate-400">
                        <span>Target: <strong className="font-mono text-slate-200 tabular-nums">{formatRupiah(g.targetAmount)}</strong></span>
                        <span className="tabular-nums">{g.memberUids?.length || 1} anggota</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {portalMode === 'join' && (
          <form
            onSubmit={(e) => void handleJoinGroup(e)}
            className="rounded-2xl border border-white/[0.08] bg-[#111520] p-6 max-w-lg space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-slate-100">
                Gabung ke Grup yang Sudah Ada
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Masukkan kode undangan huruf kapital dari grup KasKelompok Android atau teman Anda.
              </p>
            </div>
            <div>
              <label htmlFor="join-code" className={labelClass}>
                Kode Undangan
              </label>
              <input
                id="join-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Contoh: KASK7X"
                className={`${inputClass} font-mono uppercase tracking-widest`}
              />
            </div>
            {joinError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {joinError}
              </p>
            )}
            <button type="submit" disabled={joinLoading} className={primaryBtnClass}>
              {joinLoading ? 'Memproses...' : 'Gabung Grup'}
            </button>
          </form>
        )}

        {portalMode === 'create' && (
          <form
            onSubmit={(e) => void handleCreateGroup(e)}
            className="rounded-2xl border border-white/[0.08] bg-[#111520] p-6 max-w-lg space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-slate-100">
                Buat Grup KasKelompok Baru
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Anda otomatis menjadi Owner &amp; Editor. Bagikan kode undangan ke anggota lain.
              </p>
            </div>
            <div>
              <label htmlFor="grp-name" className={labelClass}>
                Nama Grup / Acara
              </label>
              <input
                id="grp-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Pentas Seni Angkatan XII"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="grp-target" className={labelClass}>
                  Target Dana (Rp)
                </label>
                <input
                  id="grp-target"
                  type="number"
                  min={0}
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="grp-fine" className={labelClass}>
                  Tarif Denda Default (Rp)
                </label>
                <input
                  id="grp-fine"
                  type="number"
                  min={0}
                  value={newFineRate}
                  onChange={(e) => setNewFineRate(e.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="grp-pin" className={labelClass}>
                PIN Mode Editor (untuk Bendahara / Koordinator)
              </label>
              <div className="relative">
                <Shield className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="grp-pin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className={`${inputClass} pl-10 font-mono`}
                />
              </div>
            </div>
            {createError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {createError}
              </p>
            )}
            <button type="submit" disabled={createLoading} className={goldBtnClass}>
              {createLoading ? 'Menyiapkan Grup...' : 'Buat Grup & Mulai'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
