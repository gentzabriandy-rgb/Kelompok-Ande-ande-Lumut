import React, { useMemo, useState } from 'react';
import { Boxes, Edit3, ExternalLink, Image, Plus, Trash2, ZoomIn } from 'lucide-react';
import { deleteModuleItem, upsertModuleItem } from '../../lib/groupService';
import type { DekorProp, DekorPropStatus, DekorSketch } from '../../types/kaskelompok';
import {
  formatRupiah,
  generateId,
  parsePositiveNumber,
  safeOpenUrl,
} from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';
import {
  EmptyState,
  inputClass,
  labelClass,
  primaryBtnClass,
  SafeImage,
  secondaryBtnClass,
  selectClass,
  textareaClass,
} from '../ui/SharedUI';
import type { TabProps } from './tabTypes';

const PROP_STATUS_LABEL: Record<DekorPropStatus, string> = {
  BELUM_BELI: 'Belum Beli',
  DP: 'Sudah DP',
  LUNAS: 'Lunas',
};

export const DekorTab: React.FC<TabProps> = ({
  group,
  modules,
  moduleExists,
  user,
  isEditor,
  onOpenLightbox,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'props' | 'sketches'>('props');

  const props = useMemo(
    () =>
      Object.values(modules.dekor_props).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.dekor_props]
  );
  const sketches = useMemo(
    () =>
      Object.values(modules.dekor_sketches).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      ),
    [modules.dekor_sketches]
  );

  const totalSpent = useMemo(() => {
    let spent = 0;
    for (const p of props) {
      const total = (p.qty || 0) * (p.unitPrice || 0);
      if (p.status === 'LUNAS') spent += Math.max(p.dpAmount || 0, total);
      else if (p.status === 'DP') spent += p.dpAmount || 0;
    }
    return spent;
  }, [props]);

  // Prop modal
  const [propModal, setPropModal] = useState(false);
  const [editProp, setEditProp] = useState<DekorProp | null>(null);
  const [pName, setPName] = useState('');
  const [pQty, setPQty] = useState('1');
  const [pPrice, setPPrice] = useState('0');
  const [pDp, setPDp] = useState('0');
  const [pStatus, setPStatus] = useState<DekorPropStatus>('BELUM_BELI');
  const [pStoreUrl, setPStoreUrl] = useState('');
  const [pNote, setPNote] = useState('');

  // Sketch modal
  const [sketchModal, setSketchModal] = useState(false);
  const [editSketch, setEditSketch] = useState<DekorSketch | null>(null);
  const [sTitle, setSTitle] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [sSize, setSSize] = useState('');

  const openAddProp = () => {
    setEditProp(null);
    setPName('');
    setPQty('1');
    setPPrice('0');
    setPDp('0');
    setPStatus('BELUM_BELI');
    setPStoreUrl('');
    setPNote('');
    setPropModal(true);
  };

  const openEditProp = (p: DekorProp) => {
    setEditProp(p);
    setPName(p.name);
    setPQty(String(p.qty));
    setPPrice(String(p.unitPrice));
    setPDp(String(p.dpAmount));
    setPStatus(p.status);
    setPStoreUrl(p.storeUrl || '');
    setPNote(p.note || '');
    setPropModal(true);
  };

  const handleSaveProp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    const qty = Math.max(1, Math.round(parsePositiveNumber(pQty)));
    const price = parsePositiveNumber(pPrice);
    const total = qty * price;
    const dp =
      pStatus === 'LUNAS' ? total : pStatus === 'BELUM_BELI' ? 0 : parsePositiveNumber(pDp);

    const id = editProp?.id || generateId('prop');
    const data: DekorProp = {
      id,
      name: pName.trim(),
      qty,
      unitPrice: price,
      dpAmount: dp,
      status: pStatus,
      storeUrl: pStoreUrl.trim(),
      note: pNote.trim(),
      createdAtMs: editProp?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'dekor_props',
      itemId: id,
      itemData: data,
      docExists: moduleExists.dekor_props,
      user,
    });
    setPropModal(false);
    onToast(editProp ? 'Properti diperbarui.' : 'Properti ditambahkan.', 'success');
  };

  const openAddSketch = () => {
    setEditSketch(null);
    setSTitle('');
    setSUrl('');
    setSSize('');
    setSketchModal(true);
  };

  const openEditSketch = (s: DekorSketch) => {
    setEditSketch(s);
    setSTitle(s.title);
    setSUrl(s.imageUrlOrUri);
    setSSize(s.sizeAndPositionNotes);
    setSketchModal(true);
  };

  const handleSaveSketch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) return;
    const id = editSketch?.id || generateId('skt');
    const data: DekorSketch = {
      id,
      title: sTitle.trim(),
      imageUrlOrUri: sUrl.trim(),
      sizeAndPositionNotes: sSize.trim(),
      createdAtMs: editSketch?.createdAtMs || Date.now(),
    };
    await upsertModuleItem({
      groupId: group.id,
      moduleId: 'dekor_sketches',
      itemId: id,
      itemData: data,
      docExists: moduleExists.dekor_sketches,
      user,
    });
    setSketchModal(false);
    onToast(editSketch ? 'Sketsa panggung diperbarui.' : 'Sketsa panggung ditambahkan.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-[#111520] p-1">
          <button
            type="button"
            onClick={() => setSubTab('props')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'props' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>List Properti ({props.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sketches')}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
              subTab === 'sketches' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="h-4 w-4" />
            <span>Sketsa Panggung ({sketches.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Terpakai ke Kas: <strong className="text-red-400">{formatRupiah(totalSpent)}</strong>
          </span>
          {isEditor && (
            <button
              type="button"
              onClick={subTab === 'props' ? openAddProp : openAddSketch}
              className={primaryBtnClass}
            >
              <Plus className="h-4 w-4" />
              <span>{subTab === 'props' ? 'Tambah Properti' : 'Tambah Sketsa'}</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'props' ? (
        props.length === 0 ? (
          <EmptyState
            title="Belum Ada Daftar Properti Dekor"
            description="Item berstatus DP atau Lunas akan otomatis mengurangi Saldo Kas Bersih di Ringkasan."
            actionLabel={isEditor ? 'Tambah Properti Pertama' : undefined}
            onAction={isEditor ? openAddProp : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {props.map((p) => {
              const total = (p.qty || 0) * (p.unitPrice || 0);
              const spent =
                p.status === 'LUNAS'
                  ? Math.max(p.dpAmount || 0, total)
                  : p.status === 'DP'
                  ? p.dpAmount || 0
                  : 0;
              const storeLink = safeOpenUrl(p.storeUrl || '');
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111520] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        <span
                          className={`font-semibold ${
                            p.status === 'LUNAS'
                              ? 'text-emerald-400'
                              : p.status === 'DP'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {PROP_STATUS_LABEL[p.status]}
                        </span>{' '}
                        · Qty <span className="font-mono text-slate-200 tabular-nums">{p.qty}</span>
                      </p>
                      <h4 className="mt-0.5 font-display text-base font-bold text-slate-100">
                        {p.name}
                      </h4>
                    </div>
                    {isEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditProp(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'dekor_props',
                              itemId: p.id,
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
                      <span className="block font-sans text-[11px] text-slate-500">Satuan</span>
                      <span className="text-slate-300">{formatRupiah(p.unitPrice)}</span>
                    </div>
                    <div>
                      <span className="block font-sans text-[11px] text-slate-500">Total</span>
                      <span className="text-slate-100 font-semibold">{formatRupiah(total)}</span>
                    </div>
                    <div>
                      <span className="block font-sans text-[11px] text-slate-500">Dibayar</span>
                      <span className="text-[#F5C451] font-semibold">{formatRupiah(spent)}</span>
                    </div>
                  </div>

                  {p.note && <p className="text-xs text-slate-400">{p.note}</p>}

                  {storeLink && (
                    <div>
                      <a
                        href={storeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
                      >
                        <span>Buka Tautan Toko</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : sketches.length === 0 ? (
        <EmptyState
          title="Belum Ada Sketsa Panggung"
          description="Simpan gambar desain set panggung beserta catatan ukuran dan tata letak."
          actionLabel={isEditor ? 'Tambah Sketsa Panggung' : undefined}
          onAction={isEditor ? openAddSketch : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sketches.map((s) => {
            const imgSrc = safeOpenUrl(s.imageUrlOrUri) || (s.imageUrlOrUri?.startsWith('data:') ? s.imageUrlOrUri : null);
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111520] flex flex-col"
              >
                <div className="relative">
                  <SafeImage
                    src={imgSrc}
                    alt={s.title}
                    fallbackTitle={s.title}
                    onClick={
                      imgSrc
                        ? () => onOpenLightbox(imgSrc, s.title, s.sizeAndPositionNotes)
                        : undefined
                    }
                    className={`h-48 w-full object-cover ${imgSrc ? 'cursor-zoom-in' : ''}`}
                  />
                  {imgSrc && (
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(imgSrc, s.title, s.sizeAndPositionNotes)}
                      className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-sm hover:bg-black"
                      aria-label="Perbesar sketsa"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-base font-bold text-slate-100">{s.title}</h4>
                    {isEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSketch(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteModuleItem({
                              groupId: group.id,
                              moduleId: 'dekor_sketches',
                              itemId: s.id,
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
                  {s.sizeAndPositionNotes && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {s.sizeAndPositionNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prop Modal */}
      <ModalShell
        open={propModal}
        onClose={() => setPropModal(false)}
        title={editProp ? 'Edit Properti Dekor' : 'Tambah Properti Dekor'}
      >
        <form onSubmit={(e) => void handleSaveProp(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Properti / Bahan</label>
            <input
              type="text"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="Contoh: Triplek 9mm Backdrop"
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jumlah (Qty)</label>
              <input
                type="number"
                min={1}
                value={pQty}
                onChange={(e) => setPQty(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Harga Satuan (Rp)</label>
              <input
                type="number"
                min={0}
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                className={`${inputClass} font-mono`}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status Pembelian</label>
              <select
                value={pStatus}
                onChange={(e) => setPStatus(e.target.value as DekorPropStatus)}
                className={selectClass}
              >
                <option value="BELUM_BELI">Belum Beli</option>
                <option value="DP">DP (Mengurangi Kas)</option>
                <option value="LUNAS">Lunas (Mengurangi Kas)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nominal DP (Rp)</label>
              <input
                type="number"
                min={0}
                disabled={pStatus !== 'DP'}
                value={
                  pStatus === 'LUNAS'
                    ? String(Math.round(parsePositiveNumber(pQty) * parsePositiveNumber(pPrice)))
                    : pStatus === 'BELUM_BELI'
                    ? '0'
                    : pDp
                }
                onChange={(e) => setPDp(e.target.value)}
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tautan Toko Online (Opsional)</label>
            <input
              type="url"
              value={pStoreUrl}
              onChange={(e) => setPStoreUrl(e.target.value)}
              placeholder="https://tokopedia.com/..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan</label>
            <textarea
              rows={2}
              value={pNote}
              onChange={(e) => setPNote(e.target.value)}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPropModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Properti
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Sketch Modal */}
      <ModalShell
        open={sketchModal}
        onClose={() => setSketchModal(false)}
        title={editSketch ? 'Edit Sketsa Panggung' : 'Tambah Sketsa Panggung'}
      >
        <form onSubmit={(e) => void handleSaveSketch(e)} className="space-y-4">
          <div>
            <label className={labelClass}>Judul Sketsa / Set</label>
            <input
              type="text"
              value={sTitle}
              onChange={(e) => setSTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>URL Gambar Sketsa</label>
            <input
              type="url"
              value={sUrl}
              onChange={(e) => setSUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan Ukuran &amp; Posisi</label>
            <textarea
              rows={3}
              value={sSize}
              onChange={(e) => setSSize(e.target.value)}
              placeholder="Contoh: Backdrop 6m × 3.5m di center stage..."
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSketchModal(false)} className={secondaryBtnClass}>
              Batal
            </button>
            <button type="submit" className={primaryBtnClass}>
              Simpan Sketsa
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
