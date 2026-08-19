import { NextRequest, NextResponse } from "next/server";
import { isProviderId } from "@/core/domain/provider";
import { providerFor } from "@/adapters/scm/provider-registry";
import { createSession, sessionCookieName } from "@/adapters/session/local-session";
import { verify } from "@/adapters/session/encrypted-cookie";

const transactionCookieName = "orbit_oauth_transaction";

type Transaction = { provider: string; state: string; codeVerifier?: string };

function redirect(request: NextRequest, result: string) {
  return NextResponse.redirect(new URL(`/?connection=${result}`, request.url));
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider: value } = await context.params;
  if (!isProviderId(value)) return redirect(request, "unknown-provider");

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const signed = request.cookies.get(transactionCookieName)?.value;
  const rawTransaction = signed ? verify(signed) : null;
  const transaction = rawTransaction ? (JSON.parse(rawTransaction) as Transaction) : null;

  if (error || !code || !state || !transaction || transaction.provider !== value || transaction.state !== state) {
    const response = redirect(request, error ? "denied" : "invalid-state");
    response.cookies.delete(transactionCookieName);
    return response;
  }

  try {
    const provider = providerFor(value);
    const token = await provider.exchangeAuthorizationCode({ code, codeVerifier: transaction.codeVerifier });
    const account = await provider.getConnectedAccount(token.accessToken);
    const sessionId = createSession({ provider: value, login: account.login, displayName: account.displayName, token });
    const response = redirect(request, "connected");
    response.cookies.delete(transactionCookieName);
    response.cookies.set({
      name: sessionCookieName,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    const response = redirect(request, "connection-failed");
    response.cookies.delete(transactionCookieName);
    return response;
  }
}
