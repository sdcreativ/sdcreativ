import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { getAlternatePath, isEnglishPath } from "@/i18n/routes";
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

function redirectToLogin(request: NextRequest, from: string) {
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("from", from);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Captures statiques : servies sans auth (optimiseur Next.js + chargement tablette/mobile).
  if (pathname.startsWith("/presentation/captures/")) {
    return NextResponse.next();
  }

  // EN suspendu : toute URL /en → équivalent FR (code EN conservé pour plus tard).
  if (!isEnglishLocaleEnabled() && isEnglishPath(pathname)) {
    const frPath = getAlternatePath(pathname, "fr");
    const url = request.nextUrl.clone();
    url.pathname = frPath;
    return NextResponse.redirect(url, 308);
  }

  const isAdmin = pathname.startsWith("/admin");
  const isPresentation = pathname.startsWith("/presentation");

  if (!isAdmin && !isPresentation) {
    return NextResponse.next();
  }

  if (isAdmin) {
    const isPublic = PUBLIC_ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (isPublic) {
      return NextResponse.next();
    }
  }

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await getSession(request);
  if (!session) {
    return redirectToLogin(request, pathname);
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
  matcher: [
    "/en",
    "/en/:path*",
    "/admin/:path*",
    "/presentation",
    "/presentation/:path*",
  ],
};
