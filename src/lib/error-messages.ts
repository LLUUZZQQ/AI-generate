export function userFriendlyError(raw: string): string {
  const detail = raw.length > 100 ? raw.slice(0, 100) + "..." : raw;
  const msg = raw.toLowerCase();
  if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("billing") || msg.includes("insufficient")) {
    return "AI 服务繁忙，请稍后重试";
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("econnrefused")) {
    return "处理超时，请稍后重试";
  }
  if (msg.includes("not found") || msg.includes("unavailable") || msg.includes("decommissioned")) {
    return "服务暂时不可用";
  }
  if (msg.includes("rate") || msg.includes("too many")) {
    return "请求过于频繁，请稍后重试";
  }
  if (msg.includes("authentication") || msg.includes("unauthorized") || msg.includes("invalid key")) {
    return "服务配置异常，请联系管理员";
  }
  return "处理失败，请稍后重试";
}
