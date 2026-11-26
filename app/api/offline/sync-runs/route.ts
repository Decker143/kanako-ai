import { createClient } from "@/lib/supabase/server";
import { handleRunSync } from "@/lib/offline/api-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  return handleRunSync(request, supabase);
}
