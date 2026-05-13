"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionList } from "@/components/user/transaction-list";
import { User, Mail, Clock, Shield, Lock, Eye, EyeOff, Coins } from "lucide-react";

const plans = [
  { amount: 100, credits: 100, price: 10, name: "入门包", desc: "处理 100 张" },
  { amount: 500, credits: 500, price: 45, name: "进阶包", desc: "处理 500 张", rec: true },
  { amount: 2000, credits: 2000, price: 160, name: "专业包", desc: "处理 2000 张" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  if (searchParams.get("paid") === "1") {
    setTimeout(() => {
      toast.success("支付成功！积分将在几秒后到账");
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
    }, 500);
  }
  const [tab, setTab] = useState<"account" | "billing">(
    searchParams.get("tab") === "billing" ? "billing" : "account"
  );
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [paying, setPaying] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editingName, setEditingName] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });
  const user = data?.data?.user;
  const credits = user?.credits ?? 0;

  const updateProfile = async (payload: any) => {
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.code === 0) { toast.success(json.data?.message || json.data?.name ? "昵称已更新" : "已更新"); refetch(); return true; }
    toast.error(json.message || "操作失败");
    return false;
  };

  const handleSaveName = async () => {
    if (editName.trim().length < 2) { toast.error("昵称至少2个字符"); return; }
    const ok = await updateProfile({ name: editName });
    if (ok) setEditingName(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword) { toast.error("请输入旧密码"); return; }
    if (newPassword.length < 6) { toast.error("新密码至少6位"); return; }
    setChangingPw(true);
    const ok = await updateProfile({ oldPassword, newPassword });
    if (ok) { setOldPassword(""); setNewPassword(""); }
    setChangingPw(false);
  };

  const handleRecharge = async () => {
    if (!selectedPlan) return;
    setPaying(true);
    try {
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planAmount: selectedPlan.amount }),
      });
      const json = await res.json();
      if (json.code !== 0 || !json.data.url) {
        toast.error(json.message ?? "创建支付失败");
        return;
      }
      window.location.href = json.data.url;
    } catch { toast.error("网络错误"); }
    finally { setPaying(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">个人中心</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[{ k: "account", icon: User, label: "账户信息" }, { k: "billing", icon: Coins, label: "充值中心" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              tab === t.k ? "bg-purple-500/15 border border-purple-400/30 text-purple-300" : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (<>
      {/* Account Info Card */}
      <h3 className="text-xs font-semibold text-foreground/25 uppercase tracking-wider mb-4">账户信息</h3>
      {isLoading ? <Skeleton className="h-40 w-full rounded-2xl mb-10" /> : user && (
        <div className="glass p-5 mb-10 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-white/25" />
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white/80 w-40" />
                <button onClick={handleSaveName} className="text-xs text-purple-400 hover:text-purple-300">保存</button>
                <button onClick={() => setEditingName(false)} className="text-xs text-white/30 hover:text-white/50">取消</button>
              </div>
            ) : (
              <>
                <span className="text-sm text-white/70">{user.name || "未设置"}</span>
                <button onClick={() => { setEditName(user.name || ""); setEditingName(true); }}
                  className="text-xs text-white/25 hover:text-purple-400">编辑</button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-white/25" />
            <span className="text-sm text-white/50">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-white/25" />
            <span className="text-sm text-white/50">{user.role === "admin" ? "管理员" : "普通用户"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-white/25" />
            <span className="text-sm text-white/40">{new Date(user.createdAt).toLocaleDateString("zh-CN")} 注册</span>
          </div>
          <div className="pt-2 border-t border-white/[0.05]">
            <span className="text-sm text-white/30">当前积分 </span>
            <span className="text-lg font-bold text-white/80">{credits.toLocaleString()}</span>
            <span className="text-xs text-white/20 ml-2">总消费 ￥{((user.totalSpent || 0) / 10).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">消费等级</span>
            {(() => {
              const spent = (user.totalSpent || 0) / 10;
              if (spent >= 500) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">💎 钻石会员</span>;
              if (spent >= 200) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">🥇 金牌会员</span>;
              if (spent >= 50) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-300">🥈 银牌会员</span>;
              return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-400">🥉 铜牌会员</span>;
            })()}
          </div>
        </div>
      )}

      {/* Change Password */}
      <h3 className="text-xs font-semibold text-foreground/25 uppercase tracking-wider mb-4">修改密码</h3>
      <div className="glass p-5 mb-10 space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type={showOld ? "text" : "password"} placeholder="旧密码" value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg pl-10 pr-10 py-2.5 text-sm text-white/80 focus:outline-none focus:border-purple-400/40" />
          <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
            {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type={showNew ? "text" : "password"} placeholder="新密码（至少6位）" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg pl-10 pr-10 py-2.5 text-sm text-white/80 focus:outline-none focus:border-purple-400/40" />
          <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button size="sm" onClick={handleChangePassword} disabled={changingPw}
          className="bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 rounded-xl h-9">
          {changingPw ? "修改中..." : "修改密码"}
        </Button>
      </div>

      </>)}

      {tab === "billing" && (<>
      {/* Recharge */}
      <h3 className="text-xs font-semibold text-foreground/25 uppercase tracking-wider mb-4">充值套餐</h3>
      <div className="grid grid-cols-3 gap-3 mb-10">
        {plans.map((plan) => (
          <button key={plan.amount} onClick={() => setSelectedPlan(plan)} className={`glass p-5 text-left ${plan.rec ? "relative overflow-hidden" : ""}`}>
            {plan.rec && <div className="absolute top-0 right-0 text-[9px] px-2 py-0.5 rounded-bl-2xl bg-purple-500/15 text-purple-300">推荐</div>}
            <p className="text-sm font-semibold mb-2">{plan.name}</p>
            <p className="text-2xl font-bold mb-1">{plan.credits}<span className="text-xs font-normal text-white/30 ml-0.5">积分</span></p>
            <p className="text-[10px] text-foreground/15">{plan.desc} · ¥{plan.price}</p>
          </button>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">积分流水</h3>
      <div className="glass rounded-xl p-4">
        <TransactionList />
      </div>

      </>)}

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="glass border-border !bg-background/95">
          <DialogHeader>
            <DialogTitle className="text-foreground">确认充值</DialogTitle>
            <DialogDescription className="text-foreground/30">
              {selectedPlan && <>{selectedPlan.name} — {selectedPlan.credits} 积分 / ¥{selectedPlan.price}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground/25 space-y-1 py-2">
            <p>支付方式：Stripe</p>
            <p>充值后积分即时到账，可用于背景替换</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="border-border rounded-xl" onClick={() => setSelectedPlan(null)} disabled={paying}>取消</Button>
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-xl" onClick={handleRecharge} disabled={paying}>
              {paying ? "支付处理中..." : `确认支付 ¥${selectedPlan?.price ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
