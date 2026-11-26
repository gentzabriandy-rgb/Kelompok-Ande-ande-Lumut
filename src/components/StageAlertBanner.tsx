import React from 'react';
import { BellRing, X } from 'lucide-react';
import type { StageAlert } from '../types/kaskelompok';
import { formatDateTime } from '../utils/formatters';

interface StageAlertBannerProps {
  alert: StageAlert | null;
  onDismiss: () => void;
  onOpenStageTab: () => void;
}

export const StageAlertBanner: React.FC<StageAlertBannerProps> = ({
  alert,
  onDismiss,
  onOpenStageTab,
}) => {
  if (!alert) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[420px] z-50 rounded-2xl border border-[#D4AF37]/45 bg-[#131826]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/20 text-[#F5C451]">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#F5C451] truncate">
              Panggilan Stage · {alert.sceneLabel || 'Produksi'}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-100"
              aria-label="Tutup panggilan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h4 className="mt-0.5 font-display text-sm font-bold text-slate-100">
            {alert.title}
          </h4>
          {alert.message && (
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{alert.message}</p>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span className="truncate">
              Oleh {alert.senderName} · {formatDateTime(alert.createdAtMs)}
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenStageTab();
                onDismiss();
              }}
              className="font-semibold text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
            >
              Buka Stage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
