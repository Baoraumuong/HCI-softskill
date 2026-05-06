import { createSupabaseServerClient } from "./lib/supabase/server-client";
import EmailPassword from "@/components/EmailPassword";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <EmailPassword user={user} />;
}