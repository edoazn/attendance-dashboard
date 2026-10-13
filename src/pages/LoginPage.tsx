import { useState } from "react";
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
import { loginWithNim } from "@/lib/supabase";
import { saveSession, type Session } from "@/lib/session";

export default function LoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (session: Session) => void;
}) {
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nim.trim() || !password) {
      setError("NIM dan kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await loginWithNim(nim, password);
      const session: Session = {
        token: result.token,
        user: result.user,
      };
      saveSession(session);
      onLoggedIn(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "NIM atau kata sandi salah."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Dasbor Kehadiran</CardTitle>
          <CardDescription>
            Masuk dengan NIM dan kata sandi untuk mengelola sesi presensi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nim">NIM</Label>
              <Input
                id="nim"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 211420108"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Memeriksa..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
