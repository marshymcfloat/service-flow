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
        if (!credentials?.email || !credentials.password)
          throw new Error("Email and password are required");

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

        if (!user) throw new Error("No user found with this email");

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashed_password,
        );

        if (!isPasswordValid) throw new Error("Invalid password");

        if (
          user.must_change_password &&
          user.temp_password_expires_at &&
          new Date() > user.temp_password_expires_at
        ) {
          throw new Error("Temporary password expired");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.id = user.id;
        token.role = user.role;
        token.businessSlug =
          user.employee?.business.slug ?? user.owner?.business.slug;
        token.mustChangePassword = user.must_change_password;
        token.tempPasswordExpiresAt =
          user.temp_password_expires_at?.toISOString() ?? null;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.mustChangePassword === "boolean") {
          token.mustChangePassword = session.user.mustChangePassword;
        }
        if ("tempPasswordExpiresAt" in session.user) {
          token.tempPasswordExpiresAt = session.user.tempPasswordExpiresAt ?? null;
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
