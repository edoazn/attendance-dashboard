import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AdminPage from "@/pages/AdminPage";
import LecturerPage from "@/pages/LecturerPage";
import LoginPage from "@/pages/LoginPage";
import { clearSession, loadSession, type Session } from "@/lib/session";

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLoggedIn={setSession} />;
  }

  if (session.user.role === "LECTURER") {
    return <LecturerPage session={session} onLogout={handleLogout} />;
  }

  if (session.user.role === "ADMIN") {
    return <AdminPage session={session} onLogout={handleLogout} />;
  }

  const { user } = session;
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Selamat datang, {user.name}</CardTitle>
          <CardDescription>NIM {user.identity_number}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            Dasbor ini khusus untuk dosen dan admin. Silakan gunakan aplikasi
            HP untuk presensi.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
