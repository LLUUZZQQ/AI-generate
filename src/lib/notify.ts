import { prisma } from "@/lib/db";

export async function createNotification(params: {
  userId: string; type?: string; message: string; link?: string;
}) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO notifications (id, user_id, type, message, link) VALUES ($1, $2, $3, $4, $5)`,
    `n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    params.userId, params.type || "info", params.message, params.link || null
  );
}
