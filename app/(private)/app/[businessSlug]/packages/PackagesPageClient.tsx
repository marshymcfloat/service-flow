"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Service, ServicePackage } from "@/prisma/generated/prisma/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Package, RefreshCcw, Filter } from "lucide-react";
import { deletePackageAction } from "@/lib/server actions/packages";
import { toast } from "sonner";
import { PackageForm } from "./PackageForm";
import { PackageList } from "./PackageList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type ServicePackageWithItems = ServicePackage & {
  items: {
    service: Service;
    custom_price: number;
    service_id: number;
  }[];
};

interface PackagesPageClientProps {
  packages: ServicePackageWithItems[];
  services: Service[];
  categories: string[];
  businessSlug: string;
}

type OptimisticAction =
  | { type: "delete"; packageId: number }
  | { type: "update"; packageId: number; data: ServicePackageWithItems }
  | { type: "create"; data: ServicePackageWithItems };

export function PackagesPageClient({
  packages,
  services,
  categories,
  businessSlug,
}: PackagesPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<ServicePackageWithItems | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticPackages, addOptimisticUpdate] = useOptimistic(
    packages,
    (state: ServicePackageWithItems[], action: OptimisticAction) => {
      switch (action.type) {
        case "delete":
          return state.filter((pkg) => pkg.id !== action.packageId);
        case "update":
          return state.map((pkg) =>
            pkg.id === action.packageId ? action.data : pkg,
          );
        case "create":
          return [...state, action.data];
        default:
          return state;
      }
    },
  );

  const filteredPackages = useMemo(() => {
    return optimisticPackages.filter((pkg) => {
      const matchesSearch = pkg.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || pkg.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [optimisticPackages, search, categoryFilter]);

  const handleDeletePackage = async (packageId: number) => {
    startTransition(async () => {
      addOptimisticUpdate({ type: "delete", packageId });
      const result = await deletePackageAction(packageId);
      if (result.success) {
        toast.success("Package deleted successfully");
      } else {
        toast.error("Failed to delete package");
        router.refresh();
      }
    });
  };

  const handleEditClick = (pkg: ServicePackageWithItems) => {
    setEditingPackage(pkg);
  };

  const closeEditDialog = () => {
    setEditingPackage(null);
  };

  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <PageHeader
          title="Packages"
          description="Bundle services together for special pricing"
          className="mb-8"
        >
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" strokeWidth={2.5} />
                <span className="font-semibold">Add Package</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95%] md:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden p-0 rounded-3xl">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Create New Package
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Bundle multiple services together for a special price.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 pt-0">
                <PackageForm
                  services={services}
                  categories={categories}
                  businessSlug={businessSlug}
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    router.refresh();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search packages..."
                className="pl-10 h-10 rounded-xl border-zinc-200 bg-white shadow-sm focus-visible:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Filter className="h-4 w-4 opacity-50" />
                  <span className="truncate">
                    {categoryFilter === "ALL"
                      ? "All Categories"
                      : categoryFilter}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                No packages found
              </h3>
              <p className="text-zinc-500 max-w-sm mb-6">
                {packages.length === 0
                  ? "Create your first service package to generate more revenue."
                  : "Try adjusting your search or filters."}
              </p>
              {packages.length === 0 && (
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              )}
            </div>
          ) : (
            <PackageList
              packages={filteredPackages}
              onEdit={handleEditClick}
              onDelete={(id) => {
                // Using AlertDialog in PackageList would require passing specific handler or UI
                // Ideally we want the deletion confirmation inside the list or handle it here with a state
                // For now, let's keep it simple and just set a state to show confirmation dialog if needed,
                // or better yet, move the specific logic to the list item if complex.
                // Actually, let's re-use the delete logic but we need to know WHICH one to delete.
                // The PackageList calls this with an ID.
                // We can show a confirmation dialog here or trust the user clicked delete.
                // Since the previous implementation had a dialog inside the row,
                // and I haven't moved the dialog logic to PackageList fully (just the trigger),
                // let's wrap the logic or component.
                // WAIT: PackageList impl has ONCLICK handler for delete.
                // It's better to manage the deletion state here to keep PackageList pure if possible,
                // OR put the AlertDialog inside PackageList.
                // Current PackageList has a simple onClick.
                // Let's create a state for delete confirmation here.
                setPackageToDelete(id);
              }}
            />
          )}
        </div>

        <Dialog open={!!editingPackage} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-[95%] md:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden p-0 rounded-3xl">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl font-bold text-zinc-900">
                Edit Package
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Update package details and included services.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {editingPackage && (
                <PackageForm
                  services={services}
                  categories={categories}
                  businessSlug={businessSlug}
                  initialData={editingPackage}
                  onSuccess={() => {
                    closeEditDialog();
                    router.refresh();
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!packageToDelete}
          onOpenChange={(open) => !open && setPackageToDelete(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this package. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                onClick={() =>
                  packageToDelete && handleDeletePackage(packageToDelete)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
