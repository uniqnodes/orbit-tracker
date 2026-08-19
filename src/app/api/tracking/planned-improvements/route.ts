import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { BranchChangedError } from "@/core/domain/provider";
import { savePlannedImprovementStatus } from "@/lib/tracking/remote";

const statuses = ["backlog", "in_progress", "blocked", "completed"] as const;

export async function PATCH(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(/(?:^|;\\s*)orbit_session=([^;]+)/)?.[1];
  const session = await sessionStore().get(sessionId);
  if (!session) return Response.json({ error: "Connect a provider before saving." }, { status: 401 });
  const input = await request.json() as { project?: string; branch?: string; expectedBranchCommit?: string; recordId?: string; status?: string };
  const project = allowedProjects().find((candidate) => candidate.provider === session.account.provider && candidate.slug === input.project);
  if (!project || !input.branch || !input.expectedBranchCommit || !input.recordId || !isStatus(input.status)) {
    return Response.json({ error: "The requested tracking update is invalid." }, { status: 400 });
  }
  try {
    const branch = await savePlannedImprovementStatus({ project, accessToken: session.token.accessToken, branch: input.branch, expectedBranchCommit: input.expectedBranchCommit, recordId: input.recordId, status: input.status });
    return Response.json({ branch });
  } catch (error) {
    if (error instanceof BranchChangedError || error instanceof Error && error.message.includes("Reload before saving")) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Tracking update failed." }, { status: 500 });
  }
}

function isStatus(value: string | undefined): value is (typeof statuses)[number] {
  return statuses.includes(value as (typeof statuses)[number]);
}
