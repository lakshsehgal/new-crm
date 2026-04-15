import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/mailer";
import { randomSecret } from "@/lib/crypto";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

const INVITE_TTL_DAYS = 7;

export async function GET() {
  await requireAdmin();
  const invites = await db.invite.findMany({
    where: { acceptedAt: null, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { email: true, name: true } } },
  });
  return Response.json({ data: invites });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const data = Body.parse(await req.json());
  const email = data.email.trim().toLowerCase();

  // Is this email already a workspace member?
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "That email is already a member of the workspace." },
      { status: 409 },
    );
  }

  // Revoke any open invites for the same email — you only get one live
  // invite per address.
  await db.invite.updateMany({
    where: { email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const token = randomSecret(32);
  const invite = await db.invite.create({
    data: {
      email,
      role: data.role,
      token,
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const origin = req.nextUrl.origin;
  const inviteUrl = `${origin}/invite/${token}`;

  try {
    await sendInviteEmail({
      to: email,
      inviteUrl,
      inviterName: admin.name ?? null,
      inviterEmail: admin.email,
      role: data.role,
      appOrigin: origin,
    });
  } catch (err) {
    // Email failed — we still leave the invite record so the admin can
    // re-send or copy the link manually. Return 202 so the UI can react.
    console.error("[invites] email failed:", err);
    return Response.json(
      {
        invite: { id: invite.id, email: invite.email, inviteUrl },
        warning:
          "Invite created but email couldn't be sent. You can copy the invite link manually.",
      },
      { status: 202 },
    );
  }

  return Response.json(
    { invite: { id: invite.id, email: invite.email, inviteUrl } },
    { status: 201 },
  );
}
