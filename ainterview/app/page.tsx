import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AuthForm from "@/components/AuthForm";

export default async function Page() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,

        set: (name: string, value: string, options: any) => {
          cookieStore.set({ name, value, ...options });
        },

        // ✅ FIXED: proper deletion
        remove: (name: string) => {
          cookieStore.delete(name);
        },
      },
    }
  );

const { data: { user } } = await supabase.auth.getUser();

if (user) {
  redirect("/configuration");
}

  return <AuthForm />;
}