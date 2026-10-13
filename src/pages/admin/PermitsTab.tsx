import { useEffect, useState } from "react";
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
  decidePermit,
  getPermits,
  type PermitRequest,
} from "@/lib/api";

const STATUS = ["pending", "approved", "rejected"] as const;

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function PermitsTab({ token }: { token: string }) {
  const [status, setStatus] = useState<(typeof STATUS)[number]>("pending");
  const [permits, setPermits] = useState<PermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  async function reload(s: (typeof STATUS)[number]) {
    const list = await getPermits(token, s);
    setPermits(list);
  }

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        await reload(status);
      } catch (err) {
        if (!batal)
          setError(err instanceof Error ? err.message : "Gagal memuat izin.");
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  async function handleDecide(id: number, decision: "approved" | "rejected") {
    setActingId(id);
    setError("");
    try {
      await decidePermit(token, id, decision);
      await reload(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Antrean Izin</CardTitle>
            <CardDescription>
              Setujui atau tolak pengajuan izin; yang disetujui tercatat
              sebagai IZIN.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="izin-status">Status</Label>
            <select
              id="izin-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUS)[number])
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
        {!loading && permits.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Tidak ada pengajuan {status}.
          </p>
        )}
        {permits.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Mahasiswa</th>
                  <th className="py-2 pr-4 font-medium">Jadwal</th>
                  <th className="py-2 pr-4 font-medium">Alasan</th>
                  <th className="py-2 pr-4 font-medium">Diajukan</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {permits.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">
                      {p.profiles?.name ?? "-"}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.profiles?.identity_number ?? ""}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {p.schedules?.course_name ?? "-"}
                    </td>
                    <td className="py-2 pr-4">{p.alasan ?? "-"}</td>
                    <td className="py-2 pr-4">{formatTanggal(p.created_at)}</td>
                    <td className="py-2">
                      {p.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={actingId === p.id}
                            onClick={() => void handleDecide(p.id, "approved")}
                          >
                            Setuju
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actingId === p.id}
                            onClick={() => void handleDecide(p.id, "rejected")}
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{p.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
