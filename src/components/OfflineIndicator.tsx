import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md">
      <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      <span>Mode Offline — Data tersimpan lokal digunakan sampai koneksi kembali.</span>
    </div>
  );
};
