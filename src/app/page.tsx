import { loadDemoProject } from "@/lib/tracking/load-demo";
import { cookies } from "next/headers";
import { sessionStore } from "@/adapters/session/session-store";
import { providerLabel } from "@/core/domain/provider";

type HomeProps = { searchParams: Promise<{ connection?: string }> };

export default async function Home({ searchParams }: HomeProps) {
  const project = await loadDemoProject();
  const sessionId = (await cookies()).get("orbit_session")?.value;
  const session = sessionId ? await sessionStore().get(sessionId) : null;
  const { connection } = await searchParams;

  return (
    <main>
      <p className="eyebrow">Operational Repository Branch Insight Tracker</p>
      <h1>ORBIT</h1>
      <p className="lede">Git-native project tracking, starting with a safe local fixture and provider connection.</p>
      <section>
        <h2>{project.project.name}</h2>
        <p>Fixture loaded successfully. Remote tracking YAML reads and writes are the next slice.</p>
        <p><strong>{project.services.length}</strong> service in the project manifest.</p>
      </section>
      <section>
        <h2>Provider connection</h2>
        {connection ? <p className="notice">Connection result: {connection.replaceAll("-", " ")}.</p> : null}
        {session ? (
          <>
            <p>
              Connected to <strong>{providerLabel(session.account.provider)}</strong> as <strong>{session.account.login}</strong>
              {session.account.displayName ? ` (${session.account.displayName})` : ""}.
            </p>
            <form action="/api/disconnect" method="post">
              <button type="submit" className="secondary">Disconnect</button>
            </form>
          </>
        ) : (
          <div className="actions">
            {/* OAuth routes leave this origin; client-side RSC navigation is inappropriate. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button" href="/api/connect/gitlab">Connect GitLab</a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button secondary" href="/api/connect/github">Connect GitHub</a>
          </div>
        )}
      </section>
    </main>
  );
}
