import { afterEach, describe, expect, it } from "vitest";
import { sign, verify } from "./encrypted-cookie";

const original = process.env.ORBIT_SESSION_SECRET;

afterEach(() => {
  process.env.ORBIT_SESSION_SECRET = original;
});

describe("signed transaction cookie", () => {
  it("rejects a modified signed transaction", () => {
    process.env.ORBIT_SESSION_SECRET = "local-test-secret-that-is-long-enough";
    const signed = sign("transaction");

    expect(verify(signed)).toBe("transaction");
    expect(verify(`${signed}x`)).toBeNull();
  });
});
