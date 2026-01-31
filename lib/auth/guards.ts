import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";

export type AuthResult =
  | { success: true; session: any; businessSlug: string }
  | { success: false; error: string };

export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  return {
    success: true,
    session: session,
    businessSlug: session.user.businessSlug,
  };
}
