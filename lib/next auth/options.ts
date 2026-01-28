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

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.id = user.id;
        token.role = user.role;
        token.businessSlug =
          user.employee?.business.slug ?? user.owner?.business.slug;
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
      }
      return session;
    },
  },
};
