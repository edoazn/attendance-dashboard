import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  getAllSchedules,
  getProfiles,
  getSummary,
  type AttendanceSummaryRow,
  type Profile,
  type Schedule,
} from "@/lib/api";

function namaFile(s: Schedule): string {
  const bersih = s.course_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `rekap-jadwal-${s.id}-${bersih || "kelas"}.xlsx`;
}

export default function RecapTab({ token }: { token: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<AttendanceSummaryRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const [jadwal, prof] = await Promise.all([
          getAllSchedules(token),
          getProfiles(token),
        ]);
        if (batal) return;
        const aktif = jadwal.filter((j) => j.is_active);
        setSchedules(aktif);
        const map: Record<string, Profile> = {};
        for (const p of prof) map[p.id] = p;
        setProfiles(map);
        if (aktif.length > 0) setSelectedId(String(aktif[0].id));
      } catch (err) {
        if (!batal)
          setError(err instanceof Error ? err.message : "Gagal memuat.");
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedId) return;
    let batal = false;
    setTableLoading(true);
    setError("");
    (async () => {
      try {
        const data = await getSummary(token, Number(selectedId));
        if (!batal) setRows(data);
      } catch (err) {
        if (!batal)
          setError(err instanceof Error ? err.message : "Gagal memuat rekap.");
      } finally {
        if (!batal) setTableLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [token, selectedId]);

  const selected = schedules.find((s) => s.id === Number(selectedId)) ?? null;

  function handleExport() {
    if (!selected) return;
    const data = rows.map((r) => {
      const p = profiles[r.student_id];
      return {
        Nama: p?.name ?? "-",
        NIM: p?.identity_number ?? "-",
        Rombel: p?.rombel ?? "-",
        "Total Sesi": r.total_sesi,
        Hadir: r.hadir,
        Izin: r.izin,
        "Persen Hadir": r.persen,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      selected.course_name.slice(0, 31) || "Rekap"
    );
    XLSX.writeFile(wb, namaFile(selected));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardTitle>Rekap Kehadiran</CardTitle>
            <CardDescription>
              Persen = HADIR / total sesi; IZIN kolom tersendiri.
            </CardDescription>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rekap-jadwal">Jadwal</Label>
              <select
                id="rekap-jadwal"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course_name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={rows.length === 0}
            >
              Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {tableLoading && (
          <p className="text-sm text-muted-foreground">Memuat rekap...</p>
        )}
        {!loading && !tableLoading && rows.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Belum ada data rekap untuk jadwal ini.
          </p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Nama</th>
                  <th className="py-2 pr-4 font-medium">NIM</th>
                  <th className="py-2 pr-4 font-medium">Total Sesi</th>
                  <th className="py-2 pr-4 font-medium">Hadir</th>
                  <th className="py-2 pr-4 font-medium">Izin</th>
                  <th className="py-2 font-medium">Persen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = profiles[r.student_id];
                  return (
                    <tr key={r.student_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {p?.name ?? "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {p?.identity_number ?? "-"}
                      </td>
                      <td className="py-2 pr-4">{r.total_sesi}</td>
                      <td className="py-2 pr-4">{r.hadir}</td>
                      <td className="py-2 pr-4">{r.izin}</td>
                      <td className="py-2">{r.persen}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
