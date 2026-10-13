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
  createUser,
  enrollRombel,
  getAllSchedules,
  getProfiles,
  updateProfile,
  type Profile,
  type Schedule,
} from "@/lib/api";

const ROLES = ["STUDENT", "LECTURER", "ADMIN"] as const;

export default function UsersTab({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [nim, setNim] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("STUDENT");
  const [rombel, setRombel] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [enrollSchedule, setEnrollSchedule] = useState("");
  const [targetRombel, setTargetRombel] = useState("");
  const [enrollMsg, setEnrollMsg] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  async function reload() {
    const [list, jadwal] = await Promise.all([
      getProfiles(token),
      getAllSchedules(token),
    ]);
    setProfiles(list);
    setSchedules(jadwal.filter((j) => j.is_active));
  }

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!batal)
          setError(
            err instanceof Error ? err.message : "Gagal memuat pengguna."
          );
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
    setNim("");
    setName("");
    setPassword("");
    setRole("STUDENT");
    setRombel("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(p: Profile) {
    setEditing(p);
    setNim(p.identity_number);
    setName(p.name);
    setPassword("");
    setRole(p.role);
    setRombel(p.rombel ?? "");
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nim.trim() || !name.trim()) {
      setFormError("NIM dan nama wajib diisi.");
      return;
    }
    if (!editing && password.length < 6) {
      setFormError("Kata sandi minimal 6 karakter.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateProfile(token, editing.id, {
          name: name.trim(),
          rombel: rombel.trim() || null,
          role,
        });
      } else {
        await createUser(token, {
          nim: nim.trim(),
          name: name.trim(),
          password,
          role,
          ...(rombel.trim() ? { rombel: rombel.trim() } : {}),
        });
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnroll() {
    if (!enrollSchedule || !targetRombel) {
      setEnrollMsg("Pilih jadwal dan rombel dulu.");
      return;
    }
    setEnrolling(true);
    setEnrollMsg("");
    try {
      const ids = profiles
        .filter((p) => p.role === "STUDENT" && p.rombel === targetRombel)
        .map((p) => p.id);
      if (ids.length === 0) {
        setEnrollMsg("Tidak ada mahasiswa di rombel itu.");
        return;
      }
      await enrollRombel(token, Number(enrollSchedule), ids);
      setEnrollMsg(`${ids.length} mahasiswa didaftarkan ke jadwal.`);
    } catch (err) {
      setEnrollMsg(err instanceof Error ? err.message : "Gagal mendaftarkan.");
    } finally {
      setEnrolling(false);
    }
  }

  const rombels = Array.from(
    new Set(
      profiles
        .filter((p) => p.role === "STUDENT" && p.rombel)
        .map((p) => p.rombel as string)
    )
  ).sort();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Pengguna</CardTitle>
              <CardDescription>
                Akun dibuat admin menyamai data sisfo; tanpa registrasi
                mandiri.
              </CardDescription>
            </div>
            <Button onClick={openAdd}>Tambah Pengguna</Button>
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
          {profiles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Nama</th>
                    <th className="py-2 pr-4 font-medium">NIM</th>
                    <th className="py-2 pr-4 font-medium">Peran</th>
                    <th className="py-2 pr-4 font-medium">Rombel</th>
                    <th className="py-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.name}</td>
                      <td className="py-2 pr-4">{p.identity_number}</td>
                      <td className="py-2 pr-4">{p.role}</td>
                      <td className="py-2 pr-4">{p.rombel ?? "-"}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(p)}
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
                  {editing ? "Ubah Pengguna" : "Tambah Pengguna"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-nim">NIM</Label>
                    <Input
                      id="user-nim"
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      disabled={saving || !!editing}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-nama">Nama</Label>
                    <Input
                      id="user-nama"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
                {!editing && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-pass">Kata sandi awal</Label>
                    <Input
                      id="user-pass"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-role">Peran</Label>
                    <select
                      id="user-role"
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as (typeof ROLES)[number])
                      }
                      disabled={saving}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-rombel">Rombel (mahasiswa)</Label>
                    <Input
                      id="user-rombel"
                      value={rombel}
                      onChange={(e) => setRombel(e.target.value)}
                      placeholder="Contoh: TI-2A"
                      disabled={saving}
                    />
                  </div>
                </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Enroll Rombel</CardTitle>
          <CardDescription>
            Daftarkan satu paket rombel per semester ke satu jadwal (model
            bundling, tanpa pilih manual).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="enroll-jadwal">Jadwal</Label>
            <select
              id="enroll-jadwal"
              value={enrollSchedule}
              onChange={(e) => setEnrollSchedule(e.target.value)}
              disabled={enrolling}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih jadwal</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="enroll-rombel">Rombel</Label>
            <select
              id="enroll-rombel"
              value={targetRombel}
              onChange={(e) => setTargetRombel(e.target.value)}
              disabled={enrolling}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih rombel</option>
              {rombels.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => void handleEnroll()} disabled={enrolling}>
            {enrolling ? "Mendaftarkan..." : "Daftarkan"}
          </Button>
          {enrollMsg && <p className="text-sm">{enrollMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
