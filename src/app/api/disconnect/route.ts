import { NextResponse } from "next/server";
import { deleteSession, sessionCookieName } from "@/adapters/session/local-session";

export async function POST(request: Request) {
  deleteSession(request.headers.get("cookie")?.match(/(?:^|;\\s*)orbit_session=([^;]+)/)?.[1]);
  const response = NextResponse.redirect(new URL("/?connection=disconnected", request.url), 303);
  response.cookies.delete(sessionCookieName);
  return response;
}
