"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, Search, Ticket, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { deleteVoucherAction } from "@/lib/server actions/vouchers";
import { VoucherForm } from "./VoucherForm";
import { VoucherList } from "./VoucherList";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [voucherToDelete, setVoucherToDelete] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    startTransition(async () => {
      try {
        const res = await deleteVoucherAction(id);
        if (res.success) {
          toast.success("Voucher deleted");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to delete voucher");
        }
      } catch (error) {
        toast.error("An error occurred");
      }
      setVoucherToDelete(null);
    });
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) =>
      voucher.code.toLowerCase().includes(search.toLowerCase()),
    );
  }, [vouchers, search]);

  return (
    <div className="flex flex-col p-4 md:p-8 bg-zinc-50/50 min-h-screen">
      <section className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <PageHeader
          title="Vouchers"
          description="Manage discount codes and vouchers for your customers."
          className="mb-8"
        >
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 rounded-full px-6">
                <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                <span className="font-semibold">Create Voucher</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 gap-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Create New Voucher
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Create a promo code for your customers to use.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-4 pb-6">
                <VoucherForm
                  onSuccess={() => {
                    setIsCreateOpen(false);
                    router.refresh();
                  }}
                  initials={initials}
                />
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search vouchers..."
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

        <div className="flex-1">
          {filteredVouchers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Ticket className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                No vouchers found
              </h3>
              <p className="text-zinc-500 max-w-sm mb-6">
                {vouchers.length === 0
                  ? "Get started by creating your first voucher to boost sales."
                  : "Try adjusting your search terms."}
              </p>
              {vouchers.length === 0 && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Voucher
                </Button>
              )}
            </div>
          ) : (
            <VoucherList
              vouchers={filteredVouchers}
              onDelete={setVoucherToDelete}
              onCopy={handleCopy}
              copiedId={copiedId}
            />
          )}
        </div>
      </section>

      <AlertDialog
        open={!!voucherToDelete}
        onOpenChange={(open) => !open && setVoucherToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this voucher. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
              onClick={() => voucherToDelete && handleDelete(voucherToDelete)}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
