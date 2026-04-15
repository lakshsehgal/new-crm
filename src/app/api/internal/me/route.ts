import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().max(120).optional(),
  image: z.string().url().nullable().optional(),
  title: z.string().max(120).nullable().optional(),
});

/**
 * Update the signed-in user's own profile (name, avatar URL, job title).
 * Kept intentionally small — no photo upload, just a URL field, so we avoid
 * pulling in blob storage for now.
 */
export async function PATCH(req: NextRequest) {
  const me = await requireUser();
  const data = Body.parse(await req.json());
  const updated = await db.user.update({
    where: { id: me.id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() || null } : {}),
      ...(data.image !== undefined ? { image: data.image || null } : {}),
      ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
    },
    select: { id: true, name: true, image: true, title: true, email: true },
  });
  return Response.json(updated);
}

export async function GET() {
  const me = await requireUser();
  const u = await db.user.findUnique({
    where: { id: me.id },
    select: { id: true, name: true, image: true, title: true, email: true, role: true },
  });
  return Response.json(u);
}
