import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ensureSessionQr,
  getAttendance,
  getSchedules,
  setSessionState,
  type AttendanceRow,
  type Schedule,
} from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { Session } from "@/lib/session";

function formatJam(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function LecturerPage({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const { token, user } = session;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [schedError, setSchedError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attError, setAttError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [duration, setDuration] = useState(10);
  const qrBoxRef = useRef<HTMLDivElement>(null);

  const selected = schedules.find((s) => s.id === selectedId) ?? null;

  const refreshSchedules = useCallback(async () => {
    const list = await getSchedules(token);
    setSchedules(list);
    return list;
  }, [token]);

  const refreshAttendance = useCallback(async (scheduleId: number) => {
    const rows = await getAttendance(token, scheduleId);
    setAttendance(rows);
  }, [token]);

  // Muat jadwal saat buka halaman.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const list = await refreshSchedules();
        if (!batal && list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        if (!batal)
          setSchedError(
            err instanceof Error ? err.message : "Gagal memuat jadwal."
          );
      } finally {
        if (!batal) setSchedLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [refreshSchedules]);

  // QR statis + daftar hadir + langganan live per jadwal terpilih.
  useEffect(() => {
    if (selectedId === null) return;
    let batal = false;
    setQrToken("");
    setAttendance([]);
    setAttError("");
    (async () => {
      try {
        const [qr] = await Promise.all([
          ensureSessionQr(token, selectedId),
          refreshAttendance(selectedId).then(() => null),
        ]);
        if (!batal) setQrToken(qr.qr_token);
      } catch {
        if (!batal) {
          // QR gagal (mis. jadwal arsip) -> kosongkan; daftar hadir coba terpisah.
          setQrToken("");
          try {
            await refreshAttendance(selectedId);
          } catch (err2) {
            setAttError(
              err2 instanceof Error ? err2.message : "Gagal memuat kehadiran."
            );
          }
        }
      }
    })();

    let channel: { unsubscribe: () => void } | null = null;
    (async () => {
      try {
        const client = getSupabase();
        await client.realtime.setAuth(token);
        channel = client
          .channel(`hadir-live-${selectedId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "attendance_records",
              filter: `schedule_id=eq.${selectedId}`,
            },
            () => {
              void refreshAttendance(selectedId).catch(() => {});
              void refreshSchedules().catch(() => {});
            }
          )
          .subscribe();
      } catch {
        /* live opsional; daftar dimuat manual */
      }
    })();
    return () => {
      channel?.unsubscribe();
      channel = null;
    };
  }, [selectedId, token, refreshAttendance, refreshSchedules]);

  async function handleSetState(state: "on" | "off") {
    if (selectedId === null) return;
    setActionLoading(true);
    setActionError("");
    try {
      await setSessionState(
        token,
        selectedId,
        state,
        state === "on" ? duration : undefined
      );
      await Promise.all([
        refreshSchedules(),
        refreshAttendance(selectedId).catch((err: unknown) => {
          setAttError(
            err instanceof Error ? err.message : "Gagal memuat kehadiran."
          );
        }),
      ]);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal mengubah sesi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleDownloadPng() {
    const svg = qrBoxRef.current?.querySelector("svg");
    if (!svg || !qrToken) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(
      new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `qr-jadwal-${selectedId}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }

  return (
    <div className="min-h-svh bg-muted">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold">Dasbor Dosen</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} — NIM {user.identity_number}
            </p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Saya</CardTitle>
            <CardDescription>Pilih jadwal untuk mengelola sesi.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {schedLoading && (
              <p className="text-sm text-muted-foreground">Memuat jadwal...</p>
            )}
            {schedError && (
              <p role="alert" className="text-sm text-destructive">
                {schedError}
              </p>
            )}
            {!schedLoading && schedules.length === 0 && !schedError && (
              <p className="text-sm text-muted-foreground">
                Belum ada jadwal aktif.
              </p>
            )}
            {schedules.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  s.id === selectedId
                    ? "border-primary bg-accent"
                    : "border-border bg-background hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.course_name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.session_open
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {s.session_open ? "Sesi ON" : "Sesi OFF"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.day} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  {s.room ? ` — ${s.room}` : ""}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {!selected ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Pilih jadwal di sebelah kiri untuk mulai.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selected.course_name}</CardTitle>
                  <CardDescription>
                    {selected.session_open
                      ? `Sesi dibuka sampai ${formatJam(selected.session_expires_at)} — QR di bawah bisa dipindai.`
                      : "Sesi mati — QR di bawah belum bisa dipindai."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="durasi">Durasi sesi (menit)</Label>
                      <Input
                        id="durasi"
                        type="number"
                        min={1}
                        max={120}
                        value={duration}
                        onChange={(e) =>
                          setDuration(
                            Math.min(120, Math.max(1, Number(e.target.value) || 1))
                          )
                        }
                        disabled={actionLoading || selected.session_open}
                        className="w-28"
                      />
                    </div>
                    {selected.session_open ? (
                      <Button
                        variant="destructive"
                        onClick={() => void handleSetState("off")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Memproses..." : "Matikan Sesi"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => void handleSetState("on")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Memproses..." : "Nyalakan Sesi"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleDownloadPng}
                      disabled={!qrToken}
                    >
                      Unduh QR (PNG)
                    </Button>
                  </div>
                  {actionError && (
                    <p role="alert" className="text-sm text-destructive">
                      {actionError}
                    </p>
                  )}
                  <div className="flex justify-center rounded-lg border bg-white p-6">
                    {qrToken ? (
                      <div ref={qrBoxRef}>
                        <QRCode value={qrToken} size={384} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Memuat QR...
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempel cetakan QR ini di kelas atau tampilkan via proyektor.
                    QR hanya berlaku saat sesi ON.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Daftar Hadir Live ({attendance.length})
                  </CardTitle>
                  <CardDescription>
                    Nama, NIM, jam, dan metode — terisi otomatis saat mahasiswa
                    absen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attError && (
                    <p role="alert" className="text-sm text-destructive">
                      {attError}
                    </p>
                  )}
                  {attendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada yang hadir.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4 font-medium">Nama</th>
                            <th className="py-2 pr-4 font-medium">NIM</th>
                            <th className="py-2 pr-4 font-medium">Jam</th>
                            <th className="py-2 font-medium">Metode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                {r.profiles?.name ?? "-"}
                              </td>
                              <td className="py-2 pr-4">
                                {r.profiles?.identity_number ?? "-"}
                              </td>
                              <td className="py-2 pr-4">
                                {formatJam(r.created_at)}
                              </td>
                              <td className="py-2">{r.method ?? r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
