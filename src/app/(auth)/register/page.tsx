"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/register");
      const json = await res.json();
      if (json.code === 0) {
        setCaptchaId(json.data.captchaId);
        setCaptchaCode(json.data.captcha);
      }
    } catch {}
  };

  useEffect(() => { fetchCaptcha(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { setError("用户名至少2个字符"); return; }
    if (password.length < 6) { setError("密码至少6位"); return; }
    if (captcha.length !== 4) { setError("请输入4位验证码"); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-captcha-id": captchaId },
        body: JSON.stringify({ name: name.trim(), email, password, captcha }),
      });
      const json = await res.json();
      if (json.code !== 0) { setError(json.message); fetchCaptcha(); setCaptcha(""); return; }

      // Auto login after register
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) { router.push("/trends"); }
      else { router.push("/login"); }
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2"><span className="gradient-text">AI</span>爆款</h1>
          <p className="text-sm text-white/30">注册即送 20 积分</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">用户名</label>
            <Input placeholder="你的昵称" value={name}
              onChange={(e) => setName(e.target.value)} required
              className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">邮箱</label>
            <Input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">密码</label>
            <Input type="password" placeholder="至少6位" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">验证码</label>
            <div className="flex gap-2">
              <Input placeholder="4位数字" value={captcha} maxLength={4}
                onChange={(e) => setCaptcha(e.target.value.replace(/\D/g, ""))} required
                className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg flex-1" />
              <button type="button" onClick={fetchCaptcha}
                className="h-10 px-3 rounded-lg text-sm font-bold tracking-[4px] bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-purple-400 select-none">
                {captchaCode || "----"}
              </button>
            </div>
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
