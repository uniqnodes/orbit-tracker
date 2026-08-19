import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { BranchChangedError } from "@/core/domain/provider";
import { saveDevelopmentLog } from "@/lib/tracking/remote";
import { z } from "zod";

const recordSchema = z.object({ id: z.string().optional(), title: z.string().min(1), categories: z.array(z.string()).min(1), reasonType: z.string().min(1), reasonSummary: z.string().min(1), details: z.string().min(1), systemImpact: z.array(z.string()), scope: z.object({ services: z.array(z.string()), components: z.array(z.string()), areas: z.array(z.string()) }), relationships: z.object({ plannedImprovementIds: z.array(z.string()), proposalIds: z.array(z.string()), legacyCleanupIds: z.array(z.string()) }) });
export async function PATCH(request: Request) {
  const session = await sessionStore().get(request.headers.get("cookie")?.match(/(?:^|;\\s*)orbit_session=([^;]+)/)?.[1]); if (!session) return Response.json({ error: "Connect a provider before saving." }, { status: 401 });
  const input = await request.json() as { project?: string; branch?: string; expectedBranchCommit?: string; record?: unknown }; const record = recordSchema.safeParse(input.record); const project = allowedProjects().find((candidate) => candidate.provider === session.account.provider && candidate.slug === input.project);
  if (!project || !input.branch || !input.expectedBranchCommit || !record.success) return Response.json({ error: "The requested development-log update is invalid." }, { status: 400 });
  try { return Response.json({ branch: await saveDevelopmentLog({ project, accessToken: session.token.accessToken, branch: input.branch, expectedBranchCommit: input.expectedBranchCommit, record: record.data }) }); } catch (error) { const message = error instanceof Error ? error.message : "Development-log update failed."; return Response.json({ error: message }, { status: error instanceof BranchChangedError || message.includes("Reload before saving") ? 409 : 500 }); }
}
