"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionList } from "@/components/user/transaction-list";

const plans = [
  { amount: 50, credits: 50, price: 15, name: "基础包", desc: "适合轻度使用" },
  { amount: 120, credits: 120, price: 30, name: "进阶包", desc: "适合日常创作" },
  { amount: 300, credits: 300, price: 60, name: "专业包", desc: "适合批量生产" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/user/me");
      return res.json();
    },
  });

  const user = data?.data?.user;
  const currentCredits = user?.credits ?? 0;

  const handleRecharge = async (amount: number) => {
    try {
      const res = await fetch("/api/user/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        toast.error(json.message ?? "充值失败");
        return;
      }
      toast.success(`充值成功，获得 ${json.data.creditsAdded} 积分`);
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
    } catch {
      toast.error("网络错误，请重试");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      {isLoading ? (
        <div className="space-y-4 mb-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : (
        <p className="text-muted-foreground mb-8">
          当前积分：<span className="text-foreground font-bold text-lg">{currentCredits}</span>
        </p>
      )}

      <h2 className="text-lg font-semibold mb-4">充值套餐</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {plans.map((plan) => (
          <Card key={plan.amount}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold">{plan.credits} <span className="text-base font-normal text-muted-foreground">积分</span></p>
                <p className="text-sm text-muted-foreground">¥{plan.price}</p>
              </div>
              <Button
                className="w-full"
                onClick={() => handleRecharge(plan.amount)}
                disabled={isLoading}
              >
                立即充值
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <TransactionList />
    </div>
  );
}
