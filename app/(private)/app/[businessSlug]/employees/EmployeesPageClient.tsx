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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  KeyRound,
  Calendar,
  Wallet,
  MoreHorizontal,
  Mail,
  Phone,
} from "lucide-react";
import {
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  resetEmployeePasswordAction,
} from "@/lib/server actions/employees";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPH } from "@/lib/date-utils";

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
          title="Employees"
          description="Manage your team members and their information"
          className="mb-6"
        >
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee account. They will be able to log in
                  with these credentials.
                </DialogDescription>
              </DialogHeader>
              <EmployeeForm
                formData={formData}
                setFormData={setFormData}
                isNew={true}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Employee"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {filteredEmployees.length === 0 ? (
            <Empty className="h-full border-2">
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No employees found</EmptyTitle>
                <EmptyDescription>
                  {employees.length === 0
                    ? "Get started by adding your first team member."
                    : "Try adjusting your search."}
                </EmptyDescription>
              </EmptyHeader>
              {employees.length === 0 && (
                <EmptyContent>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Employee
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
                      <TableHead className="w-[300px]">Employee</TableHead>
                      <TableHead>Daily Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Last Payout</TableHead>
                      <TableHead className="text-right w-[80px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const lastPayslip = employee.payslips[0];
                      const recentPresent = employee.attendance.filter(
                        (a) => a.status === "PRESENT",
                      ).length;

                      return (
                        <TableRow
                          key={employee.id}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar
                                className={`${getAvatarColor(employee.user.name)} text-white`}
                              >
                                <AvatarFallback className="bg-transparent">
                                  {getInitials(employee.user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {employee.user.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {employee.user.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₱{employee.daily_rate.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {employee.commission_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span className="text-sm font-medium text-foreground">
                                {employee._count.served_services}
                              </span>
                              <span className="text-xs">completed</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lastPayslip ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">
                                  {formatPH(
                                    lastPayslip.ending_date,
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="w-fit text-[10px] h-5"
                                >
                                  ₱{lastPayslip.total_salary.toLocaleString()}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Never
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
                                  onClick={() => openEditDialog(employee)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openResetPasswordDialog(employee)
                                  }
                                >
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Employee
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Employee
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "
                                        {employee.user.name}"? This will remove
                                        their employee record. Their attendance
                                        and payslip history will also be
                                        deleted.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() =>
                                          handleDeleteEmployee(employee.id)
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
                      );
                    })}
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
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee information.
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              formData={formData}
              setFormData={setFormData}
              isNew={false}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditEmployee} disabled={isLoading}>
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
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedEmployee?.user.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={isLoading}>
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
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., John Doe"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {isNew && (
        <div className="grid gap-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
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
          />
        </div>
      </div>
    </div>
  );
}
