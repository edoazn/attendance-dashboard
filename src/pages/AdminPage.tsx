import { useState } from "react";
import { Button } from "@/components/ui/button";
import PermitsTab from "@/pages/admin/PermitsTab";
import RecapTab from "@/pages/admin/RecapTab";
import SchedulesTab from "@/pages/admin/SchedulesTab";
import UsersTab from "@/pages/admin/UsersTab";
import type { Session } from "@/lib/session";

const TABS = [
  { id: "jadwal", label: "Jadwal" },
  { id: "pengguna", label: "Pengguna" },
  { id: "izin", label: "Izin" },
  { id: "rekap", label: "Rekap" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const { token, user } = session;
  const [tab, setTab] = useState<TabId>("jadwal");

  return (
    <div className="min-h-svh bg-muted">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold">Dasbor Admin</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} — NIM {user.identity_number}
            </p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {tab === "jadwal" && <SchedulesTab token={token} />}
        {tab === "pengguna" && <UsersTab token={token} />}
        {tab === "izin" && <PermitsTab token={token} />}
        {tab === "rekap" && <RecapTab token={token} />}
      </main>
    </div>
  );
}
