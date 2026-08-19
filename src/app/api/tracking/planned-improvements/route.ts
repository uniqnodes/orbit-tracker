import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { BranchChangedError } from "@/core/domain/provider";
import { savePlannedImprovement, savePlannedImprovementStatus } from "@/lib/tracking/remote";
import { z } from "zod";

const statuses = ["backlog", "in_progress", "blocked", "completed"] as const;
const draftSchema = z.object({ id: z.string().regex(/^PI-\d{3}$/).optional(), title: z.string().min(1), status: z.enum(statuses), priority: z.enum(["low", "medium", "high"]), categories: z.array(z.string()).min(1), summary: z.string().min(1), goal: z.string().min(1), scope: z.object({ services: z.array(z.string()), components: z.array(z.string()), areas: z.array(z.string()) }), relationships: z.object({ proposalIds: z.array(z.string()), developmentLogIds: z.array(z.string()), legacyCleanupIds: z.array(z.string()) }) });

export async function PATCH(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(/(?:^|;\\s*)orbit_session=([^;]+)/)?.[1];
  const session = await sessionStore().get(sessionId);
  if (!session) return Response.json({ error: "Connect a provider before saving." }, { status: 401 });
  const input = await request.json() as { project?: string; branch?: string; expectedBranchCommit?: string; recordId?: string; status?: string; record?: unknown };
  const project = allowedProjects().find((candidate) => candidate.provider === session.account.provider && candidate.slug === input.project);
  const record = draftSchema.safeParse(input.record);
  if (!project || !input.branch || !input.expectedBranchCommit || (!record.success && (!input.recordId || !isStatus(input.status)))) {
    return Response.json({ error: "The requested tracking update is invalid." }, { status: 400 });
  }
  try {
    if (record.success) {
      const branch = await savePlannedImprovement({ project, accessToken: session.token.accessToken, branch: input.branch, expectedBranchCommit: input.expectedBranchCommit, record: record.data });
      return Response.json({ branch });
    }
    if (!input.recordId || !isStatus(input.status)) return Response.json({ error: "The requested tracking update is invalid." }, { status: 400 });
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
