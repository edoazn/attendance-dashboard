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
  lecturer_id: string | null;
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

// ---------------------------------------------------------------- admin
// Tulis master oleh admin via RLS (JWT user); tulis kritis tetap via
// Edge Function. Kosong (201/204) dikembalikan sebagai null.

async function mutate<T>(
  token: string,
  path: string,
  method: "POST" | "PATCH",
  body: unknown
): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let pesan = "Terjadi kesalahan. Coba lagi.";
    try {
      const parsed = (await res.json()) as { error?: unknown; message?: unknown };
      const raw =
        typeof parsed.error === "string"
          ? parsed.error
          : typeof parsed.message === "string"
            ? parsed.message
            : "";
      if (raw) pesan = raw;
    } catch {
      /* pakai pesan default */
    }
    throw new Error(pesan);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

export interface Profile {
  id: string;
  identity_number: string;
  name: string;
  email: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  rombel: string | null;
}

export interface PermitRequest {
  id: number;
  schedule_id: number;
  student_id: string;
  alasan: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { name: string; identity_number: string } | null;
  schedules: { course_name: string } | null;
}

export interface AttendanceSummaryRow {
  schedule_id: number;
  student_id: string;
  total_sesi: number;
  hadir: number;
  izin: number;
  persen: number;
}

/** Semua jadwal termasuk arsip (admin melihat semua). */
export function getAllSchedules(token: string): Promise<Schedule[]> {
  return authed<Schedule[]>(token, "/rest/v1/schedules?select=*&order=day,start_time");
}

export function getLecturers(token: string): Promise<Profile[]> {
  return authed<Profile[]>(
    token,
    "/rest/v1/profiles?select=id,name,identity_number&role=eq.LECTURER&order=name"
  );
}

export async function createSchedule(
  token: string,
  row: Partial<Schedule>
): Promise<Schedule> {
  const rows = await mutate<Schedule[]>(
    token,
    "/rest/v1/schedules",
    "POST",
    row
  );
  const created = rows?.[0];
  if (!created) throw new Error("Gagal membuat jadwal.");
  return created;
}

export async function updateSchedule(
  token: string,
  id: number,
  patch: Partial<Schedule>
): Promise<void> {
  await mutate(token, `/rest/v1/schedules?id=eq.${id}`, "PATCH", patch);
}

export function getProfiles(token: string): Promise<Profile[]> {
  return authed<Profile[]>(
    token,
    "/rest/v1/profiles?select=id,identity_number,name,email,role,rombel&order=name"
  );
}

export async function createUser(
  token: string,
  input: {
    nim: string;
    name: string;
    password: string;
    role: "STUDENT" | "LECTURER" | "ADMIN";
    rombel?: string;
  }
): Promise<{ id: string; identity_number: string; name: string; role: string }> {
  const res = await mutate<{ user: { id: string; identity_number: string; name: string; role: string } }>(
    token,
    "/functions/v1/create-user",
    "POST",
    input
  );
  if (!res?.user) throw new Error("Data pengguna tidak dapat dibuat.");
  return res.user;
}

export async function updateProfile(
  token: string,
  id: string,
  patch: Partial<Pick<Profile, "name" | "rombel" | "role">>
): Promise<void> {
  await mutate(token, `/rest/v1/profiles?id=eq.${id}`, "PATCH", patch);
}

/** Daftarkan semua mahasiswa satu rombel ke jadwal (duplikat diabaikan). */
export async function enrollRombel(
  token: string,
  scheduleId: number,
  studentIds: string[]
): Promise<void> {
  const res = await fetch(`${BASE_URL}/rest/v1/enrollments`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(
      studentIds.map((student_id) => ({ schedule_id: scheduleId, student_id }))
    ),
  });
  if (!res.ok) throw new Error("Gagal mendaftarkan rombel.");
}

export function getPermits(
  token: string,
  status: "pending" | "approved" | "rejected" = "pending"
): Promise<PermitRequest[]> {
  return authed<PermitRequest[]>(
    token,
    `/rest/v1/permit_requests?status=eq.${status}&select=*,profiles(name,identity_number),schedules(course_name)&order=created_at.desc`
  );
}

export function decidePermit(
  token: string,
  permitId: number,
  decision: "approved" | "rejected"
): Promise<{ status: string; attendance_id: number | null }> {
  return authed(token, "/functions/v1/approve-permit", {
    method: "POST",
    body: JSON.stringify({ permit_id: permitId, decision }),
  });
}

export function getSummary(
  token: string,
  scheduleId: number
): Promise<AttendanceSummaryRow[]> {
  return authed<AttendanceSummaryRow[]>(
    token,
    `/rest/v1/attendance_summary?schedule_id=eq.${scheduleId}&select=*`
  );
}
