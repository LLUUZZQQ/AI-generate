"use client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionList() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-transactions"],
    queryFn: async () => { const res = await fetch("/api/user/transactions"); return res.json(); },
  });

  const list = data?.data?.list ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="space-y-1"><Skeleton className="h-4 w-32 bg-white/[0.05]" /><Skeleton className="h-3 w-20 bg-white/[0.03]" /></div>
            <Skeleton className="h-4 w-12 bg-white/[0.05]" />
          </div>
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return <p className="text-sm text-white/20 text-center py-8">暂无记录</p>;
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {list.map((tx: any) => (
        <div key={tx.id} className="flex justify-between items-center py-3">
          <div>
            <p className="text-sm">{tx.description || (tx.type === "purchase" ? "充值" : "消费")}</p>
            <p className="text-[10px] text-white/25 mt-0.5">
              {new Date(tx.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-400" : "text-white/40"}`}>
            {tx.amount > 0 ? "+" : ""}{tx.amount}
          </span>
        </div>
      ))}
    </div>
  );
}
