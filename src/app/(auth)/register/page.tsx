"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await signIn("credentials", { email, password: "admin123", redirect: false });
    if (result?.ok) { router.push("/trends"); }
    else { setError("注册失败，请重试"); }
    setLoading(false);
  };

  const handleGitHub = () => signIn("github", { callbackUrl: "/trends" });

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2"><span className="gradient-text">AI</span>爆款</h1>
          <p className="text-sm text-white/30">注册即送 20 积分</p>
        </div>

        <Button onClick={handleGitHub} variant="outline" size="lg"
          className="w-full h-12 border-white/10 hover:bg-white/[0.03] mb-3 text-sm rounded-full">
          <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          使用 GitHub 注册
        </Button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] text-white/20">或</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-white/40 mb-1.5 block">邮箱</label>
            <Input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="bg-white/[0.03] border-white/[0.08] h-10 rounded-lg" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 border-0" disabled={loading}>
            {loading ? "处理中..." : "注册领取 20 积分"}
          </Button>
        </form>
        <p className="text-center text-xs text-white/20 mt-4">
          已有账号？<Link href="/login" className="text-purple-400 hover:text-purple-300">登录</Link>
        </p>
      </div>
    </div>
  );
}
