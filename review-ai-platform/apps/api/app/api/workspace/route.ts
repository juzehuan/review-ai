import { ok } from "@/lib/http";
import { serializeWorkspace } from "@/lib/serializers";
import { getWorkspaceContext } from "@/lib/workspace";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (context.response || !context.workspace) {
    return context.response;
  }
  const { workspace } = context;
  return ok(serializeWorkspace(workspace));
}
