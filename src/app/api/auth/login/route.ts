import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  let id = "";
  let password = "";
  try {
    const body = (await request.json()) as { id?: unknown; password?: unknown };
    id = typeof body.id === "string" ? body.id : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。もう一度お試しください。" }, { status: 400 });
  }
  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください。" }, { status: 400 });
  }

  const result = checkCredentials(id, password);
  if (result === "unconfigured") {
    return NextResponse.json(
      { error: "ログイン設定が未構成です。管理者が環境変数 DEMO_LOGIN_ID / DEMO_LOGIN_PASSWORD を設定してください。" },
      { status: 503 },
    );
  }
  if (result === "invalid") {
    // 失敗時はわずかに待ってから返す（総当たりの抑止。本番では回数制限が必要）
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "IDまたはパスワードが正しくありません。" }, { status: 401 });
  }

  const token = createSessionToken()!;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
