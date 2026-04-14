import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
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

const devPassword = process.env.DEV_LOGIN_PASSWORD;
const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT strategy is required for the Credentials provider. OAuth accounts
  // (Google) still store refresh tokens in the Account table via the adapter,
  // so Gmail sync keeps working.
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                access_type: "offline",
                prompt: "consent",
                scope: GMAIL_SCOPES,
              },
            },
          }),
        ]
      : []),
    ...(devPassword
      ? [
          Credentials({
            id: "dev",
            name: "Email + password",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              const password = String(credentials?.password ?? "");
              if (!email || !password) return null;
              if (password !== devPassword) return null;

              const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
              const user = await db.user.upsert({
                where: { email },
                update: {},
                create: {
                  email,
                  name: email.split("@")[0],
                  role: bootstrap && email === bootstrap ? "ADMIN" : "USER",
                },
              });
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      // Promote the bootstrap admin on first sign-in
      const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
      if (bootstrap && user.email?.toLowerCase() === bootstrap) {
        await db.user
          .update({ where: { email: user.email }, data: { role: "ADMIN" } })
          .catch(() => {});
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      if (token.uid) {
        const dbUser = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).role = (token.role as Role) ?? "USER";
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

export const authProviders = {
  google: hasGoogle,
  dev: !!devPassword,
};
