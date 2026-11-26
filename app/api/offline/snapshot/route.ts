import { createClient } from "@/lib/supabase/server";
import { handleSnapshot } from "@/lib/offline/api-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  return handleSnapshot(request, supabase);
}
