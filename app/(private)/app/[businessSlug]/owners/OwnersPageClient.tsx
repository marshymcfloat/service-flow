"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Owner, User } from "@/prisma/generated/prisma/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCcw, Crown } from "lucide-react";
import { EditOwnerSpecialtiesDialog } from "@/components/owners/EditOwnerSpecialtiesDialog";
import { OwnersTable } from "@/components/owners/OwnersTable";

type OwnerWithUser = Owner & {
  user: User;
};

interface OwnersPageClientProps {
  owners: OwnerWithUser[];
  businessSlug: string;
  categories: string[];
}

export function OwnersPageClient({
  owners,
  businessSlug,
  categories,
}: OwnersPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithUser | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const matchesSearch =
        owner.user.name.toLowerCase().includes(search.toLowerCase()) ||
        owner.user.email.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [owners, search]);

  const handleEditSpecialties = (owner: OwnerWithUser) => {
    setSelectedOwner(owner);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedOwner(null);
  };

  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <PageHeader
          title="Business Owners"
          description="Manage business owners and their service specialties"
          className="mb-8"
        />

        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search owners..."
              className="pl-10 h-10 rounded-xl border-zinc-200 bg-white shadow-sm focus-visible:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl border-zinc-200 bg-white text-zinc-600 hidden md:flex"
            onClick={() => router.refresh()}
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="flex-1">
          {filteredOwners.length === 0 ? (
            <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                No owners found
              </h3>
              <p className="text-zinc-500 max-w-sm">
                {owners.length === 0
                  ? "No business owners registered."
                  : "Try adjusting your search terms."}
              </p>
            </div>
          ) : (
            <OwnersTable
              owners={filteredOwners}
              onEditSpecialties={handleEditSpecialties}
            />
          )}
        </div>

        <EditOwnerSpecialtiesDialog
          owner={selectedOwner}
          categories={categories}
          open={isEditDialogOpen && selectedOwner !== null}
          onOpenChange={handleDialogClose}
          onSuccess={() => {
            handleDialogClose();
            router.refresh();
          }}
        />
      </section>
    </div>
  );
}
