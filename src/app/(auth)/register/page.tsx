"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { setError("用户名至少2个字符"); return; }
    if (password.length < 6) { setError("密码至少6位"); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message); return; }

      // Auto login after register
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) { router.push("/dashboard"); }
      else { setError("注册成功但自动登录失败，请前往登录页"); }
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">
            <span className="gradient-text">Frame</span><span className="text-foreground/70">Craft</span>
          </h1>
          <p className="text-xs text-foreground/25">注册即送 20 积分</p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-6 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-foreground/30 mb-1.5 block">用户名</label>
            <Input placeholder="你的昵称" value={name}
              onChange={(e) => setName(e.target.value)} required
              className="bg-white/[0.02] border-border h-10 rounded-xl" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-foreground/30 mb-1.5 block">邮箱</label>
            <Input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="bg-white/[0.02] border-border h-10 rounded-xl" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-foreground/30 mb-1.5 block">密码</label>
            <Input type="password" placeholder="至少6位" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="bg-white/[0.02] border-border h-10 rounded-xl" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 border-0" disabled={loading}>
            {loading ? "注册中..." : "注册 · 领取 20 积分"}
          </Button>
        </form>
        <p className="text-center text-xs text-white/20 mt-4">
          已有账号？<Link href="/login" className="text-purple-400 hover:text-purple-300">登录</Link>
        </p>
      </div>
    </div>
  );
}
