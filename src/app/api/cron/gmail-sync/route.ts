import { db } from "@/lib/db";
import { syncInbox } from "@/lib/gmail";

/**
 * Background job hit by Vercel Cron. Iterates over every user with a Google
 * account and refreshes their inbox. Rate-limited naturally by the small
 * number of users in an internal CRM.
 */
export async function GET(req: Request) {
  // Vercel cron sends an Authorization: Bearer $CRON_SECRET header.
  // In Vercel just set CRON_SECRET in the env. Optional: strict check.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) return new Response("forbidden", { status: 403 });
  }

  const users = await db.user.findMany({
    where: { accounts: { some: { provider: "google" } } },
    select: { id: true },
  });
  const results: Array<{ userId: string; count: number }> = [];
  for (const u of users) {
    try {
      const count = await syncInbox(u.id, 20);
      results.push({ userId: u.id, count });
    } catch (e) {
      results.push({ userId: u.id, count: -1 });
    }
  }
  return Response.json({ ok: true, users: results });
}
