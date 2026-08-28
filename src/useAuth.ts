/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 *
 * Client auth state for the single-password gate. `canEdit` decides whether
 * the privileged UI (AI recognition, Services tab, catalog editing) is shown;
 * the server enforces the same rule on every guarded endpoint.
 */

import { useCallback, useEffect, useState } from "react";

interface AuthState {
  ready: boolean;      // initial /api/auth check finished
  authed: boolean;     // holds a valid session cookie
  configured: boolean; // server has AUTH_PASSWORD set
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ ready: false, authed: false, configured: true });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth");
      const d = await r.json();
      setState({ ready: true, authed: !!d.authed, configured: d.configured !== false });
    } catch {
      setState({ ready: true, authed: false, configured: true });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (password: string): Promise<string | null> => {
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) { await refresh(); return null; }
      const d = await r.json().catch(() => ({}));
      return d.error || "Не вдалося увійти";
    } catch {
      return "Немає з'єднання із сервером";
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch { /* ignore */ }
    await refresh();
  }, [refresh]);

  return { ...state, canEdit: state.authed, login, logout, refresh };
}
