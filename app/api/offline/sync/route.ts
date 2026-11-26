import { createClient } from "@/lib/supabase/server";
import { handleTaskSync } from "@/lib/offline/api-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  return handleTaskSync(request, supabase);
}
