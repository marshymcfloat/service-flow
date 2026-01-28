import EmployeeDashboardDataContainer from "@/components/dashboard/employee/EmployeeDashboardDataContainer";
import OwnerDashboardDataContainer from "@/components/dashboard/owner/OwnerDashboardDataContainer";
import { authOptions } from "@/lib/next auth/options";
import { LoaderCircle } from "lucide-react";
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="w-screen h-screen backdrop-blur-sm flex items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </main>
    );
  }

  if (session?.user.role === "EMPLOYEE") {
    return (
      <EmployeeDashboardDataContainer
        businessSlug={session.user.businessSlug!}
      />
    );
  }

  if (session?.user.role === "OWNER") {
    return <OwnerDashboardDataContainer />;
  }

  return <div>page</div>;
}
