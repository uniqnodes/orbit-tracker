import { GitHubProvider } from "@/adapters/github/github-provider";
import { GitLabProvider } from "@/adapters/gitlab/gitlab-provider";
import type { ProviderId } from "@/core/domain/provider";
import type { ScmProvider } from "@/core/ports/scm-provider";

const providers: Record<ProviderId, ScmProvider> = {
  gitlab: new GitLabProvider(),
  github: new GitHubProvider(),
};

export function providerFor(id: ProviderId) {
  return providers[id];
}
