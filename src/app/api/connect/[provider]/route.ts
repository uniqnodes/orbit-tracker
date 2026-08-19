import { NextResponse } from "next/server";
import { isProviderId } from "@/core/domain/provider";
import { sign } from "@/adapters/session/encrypted-cookie";
import { providerFor } from "@/adapters/scm/provider-registry";

const transactionCookieName = "orbit_oauth_transaction";

export async function GET(_request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: value } = await context.params;
  if (!isProviderId(value)) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  try {
    const authorization = providerFor(value).beginAuthorization();
    const response = NextResponse.redirect(authorization.authorizationUrl);
    response.cookies.set({
      name: transactionCookieName,
      value: sign(JSON.stringify({ provider: value, ...authorization.transaction })),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?connection=configuration-error", _request.url));
  }
}
