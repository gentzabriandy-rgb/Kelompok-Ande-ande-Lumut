import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export const inputClass =
  'w-full min-h-[44px] rounded-xl border border-white/10 bg-[#090B10] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#D4AF37]/60 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition';

export const selectClass =
  'w-full min-h-[44px] rounded-xl border border-white/10 bg-[#090B10] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#D4AF37]/60 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition';

export const textareaClass =
  'w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#D4AF37]/60 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition';

export const labelClass = 'block text-xs font-medium text-slate-300 mb-1.5';

export const primaryBtnClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0';

export const goldBtnClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-[#090B10] transition hover:bg-[#F5C451] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0';

export const secondaryBtnClass =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] whitespace-nowrap shrink-0';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-[#111520] px-6 py-10 text-center">
    <h4 className="font-display text-base font-semibold text-slate-200">{title}</h4>
    <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-slate-400">{description}</p>
    {actionLabel && onAction && (
      <button type="button" onClick={onAction} className={`${primaryBtnClass} mt-4`}>
        {actionLabel}
      </button>
    )}
  </div>
);

export const SafeImage: React.FC<{
  src: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  onClick?: () => void;
}> = ({ src, alt, className = 'h-40 w-full object-cover', fallbackTitle, onClick }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#171C2B] to-[#0E121B] text-slate-500 p-4 text-center ${className}`}
      >
        <ImageOff className="h-6 w-6 text-slate-500/70 mb-1.5" />
        <span className="text-xs text-slate-400 line-clamp-1">
          {fallbackTitle || 'Belum ada pratinjau'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onClick={onClick}
      className={className}
    />
  );
};
