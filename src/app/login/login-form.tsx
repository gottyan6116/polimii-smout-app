"use client";

import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";

const field =
  "h-11 w-full rounded-[10px] border border-white/80 bg-white/75 px-3.5 text-[15px] text-fg shadow-[inset_0_1px_2px_rgba(22,34,58,0.06)] placeholder:text-fg-3/70 transition-colors duration-150 hover:bg-white/90 focus:border-accent-strong focus:bg-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-strong";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    // 入力値は送信時にだけ読む（React の制御コンポーネントにすると value 属性にパスワードが残るため）
    const form = new FormData(e.currentTarget);
    const id = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    if (!id.trim() || !password) {
      setError("IDとパスワードを入力してください。");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "ログインできませんでした。時間をおいて再度お試しください。");
        setPending(false);
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch {
      setError("通信できませんでした。ネットワークを確認してください。");
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-id" className="block text-[13px] font-medium text-fg-2">
          ID（メールアドレス）
        </label>
        <input
          id="login-id"
          name="username"
          type="email"
          inputMode="email"
          autoComplete="username"
          className={field}
          placeholder="name@example.jp"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-[13px] font-medium text-fg-2">
          パスワード
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className={cn(field, "pr-11")}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "パスワードを隠す" : "パスワードを表示する"}
            aria-pressed={show}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-fg-3 hover:bg-white/80 hover:text-fg"
          >
            {show ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
          </button>
        </div>
      </div>

      <p id="login-error" role="alert" aria-live="assertive" className={cn("min-h-5 text-[13px] leading-5 text-danger", !error && "invisible")}>
        {error ?? "　"}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-accent-strong text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(20,90,63,0.3),0_8px_20px_-8px_rgba(20,90,63,0.55)] transition-colors duration-150 hover:bg-accent-hover active:bg-accent-ink disabled:opacity-70"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
        {pending ? "確認しています…" : "ログイン"}
      </button>
    </form>
  );
}
