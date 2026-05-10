export function userFriendlyError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("billing") || msg.includes("insufficient")) {
    return "[管理员可见] AI 服务余额不足，请充值 API Key";
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("econnrefused")) {
    return "[管理员可见] AI 服务响应超时";
  }
  if (msg.includes("not found") || msg.includes("unavailable") || msg.includes("decommissioned")) {
    return "[管理员可见] 模型暂时不可用";
  }
  if (msg.includes("rate") || msg.includes("too many")) {
    return "[管理员可见] 请求过于频繁";
  }
  if (msg.includes("authentication") || msg.includes("unauthorized") || msg.includes("invalid key")) {
    return "[管理员可见] API Key 认证失败";
  }
  return "[管理员可见] " + (raw.length > 100 ? raw.slice(0, 100) + "..." : raw);
}
