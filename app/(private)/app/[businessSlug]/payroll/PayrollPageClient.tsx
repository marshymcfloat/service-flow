"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Employee, User, Payslip } from "@/prisma/generated/prisma/client";
import { formatPH } from "@/lib/date-utils";
import { Plus, Wallet, Mail } from "lucide-react";
import { useState } from "react";
import { PayslipGenerationDialog } from "@/components/dashboard/owner/PayslipGenerationDialog";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

type EmployeeWithDetails = Employee & {
  user: User;
  payslips: Payslip[];
};

export function PayrollPageClient({
  employees,
}: {
  employees: EmployeeWithDetails[];
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.user.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.user.email.toLowerCase().includes(search.toLowerCase()),
  );

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
    <>
      <div className="h-full flex flex-col p-4 md:p-8 bg-zinc-50/50">
        <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
          {/* Header */}
          <PageHeader
            title="Payroll"
            description="Manage employee salaries and generate payslips"
            className="mb-6"
          />

          {/* Search */}
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
                  <Wallet className="h-6 w-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No employees found</EmptyTitle>
                  <EmptyDescription>
                    {employees.length === 0
                      ? "Add employees to start managing payroll."
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
                        <TableHead className="w-[300px]">Employee</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Last Payout</TableHead>
                        <TableHead className="text-right w-[180px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp) => {
                        const lastPayslip = emp.payslips[0];
                        return (
                          <TableRow
                            key={emp.id}
                            className="hover:bg-zinc-50/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar
                                  className={`${getAvatarColor(emp.user.name)} text-white`}
                                >
                                  <AvatarFallback className="bg-transparent">
                                    {getInitials(emp.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {emp.user.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {emp.user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₱{emp.daily_rate.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {emp.commission_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lastPayslip ? (
                                <div className="flex flex-col gap-1">
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                  setSelectedEmployeeId(emp.id);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                Generate Payslip
                              </Button>
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
        </section>
      </div>

      <PayslipGenerationDialog
        employeeId={selectedEmployeeId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
