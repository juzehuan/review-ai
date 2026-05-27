import { deleteCurrentSession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST(request: Request) {
  await deleteCurrentSession(request);
  return ok({ success: true });
}
