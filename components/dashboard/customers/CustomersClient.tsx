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
      const result = await deleteCustomer(id);

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
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Customers
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage your customer database
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
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
                    className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCustomer}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isLoading ? "Creating..." : "Create Customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search customers..."
              className="pl-10 bg-white border-zinc-200 focus-visible:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <div className="bg-zinc-50 h-16 w-16 mobile-center rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900">
                No customers found
              </h3>
              <p className="text-zinc-500 max-w-sm mx-auto mt-1 mb-6">
                {customers.length === 0
                  ? "Get started by adding your first customer."
                  : "Try adjusting your search terms."}
              </p>
              {customers.length === 0 && (
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mobile Card View */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          className={`${getAvatarColor(customer.name)} h-12 w-12 text-white shadow-sm ring-2 ring-white`}
                        >
                          <AvatarFallback className="bg-transparent font-medium text-lg">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 text-lg">
                            {customer.name}
                          </span>
                          {customer.email && (
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400"
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
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
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
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2 border-t border-zinc-50">
                      <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                        <span className="text-xs text-zinc-400 font-medium uppercase">
                          Contact Info
                        </span>
                        {customer.phone ? (
                          <div className="flex items-center gap-2 text-sm text-zinc-900 font-medium">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-400 italic">
                            No phone number
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent border-zinc-100">
                      <TableHead className="pl-6 h-12 font-semibold text-zinc-500 w-[300px]">
                        Customer
                      </TableHead>
                      <TableHead className="h-12 font-semibold text-zinc-500">
                        Phone
                      </TableHead>
                      <TableHead className="text-right pr-6 h-12 font-semibold text-zinc-500 w-[80px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              className={`${getAvatarColor(customer.name)} h-10 w-10 text-white shadow-sm ring-2 ring-white`}
                            >
                              <AvatarFallback className="bg-transparent font-medium">
                                {getInitials(customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-900">
                                {customer.name}
                              </span>
                              {customer.email && (
                                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                                  <Mail className="h-3 w-3 text-zinc-400" />
                                  {customer.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {customer.phone ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                              <Phone className="h-3 w-3 text-zinc-400" />
                              {customer.phone}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-sm italic">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
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
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
                                      className="bg-red-600 hover:bg-red-700 text-white"
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
              </div>
            </div>
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
                className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditCustomer}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
