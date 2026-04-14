import { requireUser } from "@/lib/auth";
import { syncInbox } from "@/lib/gmail";

export async function POST() {
  const user = await requireUser();
  try {
    const count = await syncInbox(user.id, 50);
    return Response.json({ ok: true, count });
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message ?? "sync failed" }, { status: 500 });
  }
}
