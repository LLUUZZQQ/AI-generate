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
  { amount: 1, credits: 1, price: 1, name: "试用体验", desc: "¥1.00/张", savings: "", trial: true },
  { amount: 100, credits: 100, price: 12, name: "入门体验", desc: "¥0.12/张", savings: "" },
  { amount: 500, credits: 500, price: 45, name: "高效创作", desc: "¥0.09/张", savings: "省 ¥15", rec: true, badge: "🔥 最受欢迎" },
  { amount: 2000, credits: 2000, price: 168, name: "专业生产", desc: "¥0.084/张", savings: "省 ¥72", badge: "💎 最划算" },
];

function PaymentHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => { const r = await fetch("/api/pay/submit"); return r.json(); },
    refetchInterval: 15000,
  });
  const payments = data?.data?.payments ?? [];

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (payments.length === 0) return <p className="text-xs text-white/15 py-3">暂无充值记录</p>;

  return (
    <div className="space-y-2">
      {payments.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-sm text-white/60">¥{p.amount} → {p.credits} 积分</span>
            <span className="text-[10px] text-white/20 ml-2">{p.created_at ? new Date(p.created_at).toLocaleString("zh-CN") : ""}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            p.status === "approved" ? "bg-green-500/10 text-green-400" :
            p.status === "denied" ? "bg-red-500/10 text-red-400" :
            "bg-yellow-500/10 text-yellow-400"
          }`}>
            {p.status === "approved" ? "已到账" : p.status === "denied" ? "未通过" : "审核中"}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrFallback, setQrFallback] = useState<any>(null);

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
      const res = await fetch("/api/pay/alipay-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planAmount: selectedPlan.amount }),
      });
      const json = await res.json();
      if (json.code !== 0) { toast.error(json.message ?? "创建支付失败"); return; }
      if (json.data?.qrcode) {
        setQrCode(json.data.qrcode);
        return;
      }
      if (json.data?.manual) {
        setQrFallback(json.data);
        return;
      }
      toast.error("支付配置异常");
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        {plans.map((plan) => (
          <button key={plan.amount} onClick={() => setSelectedPlan(plan)}
            className={`glass p-4 text-left relative transition-all hover:scale-[1.02] ${
              selectedPlan?.amount === plan.amount ? "ring-1 ring-purple-400/50 bg-purple-500/5" : ""
            }`}>
            {plan.trial && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white whitespace-nowrap shadow-lg shadow-emerald-500/25">
                🆕 新用户体验
              </div>
            )}
            {plan.badge && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2.5 py-0.5 rounded-full bg-purple-500 text-white whitespace-nowrap shadow-lg shadow-purple-500/25">
                {plan.badge}
              </div>
            )}
            <p className="text-xs font-semibold mb-2 mt-0.5">{plan.name}</p>
            <p className="text-2xl font-bold mb-0.5">
              <span className="text-[13px] align-top mr-0.5">¥</span>{plan.price}
            </p>
            <p className="text-[10px] text-foreground/25">{plan.credits} 积分</p>
            <p className="text-[10px] text-white/40 mt-1.5">{plan.desc}</p>
            {plan.savings && (
              <p className="text-[10px] text-green-400/70 mt-0.5">{plan.savings}</p>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/15 text-center mb-10">💡 积分可用于背景替换，1 积分 = 1 张图</p>

      <details className="group" open>
        <summary className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 cursor-pointer select-none hover:text-white/60 transition-colors flex items-center gap-1.5">
          <span className="text-[10px] group-open:rotate-90 transition-transform">▶</span> 我的充值记录
        </summary>
        <PaymentHistory />
      </details>

      <details className="group mt-6" open>
        <summary className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 cursor-pointer select-none hover:text-white/60 transition-colors flex items-center gap-1.5">
          <span className="text-[10px] group-open:rotate-90 transition-transform">▶</span> 积分流水
        </summary>
      <div className="glass rounded-xl p-4">
        <TransactionList />
      </div>
      </details>

      </>)}

      {selectedPlan && !qrCode && !qrFallback && (
        <Dialog open onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="glass border-border !bg-background/95">
            <DialogHeader>
              <DialogTitle className="text-foreground">确认充值</DialogTitle>
              <DialogDescription className="text-foreground/30">
                {selectedPlan.name} · {selectedPlan.credits} 积分 · ¥{selectedPlan.price}{selectedPlan.savings ? `（${selectedPlan.savings}）` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-foreground/25 space-y-1 py-2">
              <p>支付方式：微信 / 支付宝</p>
              <p>支付后积分自动到账</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" className="border-border rounded-xl" onClick={() => setSelectedPlan(null)} disabled={paying}>取消</Button>
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-xl" onClick={handleRecharge} disabled={paying}>
                {paying ? "创建订单..." : `确认支付 ¥${selectedPlan.price}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Payment Dialog */}
      {qrCode && selectedPlan && (
        <Dialog open onOpenChange={() => { setQrCode(null); setSelectedPlan(null); }}>
          <DialogContent className="glass border-border !bg-background/95 text-center">
            <DialogHeader>
              <DialogTitle className="text-foreground">扫码支付</DialogTitle>
              <DialogDescription className="text-foreground/30">
                {selectedPlan.name} — ¥{selectedPlan.price} / {selectedPlan.credits} 积分
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-2">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                alt="支付二维码" className="rounded-xl border border-white/10" />
            </div>
            <p className="text-xs text-foreground/25">微信 / 支付宝 扫码支付</p>
            <DialogFooter>
              <Button variant="outline" size="sm" className="border-border rounded-xl w-full" onClick={() => { setQrCode(null); setSelectedPlan(null); }}>
                已支付，关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual WeChat QR Dialog */}
      {qrFallback && (
        <Dialog open onOpenChange={() => { setQrFallback(null); setSelectedPlan(null); }}>
          <DialogContent className="glass border-border !bg-background/95 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">微信扫码支付</DialogTitle>
              <DialogDescription className="text-foreground/30">
                {selectedPlan?.name} · {selectedPlan?.credits} 积分
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
              {/* QR Code */}
              <div className="relative">
                <img src={qrFallback.qrimg} alt="微信收款码" className="w-52 h-52 rounded-xl border border-white/10" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                  ¥{selectedPlan?.price}
                </span>
              </div>

              {/* Steps */}
              <div className="w-full space-y-2.5 bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/15 text-[10px] flex items-center justify-center text-purple-400 font-medium">1</span>
                  <div>
                    <p className="text-xs text-white/60 font-medium">扫码或保存收款码</p>
                    <p className="text-[10px] text-white/25 mt-0.5">打开微信扫一扫，或截图保存后从相册识别</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/15 text-[10px] flex items-center justify-center text-purple-400 font-medium">2</span>
                  <div>
                    <p className="text-xs text-white/60 font-medium">转账 <span className="text-purple-400 font-semibold">¥{selectedPlan?.price}</span></p>
                    <p className="text-[10px] text-white/25 mt-0.5">请添加备注便于核对</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/15 text-[10px] flex items-center justify-center text-purple-400 font-medium">3</span>
                  <div>
                    <p className="text-xs text-white/60 font-medium">通知管理员审核</p>
                    <p className="text-[10px] text-white/25 mt-0.5">支付后点击下方按钮提交，管理员确认后积分自动到账</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-xl w-full h-10"
                onClick={async () => {
                  if (!selectedPlan) return;
                  const res = await fetch("/api/pay/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: selectedPlan.price, credits: selectedPlan.credits }),
                  });
                  const data = await res.json();
                  if (data.code === 0) toast.success("已提交，管理员审核后将到账");
                  else toast.error(data.message);
                  setQrFallback(null); setSelectedPlan(null);
                }}>
                我已支付，通知管理员审核
              </Button>
              <Button variant="outline" size="sm" className="border-border rounded-xl w-full" onClick={() => { setQrFallback(null); setSelectedPlan(null); }}>
                暂不支付，关闭
              </Button>
              <p className="text-[10px] text-white/20 text-center pt-1">如长时间未到账，请联系微信：UU_L777777</p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
