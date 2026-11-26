import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ImagePlus,
  Plus,
  ShoppingBag,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type {
  DanusPoster,
  DanusProduct,
  DanusSale,
  PosterStatus,
} from '../../types/kaskelompok';
import {
  formatDateTime,
  formatRupiah,
  generateId,
  parsePositiveNumber,
} from '../../utils/formatters';
import { compressImageToBase64, resolveImageSrc } from '../../utils/imageCompress';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  goldBtnClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  SafeImage,
  secondaryBtnClass,
  selectClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

const POSTER_STATUS_LABEL: Record<PosterStatus, string> = {
  DRAFT: 'Draft',
  REVISI: 'Revisi',
  SIAP_PUBLISH: 'Siap Publish',
  PUBLISHED: 'Published',
};

export const DanusTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenLightbox,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'produk' | 'poster'>('produk');
  const [posterFilter, setPosterFilter] = useState<'ALL' | PosterStatus>('ALL');

  const products = useMemo(
    () =>
      Object.values(modules.danus_products).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [modules.danus_products]
  );
  const sales = useMemo(
    () =>
      Object.values(modules.danus_sales).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.danus_sales]
  );
  const posters = useMemo(() => {
    const list = Object.values(modules.danus_posters).sort(
      (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
    );
    return posterFilter === 'ALL' ? list : list.filter((p) => p.status === posterFilter);
  }, [modules.danus_posters, posterFilter]);

  const totalProfit = sales.reduce(
    (sum, s) => sum + ((s.sellPrice || 0) - (s.costPrice || 0)) * (s.qty || 0),
    0
  );
  const depositedProfit = sales
    .filter((s) => s.deposited)
    .reduce((sum, s) => sum + ((s.sellPrice || 0) - (s.costPrice || 0)) * (s.qty || 0), 0);

  // Product modal
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<DanusProduct | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Makanan & Minuman');
  const [prodCost, setProdCost] = useState('');
  const [prodSell, setProdSell] = useState('');
  const [prodStock, setProdStock] = useState('10');

  // Sale modal
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleSeller, setSaleSeller] = useState(user.displayName || '');
  const [saleDeposited, setSaleDeposited] = useState(false);

  // Poster modal
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [editingPoster, setEditingPoster] = useState<DanusPoster | null>(null);
  const [posterTitle, setPosterTitle] = useState('');
  const [posterDiv, setPosterDiv] = useState('Danus');
  const [posterStatus, setPosterStatus] = useState<PosterStatus>('DRAFT');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterB64, setPosterB64] = useState('');
  const [posterNote, setPosterNote] = useState('');
  const [compressing, setCompressing] = useState(false);

  const openAddProduct = () => {
    setEditingProd(null);
    setProdName('');
    setProdCategory('Makanan & Minuman');
    setProdCost('');
    setProdSell('');
    setProdStock('20');
    setProdModalOpen(true);
  };

  const openEditProduct = (p: DanusProduct) => {
    setEditingProd(p);
    setProdName(p.name);
    setProdCategory(p.category || 'Lainnya');
    setProdCost(String(p.costPrice));
    setProdSell(String(p.sellPrice));
    setProdStock(String(p.stock));
    setProdModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    const id = editingProd?.id || generateId('prod');
    const item: DanusProduct = {
      id,
      name: prodName.trim(),
      category: prodCategory.trim() || 'Umum',
      costPrice: parsePositiveNumber(prodCost),
      sellPrice: parsePositiveNumber(prodSell),
      stock: Math.round(parsePositiveNumber(prodStock)),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'danus_products',
      itemId: id,
      itemData: item,
      docExists: moduleExists.danus_products,
      user,
    });
    setProdModalOpen(false);
    onToast(editingProd ? 'Produk diperbarui.' : 'Produk ditambahkan.', 'success');
  };

  const openSaleForProduct = (product?: DanusProduct) => {
    setSaleProductId(product?.id || products[0]?.id || '');
    setSaleQty('1');
    setSaleSeller(user.displayName || user.email?.split('@')[0] || '');
    setSaleDeposited(false);
    setSaleModalOpen(true);
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === saleProductId);
    if (!product) {
      onToast('Pilih produk terlebih dahulu.', 'error');
      return;
    }
    const qty = Math.max(1, Math.round(parsePositiveNumber(saleQty)));
    const id = generateId('sale');
    const saleItem: DanusSale = {
      id,
      productId: product.id,
      productName: product.name,
      qty,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      sellerName: saleSeller.trim() || 'Anggota',
      deposited: saleDeposited,
      createdAtMs: Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'danus_sales',
      itemId: id,
      itemData: saleItem,
      docExists: moduleExists.danus_sales,
      user,
    });

    // Update product stock safely
    const nextStock = Math.max(0, (product.stock || 0) - qty);
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'danus_products',
      itemId: product.id,
      itemData: { ...product, stock: nextStock },
      docExists: moduleExists.danus_products,
      user,
    });

    setSaleModalOpen(false);
    onToast('Penjualan danus tercatat.', 'success');
  };

  const toggleDeposited = async (sale: DanusSale) => {
    if (!isEditor) return;
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'danus_sales',
      itemId: sale.id,
      itemData: { ...sale, deposited: !sale.deposited },
      docExists: moduleExists.danus_sales,
      user,
    });
  };

  const openAddPoster = () => {
    setEditingPoster(null);
    setPosterTitle('');
    setPosterDiv('Danus');
    setPosterStatus('DRAFT');
    setPosterUrl('');
    setPosterB64('');
    setPosterNote('');
    setPosterModalOpen(true);
  };

  const openEditPoster = (p: DanusPoster) => {
    setEditingPoster(p);
    setPosterTitle(p.title);
    setPosterDiv(p.divisionLabel || 'Danus');
    setPosterStatus(p.status);
    setPosterUrl(p.imageUrlOrUri || '');
    setPosterB64(p.thumbnailB64 || '');
    setPosterNote(p.note || '');
    setPosterModalOpen(true);
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImageToBase64(file, 35 * 1024);
      setPosterB64(b64);
      onToast(
        `Gambar dikompresi (${Math.round(b64.length / 1024)} KB) siap sinkron lintas perangkat.`,
        'success'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal memproses gambar.', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const handleSavePoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterTitle.trim()) return;
    const id = editingPoster?.id || generateId('poster');
    const item: DanusPoster = {
      id,
      title: posterTitle.trim(),
      divisionLabel: posterDiv.trim() || 'Danus',
      status: posterStatus,
      imageUrlOrUri: posterUrl.trim(),
      ...(posterB64 ? { thumbnailB64: posterB64 } : {}),
      note: posterNote.trim(),
      uploadedByName:
        editingPoster?.uploadedByName ||
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        'Editor',
      createdAtMs: editingPoster?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'danus_posters',
      itemId: id,
      itemData: item,
      docExists: moduleExists.danus_posters,
      user,
    });
    setPosterModalOpen(false);
    onToast(editingPoster ? 'Poster diperbarui.' : 'Poster Danus ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-tabs + Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('produk')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              subTab === 'produk'
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Produk &amp; Jual ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('poster')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              subTab === 'poster'
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Poster Danus ({Object.keys(modules.danus_posters).length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-slate-400">
            Disetor: <strong className="text-emerald-400">{formatRupiah(depositedProfit)}</strong>
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">
            Total Laba: <strong className="text-[#F5C451]">{formatRupiah(totalProfit)}</strong>
          </span>
        </div>
      </div>

      {subTab === 'produk' ? (
        <div className="space-y-6">
          {/* Catalog Section */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-100">
                Katalog Produk Danus
              </h3>
              {isEditor && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={openAddProduct} className={secondaryBtnClass}>
                    <Plus className="h-4 w-4" />
                    <span>Tambah Produk</span>
                  </button>
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openSaleForProduct()}
                      className={goldBtnClass}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Catat Penjualan</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {products.length === 0 ? (
              <EmptyState
                title="Belum Ada Produk Danus"
                description="Tambahkan produk jualan (risoles, kopi, merchandise) beserta harga modal dan harga jualnya."
                actionLabel={isEditor ? 'Tambah Produk Pertama' : undefined}
                onAction={isEditor ? openAddProduct : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((p) => {
                  const unitProfit = (p.sellPrice || 0) - (p.costPrice || 0);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#111520] p-4 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">
                              {p.category || 'Umum'} · Stok <span className="font-mono text-slate-200 tabular-nums">{p.stock}</span>
                            </p>
                            <h4 className="mt-0.5 font-display text-base font-bold text-slate-100 truncate">
                              {p.name}
                            </h4>
                          </div>
                          {isEditor && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditProduct(p)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-100"
                                aria-label="Edit produk"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void deleteModuleItem({
                                    groupId: group.id,
                                    moduleId: 'danus_products',
                                    itemId: p.id,
                                    user,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15"
                                aria-label="Hapus produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-xs font-mono tabular-nums">
                          <div>
                            <span className="block font-sans text-[11px] text-slate-500">Modal</span>
                            <span className="text-slate-300">{formatRupiah(p.costPrice)}</span>
                          </div>
                          <div>
                            <span className="block font-sans text-[11px] text-slate-500">Jual</span>
                            <span className="text-slate-100 font-semibold">{formatRupiah(p.sellPrice)}</span>
                          </div>
                          <div>
                            <span className="block font-sans text-[11px] text-slate-500">Laba/pcs</span>
                            <span className={unitProfit >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400'}>
                              {formatRupiah(unitProfit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isEditor && (
                        <button
                          type="button"
                          onClick={() => openSaleForProduct(p)}
                          className="w-full min-h-[38px] rounded-xl border border-[#2563EB]/35 bg-[#2563EB]/10 text-xs font-semibold text-blue-300 transition hover:bg-[#2563EB]/20"
                        >
                          + Catat Terjual
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sales History */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5">
            <h3 className="font-display text-base font-bold text-slate-100 mb-3">
              Riwayat Penjualan Danus ({sales.length})
            </h3>
            {sales.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">Belum ada transaksi penjualan dicatat.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {sales.map((s) => {
                  const profit = ((s.sellPrice || 0) - (s.costPrice || 0)) * (s.qty || 0);
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">
                          {s.productName} <span className="font-mono text-[#F5C451] tabular-nums">×{s.qty}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Penjual: {s.sellerName} · {formatDateTime(s.createdAtMs)} · Laba{' '}
                          <span className="font-mono text-emerald-400 tabular-nums">{formatRupiah(profit)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!isEditor}
                          onClick={() => void toggleDeposited(s)}
                          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            s.deposited
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                              : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                          } ${!isEditor ? 'opacity-80 cursor-default' : 'hover:opacity-90'}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{s.deposited ? 'Sudah Disetor' : 'Belum Disetor'}</span>
                        </button>
                        {isEditor && (
                          <button
                            type="button"
                            onClick={() =>
                              void deleteModuleItem({
                                groupId: group.id,
                                moduleId: 'danus_sales',
                                itemId: s.id,
                                user,
                              })
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-red-400 hover:bg-red-500/15"
                            aria-label="Hapus penjualan"
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
        </div>
      ) : (
        /* Poster Danus Sub-Tab */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'DRAFT', 'REVISI', 'SIAP_PUBLISH', 'PUBLISHED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPosterFilter(st)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    posterFilter === st
                      ? 'bg-[#D4AF37] text-[#090B10]'
                      : 'border border-white/10 bg-[#111520] text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : POSTER_STATUS_LABEL[st]}
                </button>
              ))}
            </div>
            {isEditor && (
              <button type="button" onClick={openAddPoster} className={primaryBtnClass}>
                <ImagePlus className="h-4 w-4" />
                <span>Unggah Poster</span>
              </button>
            )}
          </div>

          {posters.length === 0 ? (
            <EmptyState
              title="Belum Ada Poster Danus"
              description="Unggah gambar poster dari perangkat (kompresi otomatis <= 35KB) atau tempel tautan gambar untuk review status."
              actionLabel={isEditor ? 'Unggah Poster Pertama' : undefined}
              onAction={isEditor ? openAddPoster : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posters.map((poster) => {
                const imgSrc = resolveImageSrc(poster.imageUrlOrUri, poster.thumbnailB64);
                return (
                  <div
                    key={poster.id}
                    className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111520] flex flex-col"
                  >
                    <div className="relative group">
                      <SafeImage
                        src={imgSrc}
                        alt={poster.title}
                        fallbackTitle={poster.title}
                        onClick={
                          imgSrc
                            ? () =>
                                onOpenLightbox(
                                  imgSrc,
                                  poster.title,
                                  `${poster.divisionLabel} · ${POSTER_STATUS_LABEL[poster.status]}`
                                )
                            : undefined
                        }
                        className={`h-48 w-full object-cover ${imgSrc ? 'cursor-zoom-in' : ''}`}
                      />
                      {imgSrc && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLightbox(
                              imgSrc,
                              poster.title,
                              `${poster.divisionLabel} · ${POSTER_STATUS_LABEL[poster.status]}`
                            )
                          }
                          className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-sm hover:bg-black"
                          aria-label="Perbesar poster"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">
                          {poster.divisionLabel} ·{' '}
                          <span
                            className={`font-semibold ${
                              poster.status === 'PUBLISHED'
                                ? 'text-emerald-400'
                                : poster.status === 'SIAP_PUBLISH'
                                ? 'text-blue-400'
                                : poster.status === 'REVISI'
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {POSTER_STATUS_LABEL[poster.status]}
                          </span>
                        </p>
                        <h4 className="mt-1 font-display text-base font-bold text-slate-100">
                          {poster.title}
                        </h4>
                        {poster.note && (
                          <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{poster.note}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
                        <span className="truncate">Oleh {poster.uploadedByName}</span>
                        {isEditor && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditPoster(poster)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                              aria-label="Edit poster"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteModuleItem({
                                  groupId: group.id,
                                  moduleId: 'danus_posters',
                                  itemId: poster.id,
                                  user,
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15"
                              aria-label="Hapus poster"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ModalShell
        open={prodModalOpen}
        onClose={() => setProdModalOpen(false)}
        title={editingProd ? 'Edit Produk Danus' : 'Tambah Produk Danus'}
      >
        <form onSubmit={(e) => void handleSaveProduct(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Produk</label>
            <input
              type="text"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Contoh: Risoles Mayo"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Kategori</label>
            <input
              type="text"
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Harga Modal (Rp)</label>
              <input
                type="number"
                min={0}
                value={prodCost}
                onChange={(e) => setProdCost(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Harga Jual (Rp)</label>
              <input
                type="number"
                min={0}
                value={prodSell}
                onChange={(e) => setProdSell(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Stok</label>
              <input
                type="number"
                min={0}
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setProdModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Produk
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        title="Catat Penjualan Danus"
      >
        <form onSubmit={(e) => void handleSaveSale(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Produk</label>
            <select
              value={saleProductId}
              onChange={(e) => setSaleProductId(e.target.value)}
              className={selectClass}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatRupiah(p.sellPrice)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jumlah Terjual (Qty)</label>
              <input
                type="number"
                min={1}
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nama Penjual</label>
              <input
                type="text"
                value={saleSeller}
                onChange={(e) => setSaleSeller(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={saleDeposited}
              onChange={(e) => setSaleDeposited(e.target.checked)}
              className="h-4 w-4 rounded accent-[#D4AF37]"
            />
            <span>Laba sudah disetor ke Bendahara</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSaleModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={goldBtnClass}>
              Simpan Penjualan
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={posterModalOpen}
        onClose={() => setPosterModalOpen(false)}
        title={editingPoster ? 'Edit Poster Danus' : 'Unggah Poster Danus'}
      >
        <form onSubmit={(e) => void handleSavePoster(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Judul Poster</label>
            <input
              type="text"
              value={posterTitle}
              onChange={(e) => setPosterTitle(e.target.value)}
              placeholder="Contoh: Poster Open PO Risoles Batch 2"
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Divisi / Label</label>
              <input
                type="text"
                value={posterDiv}
                onChange={(e) => setPosterDiv(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status Review</label>
              <select
                value={posterStatus}
                onChange={(e) => setPosterStatus(e.target.value as PosterStatus)}
                className={selectClass}
              >
                <option value="DRAFT">Draft</option>
                <option value="REVISI">Revisi</option>
                <option value="SIAP_PUBLISH">Siap Publish</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Unggah Gambar dari Perangkat (Kompres ≤ 35KB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handlePosterFileChange(e)}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-[#2563EB] file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
            />
            {compressing && <p className="mt-1 text-xs text-[#F5C451]">Mengompresi gambar...</p>}
            {posterB64 && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={`data:image/jpeg;base64,${posterB64}`}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg object-cover border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setPosterB64('')}
                  className="text-xs text-red-400 hover:underline"
                >
                  Hapus gambar lokal
                </button>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Atau Tautan URL Gambar (Opsional)</label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan Revisi / Caption</label>
            <textarea
              rows={2}
              value={posterNote}
              onChange={(e) => setPosterNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPosterModalOpen(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" disabled={compressing} className={primaryBtnClass}>
              Simpan Poster
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
