"use client";

import { useState, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Employee,
  User,
  EmployeeAttendance,
  Payslip,
} from "@/prisma/generated/prisma/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users, RefreshCcw } from "lucide-react";
import {
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  resetEmployeePasswordAction,
} from "@/lib/server actions/employees";
import { toast } from "sonner";
import { EmployeeList } from "./EmployeeList";

type EmployeeWithDetails = Employee & {
  user: User;
  attendance: EmployeeAttendance[];
  payslips: Payslip[];
  _count: {
    served_services: number;
  };
};

interface EmployeesPageClientProps {
  employees: EmployeeWithDetails[];
  businessSlug: string;
}

interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  daily_rate: string;
  commission_percentage: string;
}

const initialFormData: EmployeeFormData = {
  name: "",
  email: "",
  password: "",
  daily_rate: "",
  commission_percentage: "",
};

type OptimisticAction =
  | {
      type: "update";
      employeeId: number;
      data: {
        name: string;
        email: string;
        daily_rate: number;
        commission_percentage: number;
      };
    }
  | { type: "delete"; employeeId: number }
  | { type: "add"; employee: EmployeeWithDetails };

export function EmployeesPageClient({
  employees,
  businessSlug,
}: EmployeesPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithDetails | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Optimistic state for instant UI updates
  const [optimisticEmployees, addOptimisticUpdate] = useOptimistic(
    employees,
    (state: EmployeeWithDetails[], action: OptimisticAction) => {
      switch (action.type) {
        case "update":
          return state.map((emp) =>
            emp.id === action.employeeId
              ? {
                  ...emp,
                  daily_rate: action.data.daily_rate,
                  commission_percentage: action.data.commission_percentage,
                  user: {
                    ...emp.user,
                    name: action.data.name,
                    email: action.data.email,
                  },
                }
              : emp,
          );
        case "delete":
          return state.filter((emp) => emp.id !== action.employeeId);
        default:
          return state;
      }
    },
  );

  const filteredEmployees = useMemo(() => {
    return optimisticEmployees.filter((emp) => {
      const matchesSearch =
        emp.user.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.user.email.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [optimisticEmployees, search]);

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsLoading(true);
    const result = await createEmployeeAction({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      daily_rate: parseFloat(formData.daily_rate) || 0,
      commission_percentage: parseFloat(formData.commission_percentage) || 0,
    });

    setIsLoading(false);
    if (result.success) {
      toast.success("Employee created successfully");
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee || !formData.name || !formData.email) {
      toast.error("Please fill in required fields");
      return;
    }

    const updateData = {
      name: formData.name,
      email: formData.email,
      daily_rate: parseFloat(formData.daily_rate) || 0,
      commission_percentage: parseFloat(formData.commission_percentage) || 0,
    };

    // Close dialog immediately for better UX
    setIsEditDialogOpen(false);

    // Apply optimistic update and call server action
    startTransition(async () => {
      // Apply optimistic update
      addOptimisticUpdate({
        type: "update",
        employeeId: selectedEmployee.id,
        data: updateData,
      });

      const result = await updateEmployeeAction(
        selectedEmployee.id,
        updateData,
      );

      if (result.success) {
        toast.success("Employee updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update employee");
        // Refresh to revert to server state on error
        router.refresh();
      }

      setSelectedEmployee(null);
      setFormData(initialFormData);
    });
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    // Apply optimistic update and call server action
    startTransition(async () => {
      // Optimistically remove from UI
      addOptimisticUpdate({
        type: "delete",
        employeeId,
      });

      const result = await deleteEmployeeAction(employeeId);
      if (result.success) {
        toast.success("Employee deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete employee");
        // Refresh to revert to server state on error
        router.refresh();
      }
    });
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const result = await resetEmployeePasswordAction(
      selectedEmployee.id,
      newPassword,
    );

    setIsLoading(false);
    if (result.success) {
      toast.success("Password reset successfully");
      setIsResetPasswordDialogOpen(false);
      setSelectedEmployee(null);
      setNewPassword("");
    } else {
      toast.error(result.error || "Failed to reset password");
    }
  };

  const openEditDialog = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.user.name,
      email: employee.user.email,
      password: "",
      daily_rate: employee.daily_rate.toString(),
      commission_percentage: employee.commission_percentage.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openResetPasswordDialog = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <PageHeader
          title="Employees"
          description="Manage your team members and their information"
          className="mb-8"
        >
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" strokeWidth={2.5} />
                <span className="font-semibold">Add Employee</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 gap-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Add New Employee
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Create a new employee account. They will be able to log in
                  with these credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-4">
                <EmployeeForm
                  formData={formData}
                  setFormData={setFormData}
                  isNew={true}
                />
              </div>
              <DialogFooter className="p-6 pt-2 bg-zinc-50/50 border-t border-zinc-100">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEmployee}
                  disabled={isLoading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                >
                  {isLoading ? "Creating..." : "Create Employee"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search employees..."
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

        {/* Content */}
        <div className="flex-1">
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                No employees found
              </h3>
              <p className="text-zinc-500 max-w-sm mb-6">
                {employees.length === 0
                  ? "Get started by adding your first team member to manage services."
                  : "Try adjusting your search terms."}
              </p>
              {employees.length === 0 && (
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Employee
                </Button>
              )}
            </div>
          ) : (
            <EmployeeList
              employees={filteredEmployees}
              onEdit={openEditDialog}
              onDelete={handleDeleteEmployee}
              onResetPassword={openResetPasswordDialog}
            />
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl font-bold text-zinc-900">
                Edit Employee
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Update employee information.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4">
              <EmployeeForm
                formData={formData}
                setFormData={setFormData}
                isNew={false}
              />
            </div>
            <DialogFooter className="p-6 pt-2 bg-zinc-50/50 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditEmployee}
                disabled={isLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog
          open={isResetPasswordDialogOpen}
          onOpenChange={setIsResetPasswordDialogOpen}
        >
          <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl font-bold text-zinc-900">
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Set a new password for {selectedEmployee?.user.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters.
                </p>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 bg-zinc-50/50 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setIsResetPasswordDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

// Employee Form Component
function EmployeeForm({
  formData,
  setFormData,
  isNew,
}: {
  formData: EmployeeFormData;
  setFormData: (data: EmployeeFormData) => void;
  isNew: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., John Doe"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="h-10 rounded-xl"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">
          Email Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="h-10 rounded-xl"
        />
      </div>

      {isNew && (
        <div className="grid gap-2">
          <Label htmlFor="password">
            Password <span className="text-red-500">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="h-10 rounded-xl"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="daily_rate">Daily Rate (₱)</Label>
          <Input
            id="daily_rate"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formData.daily_rate}
            onChange={(e) =>
              setFormData({ ...formData, daily_rate: e.target.value })
            }
            className="h-10 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="commission">Commission (%)</Label>
          <Input
            id="commission"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={formData.commission_percentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                commission_percentage: e.target.value,
              })
            }
            className="h-10 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
