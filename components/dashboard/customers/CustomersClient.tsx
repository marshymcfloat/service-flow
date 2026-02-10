"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Customer } from "@/prisma/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
  type CustomerHistoryData,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { formatPH } from "@/lib/date-utils";

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
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

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

  const { data: historyResult, isFetching: isHistoryLoading } = useQuery({
    queryKey: ["customerHistory", historyCustomer?.id],
    queryFn: () =>
      historyCustomer
        ? getCustomerHistory(historyCustomer.id)
        : Promise.resolve(null),
    enabled: !!historyCustomer && isHistoryDialogOpen,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

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

  const openHistoryDialog = (customer: Customer) => {
    setHistoryCustomer(customer);
    setIsHistoryDialogOpen(true);
  };

  const closeHistoryDialog = (open: boolean) => {
    setIsHistoryDialogOpen(open);
    if (!open) {
      setHistoryCustomer(null);
    }
  };

  const historyData: CustomerHistoryData | null = historyResult?.success
    ? historyResult.data
    : null;

  const pendingFlows = useMemo(() => {
    if (!historyData) return [];
    return historyData.flowStatus.filter((flow) => flow.status === "PENDING");
  }, [historyData]);

  const nextFlowDue = useMemo(() => {
    if (!pendingFlows.length) return null;
    return pendingFlows
      .slice()
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0];
  }, [pendingFlows]);

  const getBookingStatusClass = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "COMPLETED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "HOLD":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const getFlowStatusClass = (status: string) => {
    return status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
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
                    className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-4 cursor-pointer hover:border-emerald-100 hover:shadow-md transition"
                    onClick={() => openHistoryDialog(customer)}
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
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openHistoryDialog(customer)}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
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
                                  Are you sure you want to delete &quot;
                                  {customer.name}&quot;? This action cannot be
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
                        className="hover:bg-zinc-50/50 transition-colors border-zinc-100 cursor-pointer"
                        onClick={() => openHistoryDialog(customer)}
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
                        <TableCell
                          className="text-right pr-6 py-4"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openHistoryDialog(customer)}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                View History
                              </DropdownMenuItem>
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
                                      Are you sure you want to delete &quot;
                                      {customer.name}&quot;? This action cannot be
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

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={closeHistoryDialog}>
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Customer History</DialogTitle>
              <DialogDescription>
                {historyCustomer
                  ? `Overview for ${historyCustomer.name}`
                  : "Customer overview"}
              </DialogDescription>
            </DialogHeader>

            {isHistoryLoading && (
              <div className="text-sm text-zinc-500">Loading history...</div>
            )}

            {!isHistoryLoading && historyResult?.success === false && (
              <div className="text-sm text-red-600">
                {historyResult.error || "Failed to load history"}
              </div>
            )}

            {!isHistoryLoading && historyData && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-zinc-100">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                        Next Appointment
                      </p>
                      {historyData.nextAppointment ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-zinc-900">
                            {formatPH(
                              historyData.nextAppointment.scheduledAt,
                              "PPP p",
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {historyData.nextAppointment.services.length > 0
                              ? historyData.nextAppointment.services.join(", ")
                              : "No services listed"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No upcoming appointment scheduled.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-100">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                        Next Recommended (Service Flow)
                      </p>
                      {nextFlowDue ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-zinc-900">
                            {nextFlowDue.suggestedServiceName}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Due {formatPH(nextFlowDue.dueDate, "MMM d, yyyy")}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`border ${getFlowStatusClass(nextFlowDue.status)}`}
                            >
                              {nextFlowDue.status}
                            </Badge>
                            <Badge className="bg-zinc-50 text-zinc-700 border border-zinc-200">
                              {nextFlowDue.flowType}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No pending service flows.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-800">
                      Service Flow Status
                    </h4>
                    <span className="text-xs text-zinc-500">
                      {historyData.flowStatus.length} total
                    </span>
                  </div>

                  {historyData.flowStatus.length === 0 ? (
                    <div className="text-sm text-zinc-500">
                      No service flows configured for this customer.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {historyData.flowStatus.map((flow) => (
                        <div
                          key={`${flow.triggerServiceId}-${flow.suggestedServiceId}`}
                          className="flex flex-col gap-2 border border-zinc-100 rounded-xl p-3 bg-white"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900">
                              {flow.triggerServiceName}
                            </span>
                            <span className="text-xs text-zinc-400">-&gt;</span>
                            <span className="text-sm font-semibold text-zinc-900">
                              {flow.suggestedServiceName}
                            </span>
                            <Badge
                              className={`border ${getFlowStatusClass(flow.status)}`}
                            >
                              {flow.status}
                            </Badge>
                            <Badge className="bg-zinc-50 text-zinc-700 border border-zinc-200">
                              {flow.flowType}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-500">
                            Last service:{" "}
                            {formatPH(flow.lastServiceDate, "MMM d, yyyy")}
                            {" • "}
                            {flow.status === "COMPLETED"
                              ? `Completed ${formatPH(flow.completedAt, "MMM d, yyyy")}`
                              : `Due ${formatPH(flow.dueDate, "MMM d, yyyy")}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-800">
                      Booking History
                    </h4>
                    <span className="text-xs text-zinc-500">
                      {historyData.bookings.length} total
                    </span>
                  </div>

                  {historyData.bookings.length === 0 ? (
                    <div className="text-sm text-zinc-500">
                      No bookings found for this customer.
                    </div>
                  ) : (
                    <ScrollArea className="h-[320px] pr-3">
                      <div className="space-y-3">
                        {historyData.bookings.map((booking) => {
                          const serviceNames =
                            booking.availed_services
                              ?.map((item) => item.service?.name)
                              .filter(Boolean) || [];

                          const displayDate =
                            booking.scheduled_at || booking.created_at;

                          return (
                            <div
                              key={booking.id}
                              className="border border-zinc-100 rounded-xl p-3 bg-white"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-zinc-900">
                                  Booking #{booking.id}
                                </div>
                                <Badge
                                  className={`border ${getBookingStatusClass(booking.status)}`}
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {formatPH(displayDate, "PPP p")}
                              </div>
                              <div className="text-xs text-zinc-600 mt-2">
                                {serviceNames.length > 0
                                  ? `Services: ${serviceNames.join(", ")}`
                                  : "Services: Not listed"}
                              </div>
                              <div className="text-xs text-zinc-600 mt-1">
                                Payment: {booking.payment_method} • Total: PHP{" "}
                                {booking.grand_total.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
