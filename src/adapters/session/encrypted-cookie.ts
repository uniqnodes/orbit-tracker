import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "../config/provider-config";

function base64url(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url input.");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new Error("Non-canonical base64url input.");
  return decoded;
}

export function sign(value: string) {
  const signature = createHmac("sha256", sessionSecret()).update(value).digest();
  return `${value}.${base64url(signature)}`;
}

export function verify(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;

  const payload = value.slice(0, separator);
  let supplied: Buffer;
  try {
    supplied = decode(value.slice(separator + 1));
  } catch {
    return null;
  }
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return payload;
}
