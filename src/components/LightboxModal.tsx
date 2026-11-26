import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface LightboxModalProps {
  src: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  src,
  title,
  subtitle,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#090B10]/85 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          {title && (
            <h3 className="truncate font-display text-sm font-semibold text-slate-100">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#171C2B] text-slate-200 hover:bg-white/10"
            aria-label="Perkecil"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-slate-300 tabular-nums w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#171C2B] text-slate-200 hover:bg-white/10"
            aria-label="Perbesar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#171C2B] text-slate-200 hover:bg-white/10"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-red-500/15 text-red-300 hover:bg-red-500/25"
            aria-label="Tutup pratinjau"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={onClose}
      >
        <img
          src={src}
          alt={title || 'Pratinjau gambar'}
          referrerPolicy="no-referrer"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoom})` }}
          className="max-h-[82vh] max-w-full rounded-xl object-contain transition-transform duration-150 ease-out shadow-2xl"
        />
      </div>
    </div>
  );
};
