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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Employee, User, Payslip } from "@/prisma/generated/prisma/client";
import { formatPH } from "@/lib/date-utils";
import { Plus, Wallet, Mail } from "lucide-react";
import { useState } from "react";
import { PayslipGenerationDialog } from "@/components/dashboard/owner/PayslipGenerationDialog";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
      <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
        <section className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                Payroll
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Manage employee salaries and generate payslips
              </p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search employees..."
                className="pl-10 bg-white border-zinc-200 focus-visible:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <div className="bg-zinc-50 h-16 w-16 mobile-center rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900">
                  No employees found
                </h3>
                <p className="text-zinc-500 max-w-sm mx-auto mt-1">
                  {employees.length === 0
                    ? "Add employees to start managing payroll."
                    : "Try adjusting your search terms."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="md:hidden grid grid-cols-1 gap-4">
                  {filteredEmployees.map((emp) => {
                    const lastPayslip = emp.payslips[0];
                    return (
                      <div
                        key={emp.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={`${getAvatarColor(emp.user.name)} h-12 w-12 text-white shadow-sm ring-2 ring-white`}
                          >
                            <AvatarFallback className="bg-transparent font-medium text-lg">
                              {getInitials(emp.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-900 text-lg">
                              {emp.user.name}
                            </span>
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {emp.user.email}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-50">
                          <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                            <span className="text-xs text-zinc-400 font-medium uppercase block mb-1">
                              Daily Rate
                            </span>
                            <span className="font-semibold text-zinc-900 font-mono">
                              ₱{emp.daily_rate.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                            <span className="text-xs text-zinc-400 font-medium uppercase block mb-1">
                              Commission
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700 border-emerald-100"
                            >
                              {emp.commission_percentage}%
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-400 font-medium uppercase">
                              Last Payout
                            </span>
                            {lastPayslip ? (
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-sm font-medium text-zinc-900">
                                  {formatPH(
                                    lastPayslip.ending_date,
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium border border-emerald-100">
                                  ₱{lastPayslip.total_salary.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-zinc-400 italic">
                                No history
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Payslip
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="hover:bg-transparent border-zinc-100">
                        <TableHead className="pl-6 h-12 font-semibold text-zinc-500 w-[300px]">
                          Employee
                        </TableHead>
                        <TableHead className="h-12 font-semibold text-zinc-500">
                          Daily Rate
                        </TableHead>
                        <TableHead className="h-12 font-semibold text-zinc-500">
                          Commission
                        </TableHead>
                        <TableHead className="h-12 font-semibold text-zinc-500">
                          Last Payout
                        </TableHead>
                        <TableHead className="text-right pr-6 h-12 font-semibold text-zinc-500 w-[180px]">
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
                            className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  className={`${getAvatarColor(emp.user.name)} h-10 w-10 text-white shadow-sm ring-2 ring-white`}
                                >
                                  <AvatarFallback className="bg-transparent font-medium">
                                    {getInitials(emp.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-zinc-900">
                                    {emp.user.name}
                                  </span>
                                  <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-zinc-400" />
                                    {emp.user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 font-mono text-zinc-600">
                              ₱{emp.daily_rate.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-700 border-emerald-100"
                              >
                                {emp.commission_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              {lastPayslip ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium text-zinc-700">
                                    {formatPH(
                                      lastPayslip.ending_date,
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                  <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium border border-emerald-100 w-fit">
                                    ₱{lastPayslip.total_salary.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm italic">
                                  No payout yet
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
                                onClick={() => {
                                  setSelectedEmployeeId(emp.id);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                Generate
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
