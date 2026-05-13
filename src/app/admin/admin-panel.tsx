"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, BarChart3, Coins, Image, Search, Edit3, Shield, Loader2, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalUsers: number; totalBGTasks: number; totalBgResults: number;
  totalCreditsConsumed: number; recentUsers: any[]; bgTasksByDay: any[];
}

export function AdminPanel({ stats: initial }: { stats: Stats }) {
  const [tab, setTab] = useState<"overview" | "users">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const searchUsers = useCallback(async (q: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    if (d.code === 0) setUsers(d.data.users);
    setLoading(false);
  }, []);

  useEffect(() => { if (tab === "users") searchUsers(""); }, [tab, searchUsers]);

  const updateUser = async (userId: string, data: any) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...data }),
    });
    const d = await res.json();
    if (d.code === 0) { setEditUser(null); searchUsers(search); return true; }
    toast.error(d.message);
    return false;
  };

  const handleBan = async (userId: string, ban: boolean) => {
    if (!window.confirm(ban ? "确定封禁该用户？" : "确定解封该用户？")) return;
    await updateUser(userId, { banned: ban });
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("确定永久删除该用户？此操作不可撤销！")) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const d = await res.json();
    if (d.code === 0) { toast.success("已删除"); searchUsers(search); }
    else toast.error(d.message);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-purple-400" />
        <h1 className="text-xl font-bold">管理后台</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ k: "overview", icon: BarChart3, label: "数据概览" }, { k: "users", icon: Users, label: "用户管理" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              tab === t.k ? "bg-purple-500/15 border border-purple-400/30 text-purple-300" : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "总用户", value: initial.totalUsers, icon: Users },
              { label: "总任务", value: initial.totalBGTasks, icon: Image },
              { label: "处理结果", value: initial.totalBgResults, icon: BarChart3 },
              { label: "消耗积分", value: initial.totalCreditsConsumed, icon: Coins },
            ].map(s => (
              <div key={s.label} className="glass p-4">
                <s.icon className="w-4 h-4 text-white/20 mb-2" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-white/30 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 7-day task chart */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/50">任务量趋势</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                  className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none focus:border-purple-400/40" />
                <span className="text-white/20 text-xs">至</span>
                <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                  className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none focus:border-purple-400/40" />
              </div>
            </div>
            <div className="flex items-end gap-2 h-32">
              {initial.bgTasksByDay.map((d: any) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-white/70">{d.count}</span>
                  <div className="w-full bg-purple-500/30 rounded-t" style={{ height: `${Math.max(4, (d.count / Math.max(...initial.bgTasksByDay.map((x: any) => x.count || 0), 1)) * 100)}%` }} />
                  <span className="text-[9px] text-white/20">{typeof d.day === "string" ? d.day.substring(5) : d.day}</span>
                </div>
              ))}
              {initial.bgTasksByDay.length === 0 && <span className="text-white/20 text-sm">暂无数据</span>}
            </div>
          </div>

          {/* Recent users */}
          <div className="glass p-5">
            <h3 className="text-sm font-medium text-white/50 mb-3">最新用户</h3>
            <div className="space-y-2">
              {initial.recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <div>
                    <span className="text-sm text-white/70">{u.name || "未设置"}</span>
                    <span className="text-xs text-white/25 ml-2">{u.email}</span>
                  </div>
                  <div className="text-xs text-white/30">{new Date(u.createdAt).toLocaleDateString("zh-CN")} · {u.credits} 积分</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchUsers(search)}
                placeholder="搜索用户邮箱或昵称..."
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-purple-400/40"
              />
            </div>
            <button onClick={() => searchUsers(search)}
              className="px-4 py-2.5 bg-purple-500/20 border border-purple-400/30 rounded-lg text-sm text-purple-300 hover:bg-purple-500/30 transition-colors">
              搜索
            </button>
          </div>

          {/* User list */}
          <div className="glass overflow-hidden">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-white/30 text-xs">
                    <th className="text-left py-3 px-4">用户</th>
                    <th className="text-left py-3 px-4">积分</th>
                    <th className="text-left py-3 px-4">角色</th>
                    <th className="text-left py-3 px-4">状态</th>
                    <th className="text-left py-3 px-4">任务</th>
                    <th className="text-left py-3 px-4">注册时间</th>
                    <th className="text-right py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="text-white/70">{u.name || "未设置"}</div>
                        <div className="text-xs text-white/25">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-white/60">{u.credits}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.04] text-white/30"}`}>{u.role}</span>
                      </td>
                      <td className="py-3 px-4">
                        {u.banned ? <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">已封禁</span>
                          : <span className="text-xs text-white/20">正常</span>}
                      </td>
                      <td className="py-3 px-4 text-white/40">{u._count?.bgReplaceTasks || 0}</td>
                      <td className="py-3 px-4 text-white/25 text-xs">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => setEditUser(u)}
                            className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-colors">
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleBan(u.id, !u.banned)}
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${u.banned ? "text-green-400/50 hover:text-green-400" : "text-yellow-400/50 hover:text-yellow-400"}`}>
                            <Ban className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(u.id)}
                            className="inline-flex items-center gap-1 text-xs text-white/25 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Edit modal */}
          {editUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditUser(null)}>
              <div className="glass p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">编辑用户</h3>
                <p className="text-sm text-white/40 mb-4">{editUser.email}</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/30 block mb-1">积分</label>
                    <input type="number" defaultValue={editUser.credits} id="creditsInput"
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/80" />
                  </div>
                  <div>
                    <label className="text-xs text-white/30 block mb-1">角色</label>
                    <div className="relative">
                      <select id="roleInput" defaultValue={editUser.role}
                        className="w-full appearance-none bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 pr-8 text-sm text-white/80 focus:outline-none focus:border-purple-400/40">
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditUser(null)}
                      className="flex-1 py-2 rounded-lg border border-white/[0.08] text-sm text-white/40 hover:text-white/60">取消</button>
                    <button onClick={() => {
                      const credits = parseInt((document.getElementById("creditsInput") as HTMLInputElement).value);
                      const role = (document.getElementById("roleInput") as HTMLSelectElement).value;
                      updateUser(editUser.id, { credits, role });
                    }} className="flex-1 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 text-sm text-purple-300">
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
