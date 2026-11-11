import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** ログインしていない場合は /login へ。ログイン済みで /login を開いたらホームへ */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authed = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return authed ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!authed) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // 静的ファイルとログインAPIは対象外
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/).*)"],
};
