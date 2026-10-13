const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function authed<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let pesan = "Terjadi kesalahan. Coba lagi.";
    try {
      const body = (await res.json()) as { error?: unknown };
      if (body && typeof body.error === "string" && body.error) {
        pesan = body.error;
      }
    } catch {
      /* pakai pesan default */
    }
    throw new Error(pesan);
  }
  return (await res.json()) as T;
}

export interface Schedule {
  id: number;
  course_name: string;
  lecturer_name: string | null;
  room: string | null;
  day: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  session_open: boolean;
  session_expires_at: string | null;
}

export interface SessionState {
  state: "on" | "off";
  session_id: number | null;
  expires_at: string | null;
}

export interface AttendanceRow {
  id: number;
  status: string;
  method: string | null;
  created_at: string;
  profiles: { name: string; identity_number: string } | null;
}

/** Jadwal aktif milik dosen (RLS sudah membatasi own+pool). */
export function getSchedules(token: string): Promise<Schedule[]> {
  return authed<Schedule[]>(
    token,
    "/rest/v1/schedules?select=*&is_active=eq.true&order=day,start_time"
  );
}

/** Token QR statis per jadwal (idempoten, sama tiap dipanggil). */
export function ensureSessionQr(
  token: string,
  scheduleId: number
): Promise<{ qr_token: string; created: boolean }> {
  return authed(token, "/functions/v1/ensure-session-qr", {
    method: "POST",
    body: JSON.stringify({ schedule_id: scheduleId }),
  });
}

export function setSessionState(
  token: string,
  scheduleId: number,
  state: "on" | "off",
  durationMinutes?: number
): Promise<SessionState> {
  return authed(token, "/functions/v1/set-session-state", {
    method: "POST",
    body: JSON.stringify({
      schedule_id: scheduleId,
      state,
      ...(durationMinutes ? { duration_minutes: durationMinutes } : {}),
    }),
  });
}

/** Daftar hadir satu jadwal, terbaru dulu (nama + NIM ikut dari profiles). */
export function getAttendance(
  token: string,
  scheduleId: number
): Promise<AttendanceRow[]> {
  return authed<AttendanceRow[]>(
    token,
    `/rest/v1/attendance_records?schedule_id=eq.${scheduleId}&select=*,profiles(name,identity_number)&order=created_at.desc`
  );
}
