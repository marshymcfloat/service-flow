"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Customer } from "@/prisma/generated/prisma/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
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
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  MoreHorizontal,
  Mail,
  Phone,
} from "lucide-react";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/server actions/customer";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerForm, CustomerFormData } from "./CustomerForm";

interface CustomersClientProps {
  customers: Customer[];
  businessSlug: string;
}

const initialFormData: CustomerFormData = {
  name: "",
  email: "",
  phone: "",
};

type OptimisticAction =
  | { type: "add"; customer: Customer }
  | { type: "update"; customer: Customer }
  | { type: "delete"; id: string };

export function CustomersClient({
  customers,
  businessSlug,
}: CustomersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticCustomers, addOptimisticUpdate] = useOptimistic(
    customers,
    (state: Customer[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.customer];
        case "update":
          return state.map((c) =>
            c.id === action.customer.id ? action.customer : c,
          );
        case "delete":
          return state.filter((c) => c.id !== action.id);
        default:
          return state;
      }
    },
  );

  const filteredCustomers = useMemo(() => {
    return optimisticCustomers.filter((customer) => {
      const searchLower = search.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower))
      );
    });
  }, [optimisticCustomers, search]);

  const handleAddCustomer = async () => {
    if (!formData.name) {
      toast.error("Please enter a customer name");
      return;
    }

    setIsLoading(true);
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newCustomer = {
      id: tempId,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      business_id: "", // placeholder
      created_at: new Date(),
      updated_at: new Date(),
    } as Customer;

    startTransition(async () => {
      addOptimisticUpdate({ type: "add", customer: newCustomer });
      const result = await createCustomer({
        businessSlug,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });

      setIsLoading(false);
      if (result.success) {
        toast.success("Customer created successfully");
        setIsAddDialogOpen(false);
        setFormData(initialFormData);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create customer");
        router.refresh(); // revert optimistic
      }
    });
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer || !formData.name) {
      toast.error("Please enter a customer name");
      return;
    }

    const updatedCustomer = {
      ...selectedCustomer,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
    };

    setIsEditDialogOpen(false);
    startTransition(async () => {
      addOptimisticUpdate({ type: "update", customer: updatedCustomer });
      const result = await updateCustomer(selectedCustomer.id, {
        businessSlug,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });

      if (result.success) {
        toast.success("Customer updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update customer");
        router.refresh(); // revert
      }
      setSelectedCustomer(null);
      setFormData(initialFormData);
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    startTransition(async () => {
      addOptimisticUpdate({ type: "delete", id });
      const result = await deleteCustomer(id, businessSlug);

      if (result.success) {
        toast.success("Customer deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete customer");
        router.refresh(); // revert
      }
    });
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Customers"
          description="Manage your customer database"
          className="mb-6"
        >
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer profile.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCustomer} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Customer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {filteredCustomers.length === 0 ? (
            <Empty className="h-full border-2">
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No customers found</EmptyTitle>
                <EmptyDescription>
                  {customers.length === 0
                    ? "Get started by adding your first customer."
                    : "Try adjusting your search."}
                </EmptyDescription>
              </EmptyHeader>
              {customers.length === 0 && (
                <EmptyContent>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Customer
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <Card className="shadow-sm border-zinc-100">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow>
                      <TableHead className="w-[300px] pl-6">Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right w-[80px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar
                              className={`${getAvatarColor(customer.name)} text-white`}
                            >
                              <AvatarFallback className="bg-transparent">
                                {getInitials(customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {customer.name}
                              </span>
                              {customer.email && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Customer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Customer
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {customer.name}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() =>
                                        handleDeleteCustomer(customer.id)
                                      }
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update customer information.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditCustomer} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
