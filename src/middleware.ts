import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyCrmSession,
} from "@/lib/crm-session";

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/invitation",
];

const PASSWORD_CHANGE_PATH = "/admin/compte";

async function getSession(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  return verifyCrmSession(sessionToken, secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await getSession(request);
  if (!session) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (
    session.mustChangePassword &&
    pathname !== PASSWORD_CHANGE_PATH &&
    !pathname.startsWith(`${PASSWORD_CHANGE_PATH}/`)
  ) {
    const account = new URL(PASSWORD_CHANGE_PATH, request.url);
    account.searchParams.set("required", "1");
    return NextResponse.redirect(account);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
