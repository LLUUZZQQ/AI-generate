"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const sendReset = async () => {
    if (!email) { setError("请输入邮箱"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setDone(true);
        if (json.data?.devToken) setError(`[DEV] 重置链接: /forgot-password?token=${json.data.devToken}`);
      } else {
        setError(json.message || "发送失败");
      }
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("密码至少6位"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (json.code === 0) {
        alert("密码重置成功，请登录");
        router.push("/login");
      } else {
        setError(json.message);
      }
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  // Step 2: reset password form
  if (token) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <form onSubmit={resetPassword} className="w-full max-w-sm glass p-6 space-y-4">
          <div className="text-center mb-4">
            <h1 className="text-lg font-semibold">设置新密码</h1>
          </div>
          <div>
            <label className="text-[11px] font-medium text-foreground/30 mb-1.5 block">新密码</label>
            <Input type="password" placeholder="至少6位" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="bg-white/[0.02] border-border h-10 rounded-xl" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 border-0" disabled={loading}>
            {loading ? "重置中..." : "重置密码"}
          </Button>
        </form>
      </div>
    );
  }

  // Step 1: enter email
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">
            <span className="gradient-text">Frame</span><span className="text-foreground/70">Craft</span>
          </h1>
          <p className="text-xs text-foreground/25">忘记密码</p>
        </div>

        {done ? (
          <div className="glass p-6 text-center space-y-3">
            <p className="text-sm text-white/60">重置链接已发送至</p>
            <p className="text-sm font-medium text-white/80">{email}</p>
            <p className="text-xs text-white/30">请检查邮箱，链接 30 分钟有效</p>
            {error && <p className="text-xs text-purple-400 mt-2">{error}</p>}
          </div>
        ) : (
          <div className="glass p-6 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-foreground/30 mb-1.5 block">注册邮箱</label>
              <Input type="email" placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="bg-white/[0.02] border-border h-10 rounded-xl" />
            </div>
            {error && !error.includes("[DEV]") && <p className="text-xs text-red-400">{error}</p>}
            {error && error.includes("[DEV]") && <p className="text-xs text-purple-400">{error}</p>}
            <Button onClick={sendReset} disabled={loading}
              className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 border-0">
              {loading ? "发送中..." : "发送重置链接"}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-white/20 mt-4">
          <Link href="/login" className="text-purple-400 hover:text-purple-300">返回登录</Link>
        </p>
      </div>
    </div>
  );
}
