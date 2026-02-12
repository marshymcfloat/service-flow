"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/PageHeader";
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

import {
  createGiftCardAction,
  deleteGiftCardAction,
  generateGiftCardCodeAction,
  updateGiftCardAction,
} from "@/lib/server actions/gift-cards";
import {
  GiftCardForm,
  type GiftCardFormValues,
  type GiftCardOption,
} from "./GiftCardForm";
import { GiftCardList } from "./GiftCardList";

type GiftCardData = {
  id: number;
  code: string;
  customer_name: string;
  customer_email: string;
  expires_at: Date;
  is_claimed: boolean;
  included_services: { service: { id: number; name: string } }[];
  included_packages: { package: { id: number; name: string } }[];
};

interface GiftCardsPageClientProps {
  giftCards: GiftCardData[];
  services: GiftCardOption[];
  packages: GiftCardOption[];
  initials: string;
  businessSlug: string;
}

export function GiftCardsPageClient({
  giftCards,
  services,
  packages,
  initials,
  businessSlug,
}: GiftCardsPageClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGiftCard, setEditingGiftCard] = useState<GiftCardData | null>(
    null,
  );
  const [giftCardToDelete, setGiftCardToDelete] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredGiftCards = useMemo(() => {
    const query = search.toLowerCase();

    return giftCards.filter((giftCard) => {
      const matchesMainFields =
        giftCard.code.toLowerCase().includes(query) ||
        giftCard.customer_name.toLowerCase().includes(query) ||
        giftCard.customer_email.toLowerCase().includes(query);

      if (matchesMainFields) return true;

      const serviceMatch = giftCard.included_services.some((item) =>
        item.service.name.toLowerCase().includes(query),
      );

      const packageMatch = giftCard.included_packages.some((item) =>
        item.package.name.toLowerCase().includes(query),
      );

      return serviceMatch || packageMatch;
    });
  }, [giftCards, search]);

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Gift card code copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);

    try {
      const result = await generateGiftCardCodeAction();

      if (!result.success || !result.code) {
        toast.error(result.error || "Failed to generate code");
        return null;
      }

      return result.code;
    } catch {
      toast.error("Failed to generate code");
      return null;
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCreate = async (values: GiftCardFormValues) => {
    setIsSaving(true);

    try {
      const result = await createGiftCardAction(values);

      if (!result.success) {
        toast.error(result.error || "Failed to create gift card");
        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Gift card created and emailed successfully");
      }

      setIsCreateOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to create gift card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (values: GiftCardFormValues) => {
    if (!editingGiftCard) return;

    setIsSaving(true);

    try {
      const result = await updateGiftCardAction(editingGiftCard.id, values);

      if (!result.success) {
        toast.error(result.error || "Failed to update gift card");
        return;
      }

      toast.success("Gift card updated");
      setEditingGiftCard(null);
      router.refresh();
    } catch {
      toast.error("Failed to update gift card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteGiftCardAction(id);

        if (!result.success) {
          toast.error(result.error || "Failed to delete gift card");
          return;
        }

        toast.success("Gift card deleted");
        setGiftCardToDelete(null);
        router.refresh();
      } catch {
        toast.error("Failed to delete gift card");
      }
    });
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-zinc-50/50 p-4 md:p-8"
      data-business-slug={businessSlug}
    >
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <PageHeader
          title="Gift Cards"
          description="Create and manage gift cards for customer service or package claims"
          className="mb-8"
        >
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-emerald-600 px-6 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95">
                <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                <span className="font-semibold">Create Gift Card</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[95%] overflow-hidden rounded-3xl p-0 md:max-w-[860px]">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Create Gift Card
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Assign services or packages, set expiry, then send the code by
                  email.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto px-6 pb-6">
                <GiftCardForm
                  businessSlug={businessSlug}
                  initials={initials}
                  services={services}
                  packages={packages}
                  isSubmitting={isSaving}
                  isGeneratingCode={isGeneratingCode}
                  submitLabel="Create Gift Card"
                  onGenerateCode={handleGenerateCode}
                  onSubmit={handleCreate}
                />
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search gift cards..."
              className="h-10 rounded-xl border-zinc-200 bg-white pl-10 shadow-sm focus-visible:ring-emerald-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hidden h-10 gap-2 rounded-xl border-zinc-200 bg-white text-zinc-600 md:flex"
            onClick={() => router.refresh()}
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="flex-1">
          {filteredGiftCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/60 bg-white p-12 text-center shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50">
                <Gift className="h-6 w-6 text-zinc-300" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-zinc-900">
                No gift cards found
              </h3>
              <p className="mb-6 max-w-sm text-zinc-500">
                {giftCards.length === 0
                  ? "Start by creating your first gift card and sending it directly to the customer email."
                  : "Try adjusting your search terms."}
              </p>
              {giftCards.length === 0 && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Gift Card
                </Button>
              )}
            </div>
          ) : (
            <GiftCardList
              giftCards={filteredGiftCards}
              copiedId={copiedId}
              onCopy={handleCopy}
              onEdit={setEditingGiftCard}
              onDelete={setGiftCardToDelete}
            />
          )}
        </div>
      </section>

      <Dialog
        open={!!editingGiftCard}
        onOpenChange={(open) => !open && setEditingGiftCard(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-[95%] overflow-hidden rounded-3xl p-0 md:max-w-[860px]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-zinc-900">
              Edit Gift Card
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Update customer details, code, and included services/packages.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            {editingGiftCard && (
              <GiftCardForm
                businessSlug={businessSlug}
                initials={initials}
                services={services}
                packages={packages}
                initialData={editingGiftCard}
                isSubmitting={isSaving}
                isGeneratingCode={isGeneratingCode}
                submitLabel="Save Changes"
                onGenerateCode={handleGenerateCode}
                onSubmit={handleUpdate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!giftCardToDelete}
        onOpenChange={(open) => !open && setGiftCardToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gift Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the gift card record and code. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => giftCardToDelete && handleDelete(giftCardToDelete)}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
