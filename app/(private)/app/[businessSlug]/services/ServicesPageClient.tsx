"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { Service } from "@/prisma/generated/prisma/client";
import {
  PageHeader,
  PageHeaderAction,
} from "@/components/dashboard/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Package,
  Filter,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "@/lib/server actions/services";
import { toast } from "sonner";

interface ServicesPageClientProps {
  services: Service[];
  categories: string[];
  businessSlug: string;
}

interface ServiceFlowData {
  suggested_service_id: string; // use string for select value
  delay_duration: string;
  delay_unit: "DAYS" | "WEEKS" | "MONTHS";
  type: "REQUIRED" | "SUGGESTED";
}

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  flows: ServiceFlowData[];
}

const initialFormData: ServiceFormData = {
  name: "",
  description: "",
  price: "",
  duration: "",
  category: "",
  flows: [],
};

type OptimisticAction =
  | {
      type: "update";
      serviceId: number;
      data: {
        name: string;
        description?: string;
        price: number;
        duration?: number;
        category: string;
      };
    }
  | { type: "delete"; serviceId: number };

export function ServicesPageClient({
  services,
  categories,
  businessSlug,
}: ServicesPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isPending, startTransition] = useTransition();

  // Optimistic state for instant UI updates
  const [optimisticServices, addOptimisticUpdate] = useOptimistic(
    services,
    (state: Service[], action: OptimisticAction) => {
      switch (action.type) {
        case "update":
          return state.map((service) =>
            service.id === action.serviceId
              ? {
                  ...service,
                  name: action.data.name,
                  description: action.data.description || null,
                  price: action.data.price,
                  duration: action.data.duration || null,
                  category: action.data.category,
                }
              : service,
          );
        case "delete":
          return state.filter((service) => service.id !== action.serviceId);
        default:
          return state;
      }
    },
  );

  const filteredServices = useMemo(() => {
    return optimisticServices.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase()) ||
        service.category.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "ALL" || service.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [optimisticServices, search, categoryFilter]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, Service[]> = {};
    filteredServices.forEach((service) => {
      if (!groups[service.category]) {
        groups[service.category] = [];
      }
      groups[service.category].push(service);
    });
    return groups;
  }, [filteredServices]);

  const handleAddService = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsLoading(true);
    const result = await createServiceAction({
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      category: newCategory || formData.category,
      flows: formData.flows
        .filter((f) => f.suggested_service_id)
        .map((f) => ({
          suggested_service_id: parseInt(f.suggested_service_id),
          delay_duration: parseInt(f.delay_duration),
          delay_unit: f.delay_unit,
          type: f.type,
        })),
    });

    setIsLoading(false);
    if (result.success) {
      toast.success("Service created successfully");
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
      setNewCategory("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create service");
    }
  };

  const handleEditService = async () => {
    if (!selectedService || !formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }

    const updateData = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      category: newCategory || formData.category,
      flows: formData.flows
        .filter((f) => f.suggested_service_id)
        .map((f) => ({
          suggested_service_id: parseInt(f.suggested_service_id),
          delay_duration: parseInt(f.delay_duration),
          delay_unit: f.delay_unit,
          type: f.type,
        })),
    };

    // Close dialog immediately for better UX
    setIsEditDialogOpen(false);

    // Apply optimistic update and call server action
    startTransition(async () => {
      // Apply optimistic update
      addOptimisticUpdate({
        type: "update",
        serviceId: selectedService.id,
        data: updateData,
      });

      const result = await updateServiceAction(selectedService.id, updateData);

      if (result.success) {
        toast.success("Service updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update service");
        // Refresh to revert to server state on error
        router.refresh();
      }

      setSelectedService(null);
      setFormData(initialFormData);
      setNewCategory("");
    });
  };

  const handleDeleteService = async (serviceId: number) => {
    // Apply optimistic update and call server action
    startTransition(async () => {
      // Optimistically remove from UI
      addOptimisticUpdate({
        type: "delete",
        serviceId,
      });

      const result = await deleteServiceAction(serviceId);
      if (result.success) {
        toast.success("Service deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete service");
        // Refresh to revert to server state on error
        router.refresh();
      }
    });
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      duration: service.duration?.toString() || "",
      category: service.category,
      flows:
        (service as any).flow_triggers?.map((f: any) => ({
          suggested_service_id: f.suggested_service_id.toString(),
          delay_duration: f.delay_duration.toString(),
          delay_unit: f.delay_unit,
          type: f.type,
        })) || [],
    });
    setIsEditDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Hair: "bg-purple-100 text-purple-800 border-purple-200",
      Nails: "bg-pink-100 text-pink-800 border-pink-200",
      Facial: "bg-green-100 text-green-800 border-green-200",
      Massage: "bg-blue-100 text-blue-800 border-blue-200",
      Makeup: "bg-orange-100 text-orange-800 border-orange-200",
      default: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[category] || colors.default;
  };

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50 ">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Services"
          description="Manage the services offered by your business"
          className="mb-6"
        >
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Service</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Service</DialogTitle>
                <DialogDescription>
                  Create a new service for your business. Fill in the details
                  below.
                </DialogDescription>
              </DialogHeader>
              <ServiceForm
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                services={services}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddService} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Service"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {filteredServices.length === 0 ? (
            <Empty className="h-full border-2">
              <EmptyMedia variant="icon">
                <Package className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No services found</EmptyTitle>
                <EmptyDescription>
                  {services.length === 0
                    ? "Get started by adding your first service."
                    : "Try adjusting your search or filter."}
                </EmptyDescription>
              </EmptyHeader>
              {services.length === 0 && (
                <EmptyContent>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Service
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
                      <TableHead className="w-[300px]">Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow
                        key={service.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{service.name}</span>
                            {service.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {service.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getCategoryColor(service.category)}
                          >
                            {service.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {service.duration ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-sm">
                                {service.duration} min
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₱{service.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(service)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Service
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {service.name}"? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      handleDeleteService(service.id)
                                    }
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>
                Update the details for this service.
              </DialogDescription>
            </DialogHeader>
            <ServiceForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              services={services}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditService} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

// Service Form Component
function ServiceForm({
  formData,
  setFormData,
  categories,
  newCategory,
  setNewCategory,
  services,
}: {
  formData: ServiceFormData;
  setFormData: (data: ServiceFormData) => void;
  categories: string[];
  newCategory: string;
  setNewCategory: (value: string) => void;
  services: Service[];
}) {
  const [showNewCategory, setShowNewCategory] = useState(false);

  const getEstimatedDate = (
    duration: string,
    unit: "DAYS" | "WEEKS" | "MONTHS",
  ) => {
    const num = parseInt(duration);
    if (isNaN(num)) return "";
    const today = new Date();
    let futureDate = today;
    if (unit === "DAYS") futureDate = addDays(today, num);
    if (unit === "WEEKS") futureDate = addWeeks(today, num);
    if (unit === "MONTHS") futureDate = addMonths(today, num);
    return format(futureDate, "MMM dd, yyyy");
  };

  const addFlow = () => {
    setFormData({
      ...formData,
      flows: [
        ...formData.flows,
        {
          suggested_service_id: "",
          delay_duration: "1",
          delay_unit: "WEEKS",
          type: "SUGGESTED",
        },
      ],
    });
  };

  const removeFlow = (index: number) => {
    const newFlows = [...formData.flows];
    newFlows.splice(index, 1);
    setFormData({ ...formData, flows: newFlows });
  };

  const updateFlow = (index: number, field: string, value: any) => {
    const newFlows = [...formData.flows];
    newFlows[index] = { ...newFlows[index], [field]: value };
    setFormData({ ...formData, flows: newFlows });
  };

  return (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="grid gap-2">
        <Label htmlFor="name">
          Service Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Haircut, Manicure, Facial"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the service..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="price">
            Price (₱) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="0"
            placeholder="e.g., 30"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>
          Category <span className="text-destructive">*</span>
        </Label>
        {showNewCategory ? (
          <div className="flex gap-2">
            <Input
              placeholder="Enter new category name..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewCategory(false);
                setNewCategory("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowNewCategory(true)}
              title="Add new category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="border-t pt-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">
            Service Flows / Automation
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addFlow}>
            <Plus className="h-3 w-3 mr-2" />
            Add Step
          </Button>
        </div>

        {formData.flows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            <div className="flex justify-center mb-3">
              <Sparkles className="h-8 w-8 text-zinc-300" />
            </div>
            <p className="font-medium text-zinc-900">No automation flows</p>
            <p className="text-zinc-500 text-xs mt-1 max-w-[200px] mx-auto">
              Add a subsequent service to suggest or require after this one
              completes.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pl-2">
            {formData.flows.map((flow, index) => (
              <div key={index} className="relative pl-8 pb-2">
                {/* Timeline Line */}
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200 last:bottom-auto last:h-full" />

                {/* Timeline Dot */}
                <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 z-10">
                  <Clock className="h-3.5 w-3.5" />
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 relative group hover:border-indigo-200 transition-colors">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFlow(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-zinc-500 font-medium">Wait</span>
                    <Input
                      type="number"
                      min="0"
                      value={flow.delay_duration}
                      onChange={(e) =>
                        updateFlow(index, "delay_duration", e.target.value)
                      }
                      className="h-7 w-14 text-center px-1"
                    />
                    <Select
                      value={flow.delay_unit}
                      onValueChange={(val) =>
                        updateFlow(index, "delay_unit", val)
                      }
                    >
                      <SelectTrigger className="h-7 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAYS">Days</SelectItem>
                        <SelectItem value="WEEKS">Weeks</SelectItem>
                        <SelectItem value="MONTHS">Months</SelectItem>
                      </SelectContent>
                    </Select>

                    <span className="text-zinc-400 mx-1">→</span>

                    <span className="text-zinc-500 font-medium">Then</span>

                    <Select
                      value={flow.type}
                      onValueChange={(val) => updateFlow(index, "type", val)}
                    >
                      <SelectTrigger
                        className={`h-7 w-28 border-0 ring-1 ring-inset ${
                          flow.type === "REQUIRED"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUGGESTED">Suggest</SelectItem>
                        <SelectItem value="REQUIRED">Require</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={flow.suggested_service_id}
                      onValueChange={(val) =>
                        updateFlow(index, "suggested_service_id", val)
                      }
                    >
                      <SelectTrigger className="h-7 flex-1 min-w-[160px]">
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 pl-1">
                    Estimated:{" "}
                    {getEstimatedDate(flow.delay_duration, flow.delay_unit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
