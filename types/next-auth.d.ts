import { Role } from "@/prisma/generated/prisma/enums";
import { DefaultSession } from "next-auth";
import { Employee, Business, Owner } from "@/prisma/generated/prisma/models";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      businessSlug?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    employee?: (Employee & { business: Business }) | null;
    owner?: (Owner & { business: Business }) | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: Role;
    businessSlug?: string | null;
  }
}
