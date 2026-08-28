/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import { useEffect, useRef, useState } from "react";
import { Lock, X, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  configured: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string | null>; // resolves to error text, or null on success
}

export default function LoginModal({ open, configured, onClose, onSubmit }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit(password);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121214] rounded-3xl max-w-sm w-full border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="font-sans font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#D4AF37]" /> Вхід
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-white/50 leading-relaxed">
            Авторизація відкриває ШІ-розпізнавання, вкладку «Сервіси» та редагування каталогу.
          </p>

          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="w-full px-3 py-2.5 bg-black/40 border border-white/10 focus:border-[#D4AF37] focus:bg-black/60 text-sm rounded-xl outline-none transition-all placeholder:text-white/30 text-white"
          />

          {!configured && (
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
              Пароль не налаштовано на сервері (AUTH_PASSWORD) — вхід недоступний.
            </p>
          )}
          {error && (
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg">{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !password}
            className="w-full bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A0A0B] font-bold px-4 py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Перевірка…</> : "Увійти"}
          </button>
        </div>
      </div>
    </div>
  );
}
