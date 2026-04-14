import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// Gmail scopes needed for inbox sync + send
const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: GMAIL_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Promote the bootstrap admin on first sign-in
      const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
      if (bootstrap && user.email?.toLowerCase() === bootstrap) {
        await db.user.update({
          where: { email: user.email },
          data: { role: "ADMIN" },
        });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        (session.user as any).role = dbUser?.role ?? "USER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.user as unknown as SessionUser;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
