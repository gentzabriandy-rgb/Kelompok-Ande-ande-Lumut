import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#2563EB]/40 bg-[#2563EB]/15 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-[#2563EB]/25 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>{compact ? 'Install' : 'Install Aplikasi'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#F5C451] transition hover:bg-[#D4AF37]/20 whitespace-nowrap shrink-0"
        >
          <Share className="h-3.5 w-3.5" />
          <span>{compact ? 'PWA' : 'Tambah ke Home'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111520] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-100">
                    Pasang di iPhone / iPad
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Akses KasKelompok langsung dari Home Screen seperti aplikasi native.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  aria-label="Tutup panduan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#2563EB]/20 font-mono text-xs font-bold text-blue-300">
                    1
                  </span>
                  <span>
                    Ketuk tombol <strong className="text-slate-100">Share (Bagikan)</strong> di bilah bawah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#D4AF37]/20 font-mono text-xs font-bold text-[#F5C451]">
                    2
                  </span>
                  <span>
                    Gulir ke bawah dan pilih <strong className="text-slate-100">Add to Home Screen</strong> (Tambah ke Layar Utama).
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#2563EB] py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
