"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await signIn("credentials", { email, password: "admin123", redirect: false });
    if (result?.ok) { router.push("/trends"); }
    else { setError("登录失败，请重试"); }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2"><span className="gradient-text">AI</span>爆款</h1>
          <p className="text-sm text-white/30">登录你的账号</p>
        </div>
        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">邮箱</label>
            <Input
              type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 border-0" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
        <p className="text-center text-xs text-white/20 mt-4">
          还没有账号？<Link href="/register" className="text-purple-400 hover:text-purple-300">注册</Link>
        </p>
      </div>
    </div>
  );
}
