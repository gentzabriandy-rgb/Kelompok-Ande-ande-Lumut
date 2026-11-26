import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let displayMessage = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; path?: string };
      if (parsed && parsed.error) {
        displayMessage = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ''}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught application error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090B10] text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-500/25 bg-[#111520] p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h2 className="font-display text-lg font-bold">Terjadi Kendala Sinkronisasi</h2>
            </div>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed break-words">
              {this.state.message || 'Gagal memuat atau menyimpan data ke Firestore.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
