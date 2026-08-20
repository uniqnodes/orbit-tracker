import { allowedProjects } from "@/adapters/config/provider-config";
import { sessionStore } from "@/adapters/session/session-store";
import { closeLegacyCleanupRecord } from "@/lib/tracking/remote";
import { z } from "zod";

const closeSchema = z.object({
  id: z.string().regex(/^LEG-\d{3}$/),
  evidence: z.string().trim().min(1),
  developmentLogIds: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(/(?:^|;\s*)orbit_session=([^;]+)/)?.[1];
  const session = await sessionStore().get(sessionId);
  const input = await request.json();
  const close = closeSchema.safeParse(input);
  const project = session && allowedProjects().find((item) => item.provider === session.account.provider && item.slug === input.project);

  if (!session || !project || !close.success || !input.branch || !input.expectedBranchCommit) {
    return Response.json({ error: "Invalid legacy-cleanup closure." }, { status: 400 });
  }

  try {
    const branch = await closeLegacyCleanupRecord({
      project,
      accessToken: session.token.accessToken,
      branch: input.branch,
      expectedBranchCommit: input.expectedBranchCommit,
      ...close.data,
    });
    return Response.json({ branch });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Legacy closure failed." }, { status: 500 });
  }
}
