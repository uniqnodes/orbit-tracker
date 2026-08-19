import { describe, expect, it } from "vitest";
import { LocalSessionStore } from "./local-session";

describe("local session store", () => {
  it("keeps the provider token server-side and removes a disconnected session", async () => {
    const store = new LocalSessionStore();
    const id = await store.create({
      provider: "gitlab",
      login: "orbit-test",
      displayName: "ORBIT Test",
      token: { accessToken: "server-only-token" },
    });

    expect((await store.get(id))?.account.login).toBe("orbit-test");
    await store.delete(id);
    expect(await store.get(id)).toBeNull();
  });
});
