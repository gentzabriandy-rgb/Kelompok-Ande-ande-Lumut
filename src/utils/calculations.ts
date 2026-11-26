import type { GroupDoc, ModulesState, TabId } from '../types/kaskelompok';
import { formatRupiah, todayDateLabel } from './formatters';

export interface ClassContribution {
  className: string;
  memberCount: number;
  totalPaid: number;
  targetTotal: number;
  pct: number;
}

export interface DivisionProgressItem {
  id: string;
  tab: TabId;
  title: string;
  itemCount: number;
  progressPct: number;
  statusLabel: string;
}

export interface FinancialSummary {
  totalMemberKas: number;
  totalMemberTarget: number;
  totalSponsor: number;
  totalOtherIncome: number;
  totalExpense: number;
  totalDanusRevenue: number;
  totalDanusProfit: number;
  totalDanusDeposited: number;
  totalFinesPaid: number;
  totalFinesUnpaid: number;
  totalKonsumsiCost: number;
  totalKonsumsiPaid: number;
  totalKonsumsiRemaining: number;
  totalPropertySpent: number;
  netBalance: number;
  targetAmount: number;
  targetPct: number;
  classBreakdown: ClassContribution[];
  divisionProgress: DivisionProgressItem[];
}

export function computeFinancialSummary(
  group: GroupDoc,
  modules: ModulesState
): FinancialSummary {
  const members = Object.values(modules.members);
  const cashbook = Object.values(modules.cashbook);
  const danusSales = Object.values(modules.danus_sales);
  const danusProducts = Object.values(modules.danus_products);
  const danusPosters = Object.values(modules.danus_posters);
  const fines = Object.values(modules.fines);
  const konsumsi = Object.values(modules.konsumsi);
  const dekorProps = Object.values(modules.dekor_props);
  const dekorSketches = Object.values(modules.dekor_sketches);

  const totalMemberKas = members.reduce((sum, m) => sum + (Number(m.totalPaid) || 0), 0);
  const totalMemberTarget = members.reduce((sum, m) => sum + (Number(m.targetKas) || 0), 0);

  const totalSponsor = cashbook
    .filter((c) => c.type === 'SPONSOR')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const totalOtherIncome = cashbook
    .filter((c) => c.type === 'PEMASUKAN_LAIN')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const totalExpense = cashbook
    .filter((c) => c.type === 'PENGELUARAN')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const totalDanusRevenue = danusSales.reduce(
    (sum, s) => sum + (Number(s.sellPrice) || 0) * (Number(s.qty) || 0),
    0
  );
  const totalDanusProfit = danusSales.reduce(
    (sum, s) =>
      sum + ((Number(s.sellPrice) || 0) - (Number(s.costPrice) || 0)) * (Number(s.qty) || 0),
    0
  );
  const totalDanusDeposited = danusSales
    .filter((s) => s.deposited)
    .reduce(
      (sum, s) =>
        sum + ((Number(s.sellPrice) || 0) - (Number(s.costPrice) || 0)) * (Number(s.qty) || 0),
      0
    );

  const totalFinesPaid = fines
    .filter((f) => f.paid)
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalFinesUnpaid = fines
    .filter((f) => !f.paid)
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  let totalKonsumsiCost = 0;
  let totalKonsumsiPaid = 0;
  for (const k of konsumsi) {
    const itemTotal = (Number(k.portions) || 0) * (Number(k.pricePerPortion) || 0);
    totalKonsumsiCost += itemTotal;
    if (k.status === 'LUNAS') {
      totalKonsumsiPaid += Math.max(Number(k.dpPaid) || 0, itemTotal);
    } else if (k.status === 'DP') {
      totalKonsumsiPaid += Number(k.dpPaid) || 0;
    }
  }
  const totalKonsumsiRemaining = Math.max(0, totalKonsumsiCost - totalKonsumsiPaid);

  let totalPropertySpent = 0;
  for (const p of dekorProps) {
    const itemTotal = (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
    if (p.status === 'LUNAS') {
      totalPropertySpent += Math.max(Number(p.dpAmount) || 0, itemTotal);
    } else if (p.status === 'DP') {
      totalPropertySpent += Number(p.dpAmount) || 0;
    }
  }

  const netBalance =
    totalMemberKas +
    totalSponsor +
    totalOtherIncome +
    totalDanusDeposited +
    totalFinesPaid -
    totalExpense -
    totalKonsumsiPaid -
    totalPropertySpent;

  const targetAmount = Math.max(1, Number(group.targetAmount) || 10_000_000);
  const targetPct = Math.max(0, Math.min(100, Math.round((netBalance / targetAmount) * 100)));

  // Class breakdown
  const classMap = new Map<string, { memberCount: number; totalPaid: number; targetTotal: number }>();
  for (const m of members) {
    const key = (m.className || 'Lainnya').trim() || 'Lainnya';
    const curr = classMap.get(key) || { memberCount: 0, totalPaid: 0, targetTotal: 0 };
    curr.memberCount += 1;
    curr.totalPaid += Number(m.totalPaid) || 0;
    curr.targetTotal += Number(m.targetKas) || 0;
    classMap.set(key, curr);
  }
  const classBreakdown: ClassContribution[] = Array.from(classMap.entries())
    .map(([className, stats]) => ({
      className,
      memberCount: stats.memberCount,
      totalPaid: stats.totalPaid,
      targetTotal: stats.targetTotal,
      pct:
        stats.targetTotal > 0
          ? Math.min(100, Math.round((stats.totalPaid / stats.targetTotal) * 100))
          : 0,
    }))
    .sort((a, b) => a.className.localeCompare(b.className));

  // 11-division progress calculation
  const naskahScripts = Object.values(modules.naskah_scripts);
  const naskahCast = Object.values(modules.naskah_cast);
  const koreoVideos = Object.values(modules.koreo_videos);
  const koreoBlocking = Object.values(modules.koreo_blocking);
  const lightingCues = Object.values(modules.lighting_cues);
  const lightingGear = Object.values(modules.lighting_gear);
  const pubdokMedia = Object.values(modules.pubdok_media);
  const audioCues = Object.values(modules.audio_cues);
  const stageRundown = Object.values(modules.stage_rundown);
  const stageCrew = Object.values(modules.stage_crew);
  const stageAlerts = Object.values(modules.stage_alerts);
  const perkapGear = Object.values(modules.perkap_gear);
  const perkapTransport = Object.values(modules.perkap_transport);

  const danusCount = danusProducts.length + danusSales.length + danusPosters.length;
  const danusPct =
    danusPosters.length > 0 || danusSales.length > 0
      ? Math.round(
          ((danusPosters.filter((p) => p.status === 'PUBLISHED' || p.status === 'SIAP_PUBLISH').length +
            danusSales.filter((s) => s.deposited).length) /
            Math.max(1, danusPosters.length + danusSales.length)) *
            100
        )
      : danusProducts.length > 0
      ? 25
      : 0;

  const konsumsiPct =
    konsumsi.length > 0
      ? Math.round(
          (konsumsi.filter((k) => k.status === 'LUNAS').length * 100 +
            konsumsi.filter((k) => k.status === 'DP').length * 50) /
            konsumsi.length
        )
      : 0;

  const kasCount = members.length + fines.length + cashbook.length;
  const kasPct =
    totalMemberTarget > 0
      ? Math.min(100, Math.round((totalMemberKas / totalMemberTarget) * 100))
      : targetPct;

  const naskahCount = naskahScripts.length + naskahCast.length;
  const naskahPct =
    naskahCast.length > 0
      ? Math.min(
          100,
          Math.round(
            (naskahScripts.length > 0 ? 40 : 0) +
              (naskahCast.filter((c) => c.costumeNotes || c.costumeImageUrlOrUri || c.costumeThumbnailB64)
                .length /
                naskahCast.length) *
                60
          )
        )
      : naskahScripts.length > 0
      ? 50
      : 0;

  const koreoCount = koreoVideos.length + koreoBlocking.length;
  const koreoPct =
    koreoVideos.length > 0
      ? Math.round(
          koreoVideos.reduce((s, v) => s + Math.min(100, Math.max(0, Number(v.memorizationPct) || 0)), 0) /
            koreoVideos.length
        )
      : koreoBlocking.length > 0
      ? 40
      : 0;

  const lightingCount = lightingCues.length + lightingGear.length;
  const lightingPct =
    lightingCount > 0
      ? Math.round(
          ((lightingCues.length > 0 ? 50 : 0) +
            (lightingGear.length > 0
              ? (lightingGear.filter(
                  (g) => g.status === 'MILIK' || g.status === 'PINJAM' || g.status === 'SEWA_LUNAS'
                ).length /
                  lightingGear.length) *
                50
              : 0))
        )
      : 0;

  const dekorCount = dekorProps.length + dekorSketches.length;
  const dekorPct =
    dekorProps.length > 0
      ? Math.round(
          (dekorProps.filter((p) => p.status === 'LUNAS').length * 100 +
            dekorProps.filter((p) => p.status === 'DP').length * 50) /
            dekorProps.length
        )
      : dekorSketches.length > 0
      ? 40
      : 0;

  const pubdokCount = pubdokMedia.length;
  const pubdokFinalCount = pubdokMedia.filter((m) => m.category === 'FINAL_CUT').length;
  const pubdokPct =
    pubdokCount > 0 ? Math.min(100, Math.round((pubdokFinalCount / pubdokCount) * 100)) : 0;

  const audioCount = audioCues.length;
  const audioReadyCount = audioCues.filter((a) => a.audioUrlOrUri.trim().length > 0).length;
  const audioPct = audioCount > 0 ? Math.round((audioReadyCount / audioCount) * 100) : 0;

  const stageCount = stageRundown.length + stageCrew.length + stageAlerts.length;
  const stagePct =
    stageCrew.length > 0
      ? Math.round((stageCrew.filter((c) => c.ready).length / stageCrew.length) * 100)
      : stageRundown.length > 0
      ? 40
      : 0;

  const perkapCount = perkapGear.length + perkapTransport.length;
  const perkapReady = perkapGear.filter(
    (g) => g.status === 'MILIK' || g.status === 'PINJAM' || g.status === 'SEWA_LUNAS'
  ).length;
  const perkapPct =
    perkapCount > 0
      ? Math.round(
          ((perkapReady + perkapTransport.length) / Math.max(1, perkapGear.length + perkapTransport.length)) *
            100
        )
      : 0;

  const divisionProgress: DivisionProgressItem[] = [
    {
      id: 'danus',
      tab: 'danus',
      title: 'Danus & Poster',
      itemCount: danusCount,
      progressPct: danusPct,
      statusLabel: `${danusProducts.length} produk · ${danusPosters.length} poster`,
    },
    {
      id: 'konsumsi',
      tab: 'konsumsi',
      title: 'Konsumsi',
      itemCount: konsumsi.length,
      progressPct: konsumsiPct,
      statusLabel: `${konsumsi.filter((k) => k.status === 'LUNAS').length}/${konsumsi.length} lunas`,
    },
    {
      id: 'kas',
      tab: 'kas_anggota',
      title: 'Kas & Denda',
      itemCount: kasCount,
      progressPct: kasPct,
      statusLabel: `${members.length} anggota · ${fines.length} denda`,
    },
    {
      id: 'naskah',
      tab: 'naskah',
      title: 'Naskah & Cast',
      itemCount: naskahCount,
      progressPct: naskahPct,
      statusLabel: `${naskahScripts.length} naskah · ${naskahCast.length} pemeran`,
    },
    {
      id: 'koreo',
      tab: 'koreo',
      title: 'Koreo',
      itemCount: koreoCount,
      progressPct: koreoPct,
      statusLabel: `${koreoVideos.length} video · ${koreoBlocking.length} blocking`,
    },
    {
      id: 'lighting',
      tab: 'lighting',
      title: 'Lighting',
      itemCount: lightingCount,
      progressPct: lightingPct,
      statusLabel: `${lightingCues.length} cue · ${lightingGear.length} alat`,
    },
    {
      id: 'dekor',
      tab: 'dekor',
      title: 'Dekorasi',
      itemCount: dekorCount,
      progressPct: dekorPct,
      statusLabel: `${dekorProps.length} properti · ${dekorSketches.length} sketsa`,
    },
    {
      id: 'pubdok',
      tab: 'pubdok',
      title: 'Pubdok',
      itemCount: pubdokCount,
      progressPct: pubdokPct,
      statusLabel: `${pubdokFinalCount} final · ${pubdokCount - pubdokFinalCount} raw`,
    },
    {
      id: 'audio',
      tab: 'audio',
      title: 'Musik & Audio',
      itemCount: audioCount,
      progressPct: audioPct,
      statusLabel: `${audioCount} cue audio`,
    },
    {
      id: 'stage',
      tab: 'stage_manager',
      title: 'Stage Manager',
      itemCount: stageCount,
      progressPct: stagePct,
      statusLabel: `${stageRundown.length} rundown · ${stageCrew.filter((c) => c.ready).length}/${stageCrew.length} kru siap`,
    },
    {
      id: 'perkap',
      tab: 'perkap',
      title: 'Perkap',
      itemCount: perkapCount,
      progressPct: perkapPct,
      statusLabel: `${perkapGear.length} alat · ${perkapTransport.length} transport`,
    },
  ];

  return {
    totalMemberKas,
    totalMemberTarget,
    totalSponsor,
    totalOtherIncome,
    totalExpense,
    totalDanusRevenue,
    totalDanusProfit,
    totalDanusDeposited,
    totalFinesPaid,
    totalFinesUnpaid,
    totalKonsumsiCost,
    totalKonsumsiPaid,
    totalKonsumsiRemaining,
    totalPropertySpent,
    netBalance,
    targetAmount,
    targetPct,
    classBreakdown,
    divisionProgress,
  };
}

export function buildWhatsAppReport(group: GroupDoc, summary: FinancialSummary): string {
  const lines: string[] = [
    `*LAPORAN KEUANGAN — ${group.name.toUpperCase()}*`,
    `Tanggal: ${todayDateLabel()}`,
    `Kode Grup: ${group.inviteCode}`,
    ``,
    `*SALDO KAS BERSIH: ${formatRupiah(summary.netBalance)}*`,
    `Target Dana: ${formatRupiah(summary.targetAmount)} (${summary.targetPct}%)`,
    ``,
    `*PEMASUKAN MASUK:*`,
    `• Kas Anggota: ${formatRupiah(summary.totalMemberKas)}`,
    `• Sponsor: ${formatRupiah(summary.totalSponsor)}`,
    `• Pemasukan Lain: ${formatRupiah(summary.totalOtherIncome)}`,
    `• Laba Danus Disetor: ${formatRupiah(summary.totalDanusDeposited)} (Total Laba: ${formatRupiah(summary.totalDanusProfit)})`,
    `• Denda Lunas: ${formatRupiah(summary.totalFinesPaid)}`,
    ``,
    `*PENGELUARAN TERBAYAR:*`,
    `• Pengeluaran Umum: ${formatRupiah(summary.totalExpense)}`,
    `• Konsumsi Terbayar: ${formatRupiah(summary.totalKonsumsiPaid)}`,
    `• Properti Dekor (DP/Lunas): ${formatRupiah(summary.totalPropertySpent)}`,
    ``,
    `*KEWAJIBAN / TUNGGAKAN:*`,
    `• Sisa Tagihan Konsumsi: ${formatRupiah(summary.totalKonsumsiRemaining)}`,
    `• Tunggakan Denda Latihan: ${formatRupiah(summary.totalFinesUnpaid)}`,
  ];

  if (summary.classBreakdown.length > 0) {
    lines.push(``, `*REKAP KAS PER KELAS:*`);
    for (const c of summary.classBreakdown) {
      lines.push(
        `• ${c.className} (${c.memberCount} org): ${formatRupiah(c.totalPaid)} / ${formatRupiah(c.targetTotal)} (${c.pct}%)`
      );
    }
  }

  return lines.join('\n');
}
