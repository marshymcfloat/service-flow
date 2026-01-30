"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Service, ServicePackage } from "@/prisma/generated/prisma/client";
import {
  PageHeader,
  PageHeaderAction,
} from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  Clock,
  Tag,
} from "lucide-react";
import { deletePackageAction } from "@/lib/server actions/packages";
import { toast } from "sonner";
import { PackageForm } from "./PackageForm";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<ServicePackageWithItems | null>(null);
  const [isPending, startTransition] = useTransition();

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
    return optimisticPackages.filter((pkg) =>
      pkg.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [optimisticPackages, search]);

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
    <div className="h-full flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Packages"
          description="Bundle services together for special pricing"
        >
          <Button
            className="shadow-lg shadow-primary/20"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Package</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredPackages.length === 0 ? (
            <Empty className="h-full border-2">
              <EmptyMedia variant="icon">
                <Package className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No packages found</EmptyTitle>
                <EmptyDescription>
                  {packages.length === 0
                    ? "Create your first service package to generate more revenue."
                    : "Try adjusting your search."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Card className="shadow-sm border-zinc-100">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow>
                      <TableHead>Package Name</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.map((pkg) => (
                      <TableRow key={pkg.id} className="hover:bg-zinc-50/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{pkg.name}</span>
                            {pkg.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {pkg.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pkg.items.slice(0, 3).map((item) => (
                              <Badge
                                key={item.service_id}
                                variant="outline"
                                className="text-[10px] h-5 font-normal"
                              >
                                {item.service.name}
                              </Badge>
                            ))}
                            {pkg.items.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 font-normal"
                              >
                                +{pkg.items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="font-normal text-xs"
                          >
                            {pkg.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ₱{pkg.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {pkg.duration}m
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditClick(pkg)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Package?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the "{pkg.name}
                                    " package. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeletePackage(pkg.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95%] md:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Create New Package</DialogTitle>
            <DialogDescription>
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

      <Dialog open={!!editingPackage} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-[95%] md:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package details and included services.
            </DialogDescription>
          </DialogHeader>
          {editingPackage && (
            <div className="flex-1 overflow-y-auto p-6 pt-0">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
