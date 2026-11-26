import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Clapperboard,
  Copy,
  FileText,
  Film,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Menu,
  Music2,
  Package,
  Palette,
  ShoppingBag,
  Sparkles,
  Unlock,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LightboxModal } from './components/LightboxModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PinModal } from './components/PinModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { StageAlertBanner } from './components/StageAlertBanner';
import { AudioTab } from './components/tabs/AudioTab';
import { BukuKasTab } from './components/tabs/BukuKasTab';
import { DanusTab } from './components/tabs/DanusTab';
import { DekorTab } from './components/tabs/DekorTab';
import { DendaTab } from './components/tabs/DendaTab';
import { KasAnggotaTab } from './components/tabs/KasAnggotaTab';
import { KonsumsiTab } from './components/tabs/KonsumsiTab';
import { KoreoTab } from './components/tabs/KoreoTab';
import { LightingTab } from './components/tabs/LightingTab';
import { NaskahTab } from './components/tabs/NaskahTab';
import { NotulenTab } from './components/tabs/NotulenTab';
import { PerkapTab } from './components/tabs/PerkapTab';
import { PubdokTab } from './components/tabs/PubdokTab';
import { RingkasanTab } from './components/tabs/RingkasanTab';
import { StageManagerTab } from './components/tabs/StageManagerTab';
import { useGroupModules } from './hooks/useGroupModules';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { upsertModuleItem } from './lib/groupService';
import type { GroupDoc, PresenceItem, StageAlert, TabId } from './types/kaskelompok';
import { SafeImage } from './components/ui/SharedUI';

interface NavItem {
  id: TabId;
  label: string;
  shortLabel: string;
  group: 'finance' | 'production';
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkas', group: 'finance', icon: LayoutDashboard },
  { id: 'danus', label: 'Danus & Poster', shortLabel: 'Danus', group: 'finance', icon: ShoppingBag },
  { id: 'konsumsi', label: 'Konsumsi', shortLabel: 'Konsumsi', group: 'finance', icon: Utensils },
  { id: 'kas_anggota', label: 'Kas Anggota', shortLabel: 'Kas', group: 'finance', icon: Wallet },
  { id: 'denda', label: 'Denda Latihan', shortLabel: 'Denda', group: 'finance', icon: AlertTriangle },
  { id: 'buku_kas', label: 'Buku Kas & Sponsor', shortLabel: 'Buku Kas', group: 'finance', icon: BookOpen },
  { id: 'notulen', label: 'Notulen & Versi', shortLabel: 'Notulen', group: 'finance', icon: FileText },
  { id: 'naskah', label: 'Naskah & Cast', shortLabel: 'Naskah', group: 'production', icon: Sparkles },
  { id: 'koreo', label: 'Koreo & Tari', shortLabel: 'Koreo', group: 'production', icon: Film },
  { id: 'lighting', label: 'Penata Lampu', shortLabel: 'Lampu', group: 'production', icon: Lightbulb },
  { id: 'dekor', label: 'Dekorasi & Properti', shortLabel: 'Dekor', group: 'production', icon: Palette },
  { id: 'pubdok', label: 'Pubdok', shortLabel: 'Pubdok', group: 'production', icon: Camera },
  { id: 'audio', label: 'Musik & Audio', shortLabel: 'Audio', group: 'production', icon: Music2 },
  { id: 'stage_manager', label: 'Stage Manager', shortLabel: 'Stage', group: 'production', icon: Clapperboard },
  { id: 'perkap', label: 'Perkap & Transport', shortLabel: 'Perkap', group: 'production', icon: Package },
];

const ACTIVE_GROUP_STORAGE_KEY = 'kaskelompok_active_group_id';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [presencePopoverOpen, setPresencePopoverOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [viewerPreview, setViewerPreview] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [lightbox, setLightbox] = useState<{
    src: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: 'info' | 'success' | 'error';
  } | null>(null);

  const [liveAlert, setLiveAlert] = useState<StageAlert | null>(null);

  const showToast = useCallback(
    (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 3400);
    },
    []
  );

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Groups listener (mandatory where("memberUids", "array-contains", uid))
  useEffect(() => {
    if (!user) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }
    setGroupsLoading(true);
    const q = query(
      collection(db, 'groups'),
      where('memberUids', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: GroupDoc[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || 'Grup Tanpa Nama'),
            inviteCode: String(data.inviteCode || ''),
            ownerId: String(data.ownerId || ''),
            memberUids: Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [],
            editorUids: Array.isArray(data.editorUids) ? (data.editorUids as string[]) : [],
            targetAmount: Number(data.targetAmount) || 10_000_000,
            fineRate: Number(data.fineRate) || 50_000,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setGroups(list);
        setGroupsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'groups');
      }
    );
    return () => unsub();
  }, [user]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  // Handle selecting / clearing group
  const handleSelectGroup = useCallback((groupId: string | null) => {
    setSelectedGroupId(groupId);
    setViewerPreview(false);
    setActiveTab('ringkasan');
    try {
      if (groupId) localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
      else localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
    } catch {
      // ignore storage failure
    }
  }, []);

  const handleNewStageAlert = useCallback((alert: StageAlert) => {
    setLiveAlert(alert);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`Panggilan Stage · ${alert.sceneLabel || 'Produksi'}`, {
          body: `${alert.title}${alert.message ? ` — ${alert.message}` : ''}`,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // ignore Safari notification errors in non-supported contexts
      }
    }
  }, []);

  const { modules, moduleExists, loading: modulesLoading } = useGroupModules(
    activeGroup?.id || null,
    user?.uid || null,
    handleNewStageAlert
  );

  const hasEditorAccess = Boolean(
    activeGroup && user && activeGroup.editorUids?.includes(user.uid)
  );
  const isEditor = hasEditorAccess && !viewerPreview;

  // Online presence heartbeat
  useEffect(() => {
    if (!activeGroup || !user) return;
    const activeNav = NAV_ITEMS.find((n) => n.id === activeTab);
    const sendHeartbeat = () => {
      const item: PresenceItem = {
        uid: user.uid,
        name: user.displayName?.trim() || user.email?.split('@')[0] || 'Anggota',
        photoUrl: user.photoURL || '',
        tab: activeNav?.label || activeTab,
        role: isEditor ? 'EDITOR' : 'VIEWER',
        lastSeenMs: Date.now(),
      };
      void upsertModuleItem({
        groupId: activeGroup.id,
        moduleId: 'presence',
        itemId: user.uid,
        itemData: item,
        docExists: moduleExists.presence,
        user,
        silentOnError: true,
      });
    };

    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 25_000);
    return () => window.clearInterval(timer);
  }, [activeGroup, user, activeTab, isEditor, moduleExists.presence]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const onlineUsers = useMemo(() => {
    return Object.values(modules.presence)
      .filter((p) => nowMs - (p.lastSeenMs || 0) < 95_000)
      .sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
  }, [modules.presence, nowMs]);

  const handleCopyInvite = async () => {
    if (!activeGroup?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(activeGroup.inviteCode);
      setCopiedInvite(true);
      showToast(`Kode undangan ${activeGroup.inviteCode} disalin.`, 'success');
      window.setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      showToast('Gagal menyalin kode undangan.', 'error');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/icon.svg" alt="KasKelompok" className="h-12 w-12 rounded-2xl animate-pulse" />
          <p className="text-xs text-slate-400">Menghubungkan KasKelompok...</p>
        </div>
      </div>
    );
  }

  if (!user || !activeGroup) {
    return (
      <ErrorBoundary>
        <AuthGate
          user={user}
          groups={groups}
          groupsLoading={groupsLoading}
          onSelectGroup={(id) => handleSelectGroup(id)}
        />
        <OfflineIndicator />
      </ErrorBoundary>
    );
  }

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const tabProps = {
    group: activeGroup,
    modules,
    moduleExists,
    user,
    isEditor,
    onOpenTab: (t: TabId) => {
      setActiveTab(t);
      setMobileMenuOpen(false);
    },
    onOpenLightbox: (src: string, title?: string, subtitle?: string) =>
      setLightbox({ src, title, subtitle }),
    onToast: showToast,
    onRequestEditorPin: () => setPinModalOpen(true),
  };

  const renderTabContent = () => {
    if (modulesLoading) {
      return (
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-2xl border border-white/[0.06] bg-[#111520]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-[#111520]"
              />
            ))}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'ringkasan':
        return <RingkasanTab {...tabProps} />;
      case 'danus':
        return <DanusTab {...tabProps} />;
      case 'konsumsi':
        return <KonsumsiTab {...tabProps} />;
      case 'kas_anggota':
        return <KasAnggotaTab {...tabProps} />;
      case 'denda':
        return <DendaTab {...tabProps} />;
      case 'buku_kas':
        return <BukuKasTab {...tabProps} />;
      case 'notulen':
        return <NotulenTab {...tabProps} />;
      case 'naskah':
        return <NaskahTab {...tabProps} />;
      case 'koreo':
        return <KoreoTab {...tabProps} />;
      case 'lighting':
        return <LightingTab {...tabProps} />;
      case 'dekor':
        return <DekorTab {...tabProps} />;
      case 'pubdok':
        return <PubdokTab {...tabProps} />;
      case 'audio':
        return <AudioTab {...tabProps} />;
      case 'stage_manager':
        return <StageManagerTab {...tabProps} />;
      case 'perkap':
        return <PerkapTab {...tabProps} />;
      default:
        return <RingkasanTab {...tabProps} />;
    }
  };

  const financeNav = NAV_ITEMS.filter((n) => n.group === 'finance');
  const productionNav = NAV_ITEMS.filter((n) => n.group === 'production');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#090B10] text-slate-100 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col lg:border-r lg:border-white/[0.08] lg:bg-[#0B0E15] lg:sticky lg:top-0 lg:h-screen">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <img
                src="/icon.svg"
                alt="KasKelompok"
                className="h-8 w-8 rounded-lg border border-[#D4AF37]/30 shrink-0"
              />
              <span className="font-display text-base font-bold tracking-tight text-slate-100 truncate">
                KasKelompok
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#111520] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {activeGroup.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-100"
                  title="Ganti grup"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-[#F5C451]">{activeGroup.inviteCode}</span>
                <button
                  type="button"
                  onClick={() => void handleCopyInvite()}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
                >
                  {copiedInvite ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-500">
                Keuangan &amp; Notulen
              </p>
              <div className="space-y-0.5">
                {financeNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                        active
                          ? 'bg-[#2563EB]/15 text-blue-300 font-semibold'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-500">
                Divisi Produksi
              </p>
              <div className="space-y-0.5">
                {productionNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                        active
                          ? 'bg-[#D4AF37]/15 text-[#F5C451] font-semibold'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#F5C451]' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <SafeImage
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#2563EB]/20 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-red-300"
              title="Keluar akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Bar (Compact 56px) */}
          <header className="sticky top-0 z-30 h-14 border-b border-white/[0.08] bg-[#090B10]/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#111520] text-slate-200"
                aria-label="Buka menu navigasi"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-sm sm:text-base font-bold text-slate-100 truncate">
                  {activeNavItem.label}
                </h1>
                <p className="lg:hidden text-[11px] text-slate-400 truncate">
                  {activeGroup.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Online presence trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPresencePopoverOpen((v) => !v)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#111520] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] whitespace-nowrap"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono tabular-nums">{onlineUsers.length}</span>
                  <span className="hidden sm:inline text-slate-400">Online</span>
                </button>

                {presencePopoverOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setPresencePopoverOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 z-40 rounded-2xl border border-white/10 bg-[#111520] p-4 shadow-2xl">
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                        <h4 className="font-display text-xs font-bold text-slate-200">
                          Anggota Online ({onlineUsers.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => setPresencePopoverOpen(false)}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2.5 max-h-60 overflow-y-auto space-y-2.5">
                        {onlineUsers.length === 0 ? (
                          <p className="text-xs text-slate-500">Hanya Anda saat ini.</p>
                        ) : (
                          onlineUsers.map((p) => (
                            <div key={p.uid} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p.photoUrl ? (
                                  <img
                                    src={p.photoUrl}
                                    alt={p.name}
                                    referrerPolicy="no-referrer"
                                    className="h-6 w-6 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-[#2563EB]/25 flex items-center justify-center text-[10px] font-bold text-blue-300 shrink-0">
                                    {(p.name || 'U')[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-200 truncate">
                                    {p.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    Di {p.tab}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-semibold shrink-0 ${
                                  p.role === 'EDITOR' ? 'text-[#F5C451]' : 'text-slate-400'
                                }`}
                              >
                                {p.role}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden sm:block">
                <PWAInstallButton compact />
              </div>

              {/* Editor / Viewer Control */}
              {hasEditorAccess ? (
                <button
                  type="button"
                  onClick={() => {
                    setViewerPreview((v) => !v);
                    showToast(
                      !viewerPreview
                        ? 'Pratinjau Mode Viewer aktif.'
                        : 'Mode Editor aktif kembali.',
                      'info'
                    );
                  }}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    isEditor
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#F5C451] hover:bg-[#D4AF37]/25'
                      : 'border-white/10 bg-[#111520] text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isEditor ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  <span>{isEditor ? 'Mode Editor' : 'Mode Viewer'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPinModalOpen(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1.5 text-xs font-semibold text-[#F5C451] transition hover:bg-[#D4AF37]/25 whitespace-nowrap"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Buka Mode Editor</span>
                  <span className="sm:hidden">PIN Editor</span>
                </button>
              )}
            </div>
          </header>

          {/* Main Workspace */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
            {renderTabContent()}
          </main>
        </div>

        {/* Mobile Bottom Thumb Navigation (<= 15% combined sticky height with top bar) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#0B0E15]/95 backdrop-blur-md pb-safe">
          <div className="grid grid-cols-5 h-14 items-center">
            {(
              [
                ['ringkasan', 'Ringkas', LayoutDashboard],
                ['danus', 'Danus', ShoppingBag],
                ['kas_anggota', 'Kas', Wallet],
                ['stage_manager', 'Stage', BellRing],
              ] as const
            ).map(([id, label, Icon]) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center h-full transition ${
                    active ? 'text-[#F5C451]' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-0.5 text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center h-full transition ${
                mobileMenuOpen ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <Menu className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium">Divisi</span>
            </button>
          </div>
        </nav>

        {/* Mobile Full Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-[86%] max-w-xs h-full bg-[#0B0E15] border-r border-white/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src="/icon.svg" alt="KasKelompok" className="h-8 w-8 rounded-lg" />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-slate-100 truncate">
                      {activeGroup.name}
                    </p>
                    <p className="font-mono text-[11px] text-[#F5C451]">
                      Kode: {activeGroup.inviteCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSelectGroup(null);
                    }}
                    className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#111520] px-3 text-xs font-semibold text-slate-200"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>Ganti Grup</span>
                  </button>
                  <PWAInstallButton compact />
                </div>

                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-slate-500">
                    Keuangan &amp; Notulen
                  </p>
                  <div className="space-y-1">
                    {financeNav.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${
                            active
                              ? 'bg-[#2563EB]/20 text-blue-300 font-semibold'
                              : 'text-slate-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-40" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold text-slate-500">
                    Divisi Produksi
                  </p>
                  <div className="space-y-1">
                    {productionNav.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full min-h-[44px] flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${
                            active
                              ? 'bg-[#D4AF37]/20 text-[#F5C451] font-semibold'
                              : 'text-slate-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-40" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate pr-2">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut(auth)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals & Overlays */}
        <PinModal
          open={pinModalOpen}
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          uid={user.uid}
          onClose={() => setPinModalOpen(false)}
          onUnlocked={() => {
            setViewerPreview(false);
            showToast('Mode Editor berhasil diaktifkan!', 'success');
          }}
        />

        <LightboxModal
          src={lightbox?.src || null}
          title={lightbox?.title}
          subtitle={lightbox?.subtitle}
          onClose={() => setLightbox(null)}
        />

        <StageAlertBanner
          alert={liveAlert}
          onDismiss={() => setLiveAlert(null)}
          onOpenStageTab={() => setActiveTab('stage_manager')}
        />

        <OfflineIndicator />

        {toast && (
          <div
            className={`fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium shadow-2xl backdrop-blur-md ${
              toast.tone === 'success'
                ? 'border-emerald-500/35 bg-emerald-950/90 text-emerald-200'
                : toast.tone === 'error'
                ? 'border-red-500/35 bg-red-950/90 text-red-200'
                : 'border-white/15 bg-[#111520]/95 text-slate-200'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
