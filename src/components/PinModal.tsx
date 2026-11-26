import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { unlockEditorWithPin } from '../lib/groupService';
import { ModalShell } from './ui/ModalShell';
import { goldBtnClass, inputClass, labelClass, secondaryBtnClass } from './ui/SharedUI';

interface PinModalProps {
  open: boolean;
  groupId: string;
  groupName: string;
  uid: string;
  onClose: () => void;
  onUnlocked: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  open,
  groupId,
  groupName,
  uid,
  onClose,
  onUnlocked,
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Masukkan PIN Editor terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await unlockEditorWithPin({ groupId, pin, uid });
      setPin('');
      onUnlocked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN tidak sesuai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Aktifkan Mode Editor"
      subtitle={`Verifikasi PIN untuk mengedit data di grup ${groupName}`}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3.5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#F5C451] shrink-0 mt-0.5" />
          <span>
            Mode Editor memungkinkan Anda menambah, mengubah, dan menghapus seluruh data kas, notulen, maupun modul divisi produksi.
          </span>
        </div>

        <div>
          <label htmlFor="editor-pin" className={labelClass}>
            PIN Mode Editor
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="editor-pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN rahasia grup"
              className={`${inputClass} pl-10 font-mono tracking-widest`}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtnClass}>
            Batal
          </button>
          <button type="submit" disabled={loading} className={goldBtnClass}>
            {loading ? 'Memverifikasi...' : 'Buka Akses Editor'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
