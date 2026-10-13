import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. Salin .env.example menjadi .env."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const { data, error } = await supabase.functions.invoke("login-with-nim", {
    body: { nim: nim.trim(), password },
  });
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
