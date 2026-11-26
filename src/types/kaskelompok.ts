export const FINANCE_MODULES = [
  'danus_products',
  'danus_sales',
  'danus_posters',
  'konsumsi',
  'members',
  'fines',
  'cashbook',
  'versions',
  'suggestions',
  'presence',
  'collab_doc',
] as const;

export const PRODUCTION_MODULES = [
  'naskah_scripts',
  'naskah_cast',
  'koreo_videos',
  'koreo_blocking',
  'lighting_cues',
  'lighting_gear',
  'dekor_props',
  'dekor_sketches',
  'pubdok_media',
  'audio_cues',
  'stage_rundown',
  'stage_crew',
  'perkap_gear',
  'perkap_transport',
  'stage_alerts',
] as const;

export const ALL_MODULE_IDS = [...FINANCE_MODULES, ...PRODUCTION_MODULES] as const;
export type ModuleId = (typeof ALL_MODULE_IDS)[number];

export type TabId =
  | 'ringkasan'
  | 'danus'
  | 'konsumsi'
  | 'kas_anggota'
  | 'denda'
  | 'buku_kas'
  | 'notulen'
  | 'naskah'
  | 'koreo'
  | 'lighting'
  | 'dekor'
  | 'pubdok'
  | 'audio'
  | 'stage_manager'
  | 'perkap';

export interface GroupDoc {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberUids: string[];
  editorUids: string[];
  targetAmount: number;
  fineRate: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DanusProduct {
  id: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
}

export interface DanusSale {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  costPrice: number;
  sellPrice: number;
  sellerName: string;
  deposited: boolean;
  createdAtMs: number;
}

export type PosterStatus = 'DRAFT' | 'REVISI' | 'SIAP_PUBLISH' | 'PUBLISHED';

export interface DanusPoster {
  id: string;
  title: string;
  divisionLabel: string;
  status: PosterStatus;
  imageUrlOrUri: string;
  thumbnailB64?: string;
  note: string;
  uploadedByName: string;
  createdAtMs: number;
}

export type KonsumsiStatus = 'BELUM_DP' | 'DP' | 'LUNAS';

export interface KonsumsiItem {
  id: string;
  title: string;
  vendor: string;
  portions: number;
  pricePerPortion: number;
  dpPaid: number;
  status: KonsumsiStatus;
  note: string;
}

export interface MemberItem {
  id: string;
  name: string;
  className: string;
  targetKas: number;
  totalPaid: number;
  lastUpdatedMs: number;
}

export interface FineItem {
  id: string;
  memberName: string;
  className: string;
  dateLabel: string;
  reason: string;
  amount: number;
  paid: boolean;
  createdAtMs: number;
}

export type CashbookType = 'SPONSOR' | 'PEMASUKAN_LAIN' | 'PENGELUARAN';

export interface CashbookItem {
  id: string;
  title: string;
  type: CashbookType;
  amount: number;
  picName: string;
  note: string;
  dateLabel: string;
  createdAtMs: number;
}

export type DocAlign = 'LEFT' | 'CENTER' | 'RIGHT';

export interface CollabDocData {
  docTitle: string;
  docContent: string;
  docAlign: DocAlign;
  docLinkUrl: string;
  docImageUrl: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface VersionSnapshot {
  id: string;
  label: string;
  authorName: string;
  createdAtMs: number;
  netBalance: number;
  docTitle: string;
  docContent: string;
  docAlign: DocAlign;
  summaryText: string;
}

export interface SuggestionItem {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string;
  text: string;
  resolved: boolean;
  createdAtMs: number;
}

export interface PresenceItem {
  uid: string;
  name: string;
  photoUrl: string;
  tab: string;
  role: 'EDITOR' | 'VIEWER';
  lastSeenMs: number;
}

export interface NaskahScript {
  id: string;
  title: string;
  versionLabel: string;
  fileType: string;
  urlOrUri: string;
  sceneNotes: string;
  updatedByName: string;
  createdAtMs: number;
}

export interface NaskahCast {
  id: string;
  characterName: string;
  actorName: string;
  className: string;
  sceneList: string;
  costumeNotes: string;
  costumeImageUrlOrUri: string;
  costumeThumbnailB64?: string;
}

export interface KoreoVideo {
  id: string;
  sceneLabel: string;
  title: string;
  urlOrUri: string;
  tempoNotes: string;
  memorizationPct: number;
  picName: string;
  createdAtMs: number;
}

export interface KoreoBlocking {
  id: string;
  sceneLabel: string;
  title: string;
  imageUrlOrUri: string;
  entranceNotes: string;
  exitNotes: string;
  createdAtMs: number;
}

export interface LightingCue {
  id: string;
  sceneLabel: string;
  cueNumber: string;
  gelColor: string;
  dimmerPct: number;
  effectType: string;
  timestampLabel: string;
  note: string;
}

export type LightingGearStatus =
  | 'MILIK'
  | 'PINJAM'
  | 'SEWA_BELUM_BAYAR'
  | 'SEWA_DP'
  | 'SEWA_LUNAS';

export interface LightingGear {
  id: string;
  equipmentName: string;
  qty: number;
  sourceOrVendor: string;
  status: LightingGearStatus;
  cost: number;
  note: string;
}

export type DekorPropStatus = 'BELUM_BELI' | 'DP' | 'LUNAS';

export interface DekorProp {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  dpAmount: number;
  status: DekorPropStatus;
  storeUrl: string;
  note: string;
  createdAtMs: number;
}

export interface DekorSketch {
  id: string;
  title: string;
  imageUrlOrUri: string;
  sizeAndPositionNotes: string;
  createdAtMs: number;
}

export type PubdokCategory = 'RAW_FOOTAGE' | 'FINAL_CUT';

export interface PubdokMedia {
  id: string;
  category: PubdokCategory;
  title: string;
  mediaUrlOrUri: string;
  sourcePlatform: string;
  sceneOrDate: string;
  durationLabel: string;
  editorName: string;
  createdAtMs: number;
}

export interface AudioCue {
  id: string;
  sceneLabel: string;
  cueTitle: string;
  audioUrlOrUri: string;
  entryTimestampSec: number;
  audioGearNeeds: string;
  isSfx: boolean;
  note: string;
}

export interface StageRundown {
  id: string;
  timeLabel: string;
  durationLabel: string;
  sceneLabel: string;
  propCueNotes: string;
  lightingAudioNotes: string;
  orderIndex: number;
}

export interface StageCrew {
  id: string;
  roleOrTask: string;
  picName: string;
  ready: boolean;
  note: string;
}

export interface StageAlert {
  id: string;
  title: string;
  message: string;
  sceneLabel: string;
  senderName: string;
  createdAtMs: number;
}

export type PerkapGearStatus = 'MILIK' | 'PINJAM' | 'SEWA_BELUM' | 'SEWA_LUNAS';

export interface PerkapGear {
  id: string;
  itemName: string;
  qty: number;
  sourceName: string;
  rentalCost: number;
  picName: string;
  status: PerkapGearStatus;
  note: string;
}

export interface PerkapTransport {
  id: string;
  vehicleName: string;
  routeDesc: string;
  departureTime: string;
  fuelOrRentalCost: number;
  picName: string;
  note: string;
}

export interface ModulesState {
  danus_products: Record<string, DanusProduct>;
  danus_sales: Record<string, DanusSale>;
  danus_posters: Record<string, DanusPoster>;
  konsumsi: Record<string, KonsumsiItem>;
  members: Record<string, MemberItem>;
  fines: Record<string, FineItem>;
  cashbook: Record<string, CashbookItem>;
  versions: Record<string, VersionSnapshot>;
  suggestions: Record<string, SuggestionItem>;
  presence: Record<string, PresenceItem>;
  collab_doc: CollabDocData;
  naskah_scripts: Record<string, NaskahScript>;
  naskah_cast: Record<string, NaskahCast>;
  koreo_videos: Record<string, KoreoVideo>;
  koreo_blocking: Record<string, KoreoBlocking>;
  lighting_cues: Record<string, LightingCue>;
  lighting_gear: Record<string, LightingGear>;
  dekor_props: Record<string, DekorProp>;
  dekor_sketches: Record<string, DekorSketch>;
  pubdok_media: Record<string, PubdokMedia>;
  audio_cues: Record<string, AudioCue>;
  stage_rundown: Record<string, StageRundown>;
  stage_crew: Record<string, StageCrew>;
  perkap_gear: Record<string, PerkapGear>;
  perkap_transport: Record<string, PerkapTransport>;
  stage_alerts: Record<string, StageAlert>;
}
