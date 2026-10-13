import type { DashboardUser } from "./supabase";

export interface Session {
  token: string;
  user: DashboardUser;
}

const KEY = "attendance-dashboard-session";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.token || !parsed.user?.identity_number) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
