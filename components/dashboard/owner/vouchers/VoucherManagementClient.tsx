"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Copy, Check, Search, Ticket } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

import { deleteVoucherAction } from "@/lib/server actions/vouchers";
import { VoucherForm } from "./VoucherForm";

interface Voucher {
  id: number;
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minimum_amount: number;
  expires_at: Date;
  is_active: boolean;
  used_by: { id: number } | null;
}

interface VoucherManagementClientProps {
  vouchers: Voucher[];
  businessSlug: string;
  initials: string;
}

export function VoucherManagementClient({
  vouchers,
  businessSlug,
  initials,
}: VoucherManagementClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    // In a real app we'd want a confirmation dialog here
    if (!confirm("Are you sure you want to delete this voucher?")) return;

    try {
      const res = await deleteVoucherAction(id);
      if (res.success) {
        toast.success("Voucher deleted");
      } else {
        toast.error(res.error || "Failed to delete voucher");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) =>
      voucher.code.toLowerCase().includes(search.toLowerCase()),
    );
  }, [vouchers, search]);

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 bg-zinc-50/50 ">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <PageHeader
          title="Vouchers"
          description="Manage discount codes and vouchers for your customers."
          className="mb-6"
        >
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Create Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Voucher</DialogTitle>
                <DialogDescription>
                  Create a promo code for your customers to use.
                </DialogDescription>
              </DialogHeader>
              <VoucherForm
                onSuccess={() => setIsCreateOpen(false)}
                initials={initials}
              />
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vouchers..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredVouchers.length === 0 ? (
            <Empty className="h-full border-2">
              <EmptyMedia variant="icon">
                <Ticket className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No vouchers found</EmptyTitle>
                <EmptyDescription>
                  {vouchers.length === 0
                    ? "Get started by creating your first voucher."
                    : "Try adjusting your search."}
                </EmptyDescription>
              </EmptyHeader>
              {vouchers.length === 0 && (
                <EmptyContent>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Voucher
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
                      <TableHead className="w-[200px]">Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Min. Spend</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((voucher) => (
                      <TableRow
                        key={voucher.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {voucher.code}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() =>
                                handleCopy(voucher.code, voucher.id)
                              }
                            >
                              {copiedId === voucher.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {voucher.type === "PERCENTAGE"
                            ? `${voucher.value}%`
                            : `₱${voucher.value.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          {voucher.minimum_amount > 0
                            ? `₱${voucher.minimum_amount.toFixed(2)}`
                            : "No limit"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {voucher.used_by ? (
                            <Badge variant="secondary">Used</Badge>
                          ) : !voucher.is_active ? (
                            <Badge variant="outline">Inactive</Badge>
                          ) : new Date(voucher.expires_at) < new Date() ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(voucher.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
