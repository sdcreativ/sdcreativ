import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  verifyCrmSession,
} from "@/lib/crm-session";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  if (request.cookies.get(LEGACY_ADMIN_COOKIE)?.value === secret) return true;

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) return false;
  return (await verifyCrmSession(session, secret)) !== null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/invitation")) {
    if (!process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!(await isAuthenticated(request))) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
