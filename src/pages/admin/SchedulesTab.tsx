import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSchedule,
  getAllSchedules,
  getLecturers,
  updateSchedule,
  type Profile,
  type Schedule,
} from "@/lib/api";

const HARI = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface FormState {
  course_name: string;
  lecturer_id: string;
  room: string;
  day: string;
  start_time: string;
  end_time: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
  is_active: boolean;
}

const FORM_KOSONG: FormState = {
  course_name: "",
  lecturer_id: "",
  room: "",
  day: "Monday",
  start_time: "08:00",
  end_time: "10:00",
  latitude: "",
  longitude: "",
  radius_meters: "100",
  is_active: true,
};

function toForm(s: Schedule): FormState {
  return {
    course_name: s.course_name,
    lecturer_id: s.lecturer_id ?? "",
    room: s.room ?? "",
    day: s.day,
    start_time: s.start_time.slice(0, 5),
    end_time: s.end_time.slice(0, 5),
    latitude: "",
    longitude: "",
    radius_meters: "100",
    is_active: s.is_active,
  };
}

export default function SchedulesTab({ token }: { token: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lecturers, setLecturers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<FormState>(FORM_KOSONG);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [list, dosen] = await Promise.all([
      getAllSchedules(token),
      getLecturers(token),
    ]);
    setSchedules(list);
    setLecturers(dosen);
  }

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!batal)
          setError(err instanceof Error ? err.message : "Gagal memuat jadwal.");
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openAdd() {
    setEditing(null);
    setForm(FORM_KOSONG);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setForm(toForm(s));
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.course_name.trim()) {
      setFormError("Nama mata kuliah wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        course_name: form.course_name.trim(),
        lecturer_id: form.lecturer_id || null,
        room: form.room.trim() || null,
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        radius_meters: Number(form.radius_meters) || 100,
        is_active: form.is_active,
      };
      if (editing) {
        await updateSchedule(token, editing.id, payload);
      } else {
        await createSchedule(token, payload);
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const namaDosen = (id: string) =>
    lecturers.find((d) => d.id === id)?.name ?? "-";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Jadwal</CardTitle>
            <CardDescription>
              Sumber kebenaran master jadwal, kelas, dan ruangan.
            </CardDescription>
          </div>
          <Button onClick={openAdd}>Tambah Jadwal</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && schedules.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">Belum ada jadwal.</p>
        )}
        {schedules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Mata kuliah</th>
                  <th className="py-2 pr-4 font-medium">Dosen</th>
                  <th className="py-2 pr-4 font-medium">Waktu</th>
                  <th className="py-2 pr-4 font-medium">Ruang</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.course_name}</td>
                    <td className="py-2 pr-4">
                      {s.lecturer_name ??
                        (s.lecturer_id ? namaDosen(s.lecturer_id) : "-")}
                    </td>
                    <td className="py-2 pr-4">
                      {s.day} {s.start_time.slice(0, 5)}–
                      {s.end_time.slice(0, 5)}
                    </td>
                    <td className="py-2 pr-4">{s.room ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {s.is_active ? "Aktif" : "Arsip"}
                    </td>
                    <td className="py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(s)}
                      >
                        Ubah
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Ubah Jadwal" : "Tambah Jadwal"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="jadwal-matkul">Mata kuliah</Label>
                <Input
                  id="jadwal-matkul"
                  value={form.course_name}
                  onChange={(e) =>
                    setForm({ ...form, course_name: e.target.value })
                  }
                  placeholder="Contoh: Pemrograman Mobile"
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-dosen">Dosen pengampu</Label>
                  <select
                    id="jadwal-dosen"
                    value={form.lecturer_id}
                    onChange={(e) =>
                      setForm({ ...form, lecturer_id: e.target.value })
                    }
                    disabled={saving}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">
                      {editing ? "Tidak diubah" : "Belum di-assign (pool)"}
                    </option>
                    {lecturers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.identity_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-ruang">Ruangan</Label>
                  <Input
                    id="jadwal-ruang"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="Ruang 101"
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-hari">Hari</Label>
                  <select
                    id="jadwal-hari"
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    disabled={saving}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {HARI.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-mulai">Mulai</Label>
                  <Input
                    id="jadwal-mulai"
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-selesai">Selesai</Label>
                  <Input
                    id="jadwal-selesai"
                    type="time"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-lat">Latitude (opsional)</Label>
                  <Input
                    id="jadwal-lat"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) =>
                      setForm({ ...form, latitude: e.target.value })
                    }
                    placeholder="Mati bila kosong"
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-lng">Longitude (opsional)</Label>
                  <Input
                    id="jadwal-lng"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) =>
                      setForm({ ...form, longitude: e.target.value })
                    }
                    placeholder="Mati bila kosong"
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jadwal-radius">Radius (m)</Label>
                  <Input
                    id="jadwal-radius"
                    type="number"
                    min={1}
                    value={form.radius_meters}
                    onChange={(e) =>
                      setForm({ ...form, radius_meters: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  disabled={saving}
                />
                Jadwal aktif (matikan untuk arsip)
              </label>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
