export function userFriendlyError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("billing") || msg.includes("insufficient")) {
    return "AI 服务余额不足，请联系平台管理员充值 API Key";
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("econnrefused")) {
    return "AI 服务响应超时，请稍后重试";
  }
  if (msg.includes("not found") || msg.includes("unavailable") || msg.includes("decommissioned")) {
    return "模型暂时不可用，请尝试其他模型";
  }
  if (msg.includes("rate") || msg.includes("too many")) {
    return "请求过于频繁，请稍后重试";
  }
  if (msg.includes("authentication") || msg.includes("unauthorized") || msg.includes("invalid key")) {
    return "AI 服务认证失败，请联系平台管理员检查 API Key";
  }
  // Don't expose raw API errors to users
  return "生成失败，请稍后重试。如多次失败，请联系客服";
}
