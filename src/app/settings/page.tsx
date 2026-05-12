"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionList } from "@/components/user/transaction-list";

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
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [paying, setPaying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });
  const credits = data?.data?.user?.credits ?? 0;

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
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-purple-400 font-medium mb-2 tracking-wider uppercase">Settings</p>
        <h1 className="text-2xl font-bold">设置</h1>
      </div>

      {isLoading ? (
        <Skeleton className="h-6 w-32 bg-white/[0.03] mb-8" />
      ) : (
        <p className="text-sm text-white/40 mb-8">
          当前积分 <span className="text-white font-bold text-lg ml-1">{credits.toLocaleString()}</span>
        </p>
      )}

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">充值套餐</h3>
      <div className="grid grid-cols-3 gap-3 mb-10">
        {plans.map((plan) => (
          <button key={plan.amount} onClick={() => setSelectedPlan(plan)} className={`glass rounded-xl p-5 text-left hover:border-white/15 transition-all ${plan.rec ? "relative overflow-hidden" : ""}`}>
            {plan.rec && <div className="absolute top-0 right-0 text-[9px] px-2 py-0.5 rounded-bl-lg bg-purple-500/20 text-purple-300">推荐</div>}
            <p className="text-sm font-semibold mb-2">{plan.name}</p>
            <p className="text-2xl font-bold mb-1">{plan.credits}<span className="text-xs font-normal text-white/30 ml-0.5">积分</span></p>
            <p className="text-[10px] text-white/20">{plan.desc} · ¥{plan.price}</p>
          </button>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">积分流水</h3>
      <div className="glass rounded-xl p-4">
        <TransactionList />
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="glass border-white/10 !bg-background/95">
          <DialogHeader>
            <DialogTitle>确认充值</DialogTitle>
            <DialogDescription className="text-white/40">
              {selectedPlan && <>{selectedPlan.name} — {selectedPlan.credits} 积分 / ¥{selectedPlan.price}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground/30 space-y-1 py-2">
            <p>支付方式：Stripe</p>
            <p>充值后积分即时到账，可用于背景替换</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="border-white/10" onClick={() => setSelectedPlan(null)} disabled={paying}>取消</Button>
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0" onClick={handleRecharge} disabled={paying}>
              {paying ? "支付处理中..." : `确认支付 ¥${selectedPlan?.price ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
