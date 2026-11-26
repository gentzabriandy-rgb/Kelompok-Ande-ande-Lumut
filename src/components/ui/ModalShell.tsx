import React from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#111520] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-white/15" />
        </div>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/[0.08] bg-[#111520]/95 backdrop-blur-md px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-100 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 pb-8 sm:pb-5">{children}</div>
      </div>
    </div>
  );
};
