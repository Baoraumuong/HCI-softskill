import { createSupabaseServerClient } from "./lib/supabase/server-client";
import { isSupabaseNetworkError } from "./lib/supabase/errors";
import EmailPassword from "@/components/EmailPassword";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch((error) => {
    if (!isSupabaseNetworkError(error)) {
      throw error;
    }

    console.warn("[/] Supabase is unreachable. Rendering logged-out state.");
    return { data: { user: null } };
  });

  return <EmailPassword user={user} />;
}
