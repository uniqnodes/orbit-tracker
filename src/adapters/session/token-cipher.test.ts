import { afterEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./token-cipher";

const original = process.env.ORBIT_TOKEN_ENCRYPTION_SECRET;

afterEach(() => {
  process.env.ORBIT_TOKEN_ENCRYPTION_SECRET = original;
});

describe("provider token encryption", () => {
  it("round-trips a token and rejects a modified ciphertext", () => {
    process.env.ORBIT_TOKEN_ENCRYPTION_SECRET = "a-separate-local-test-secret-that-is-long-enough";
    const encrypted = encryptToken("provider-token");

    expect(encrypted).not.toContain("provider-token");
    expect(decryptToken(encrypted)).toBe("provider-token");
    expect(() => decryptToken(`${encrypted}x`)).toThrow();
  });
});
