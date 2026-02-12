import { Role } from "@/prisma/generated/prisma/enums";
import { prisma } from "@/prisma/prisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        const invalidCredentialsError = new Error("Invalid credentials");

        if (!credentials?.email || !credentials.password)
          throw invalidCredentialsError;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            employee: {
              include: {
                business: true,
              },
            },
            owner: {
              include: {
                business: true,
              },
            },
          },
        });

        if (!user) throw invalidCredentialsError;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashed_password,
        );

        if (!isPasswordValid) throw invalidCredentialsError;

        if (
          user.must_change_password &&
          user.temp_password_expires_at &&
          new Date() > user.temp_password_expires_at
        ) {
          throw invalidCredentialsError;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.email = u.email;
        token.name = u.name;
        token.id = u.id;
        token.role = u.role;
        token.businessSlug =
          u.role === Role.PLATFORM_ADMIN
            ? null
            : (u.employee?.business.slug ?? u.owner?.business.slug);
        token.isPlatformAdmin = u.role === Role.PLATFORM_ADMIN;
        token.mustChangePassword = u.must_change_password;
        token.tempPasswordExpiresAt =
          u.temp_password_expires_at?.toISOString() ?? null;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.mustChangePassword === "boolean") {
          token.mustChangePassword = session.user.mustChangePassword;
        }
        if ("tempPasswordExpiresAt" in session.user) {
          token.tempPasswordExpiresAt =
            session.user.tempPasswordExpiresAt ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.id = token.id;
        session.user.role = token.role as Role;
        session.user.businessSlug = token.businessSlug;
        session.user.isPlatformAdmin = !!token.isPlatformAdmin;
        session.user.mustChangePassword = !!token.mustChangePassword;
        session.user.tempPasswordExpiresAt =
          typeof token.tempPasswordExpiresAt === "string"
            ? token.tempPasswordExpiresAt
            : null;
      }
      return session;
    },
  },
};
