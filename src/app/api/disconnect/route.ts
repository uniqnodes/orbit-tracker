import { NextResponse } from "next/server";
import { sessionCookieName, sessionStore } from "@/adapters/session/session-store";

export async function POST(request: Request) {
  await sessionStore().delete(request.headers.get("cookie")?.match(/(?:^|;\\s*)orbit_session=([^;]+)/)?.[1]);
  const response = NextResponse.redirect(new URL("/?connection=disconnected", request.url), 303);
  response.cookies.delete(sessionCookieName);
  return response;
}
