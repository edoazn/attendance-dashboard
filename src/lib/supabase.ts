import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Client dibuat malas agar salah konfigurasi tampil sebagai pesan, bukan layar putih. */
function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Konfigurasi Supabase belum diisi. Salin .env.example menjadi .env lalu restart dev server."
    );
  }
  cached = createClient(supabaseUrl, supabaseAnonKey);
  return cached;
}

export interface DashboardUser {
  id: string;
  identity_number: string;
  name: string;
  email: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
}

interface LoginSuccess {
  token: string;
  user: DashboardUser;
}

/** Login via Edge Function login-with-nim. Error selalu generik (anti-enumerasi). */
export async function loginWithNim(
  nim: string,
  password: string
): Promise<LoginSuccess> {
  const { data, error } = await getSupabase().functions.invoke(
    "login-with-nim",
    {
      body: { nim: nim.trim(), password },
    }
  );
  if (error) {
    throw new Error("NIM atau kata sandi salah.");
  }
  if (!data || typeof data !== "object" || !("token" in data)) {
    const pesan =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "NIM atau kata sandi salah.";
    throw new Error(pesan);
  }
  return data as LoginSuccess;
}
