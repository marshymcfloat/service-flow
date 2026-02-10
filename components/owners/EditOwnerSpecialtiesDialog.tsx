"use client";

import { useState, useTransition } from "react";
import { Owner, User } from "@/prisma/generated/prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateOwnerSpecialties } from "@/lib/server actions/dashboard/queries";

type OwnerWithUser = Owner & {
  user: User;
};

interface EditOwnerSpecialtiesDialogProps {
  owner: OwnerWithUser | null;
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditOwnerSpecialtiesDialog({
  owner,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: EditOwnerSpecialtiesDialogProps) {
  const [specialtiesByOwnerId, setSpecialtiesByOwnerId] = useState<
    Record<number, string[]>
  >({});
  const [isPending, startTransition] = useTransition();
  const ownerId = owner?.id;
  const specialties =
    ownerId !== undefined
      ? specialtiesByOwnerId[ownerId] ?? owner?.specialties ?? []
      : [];

  const isGeneralist = specialties.length === 0;

  const toggleSpecialty = (category: string) => {
    const exists = specialties.includes(category);
    const updated = exists
      ? specialties.filter((item) => item !== category)
      : [...specialties, category];
    if (ownerId === undefined) return;
    setSpecialtiesByOwnerId((prev) => ({ ...prev, [ownerId]: updated }));
  };

  const handleSave = () => {
    if (!owner) return;

    startTransition(async () => {
      const result = await updateOwnerSpecialties(owner.id, specialties);

      if (result.success) {
        toast.success("Owner specialties updated successfully");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to update specialties");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-zinc-900">
            Edit Service Specialties
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Update which service categories {owner?.user.name || "this owner"}{" "}
            can provide.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Specialties</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isGeneralist ? "default" : "outline"}
                  onClick={() => {
                    if (ownerId === undefined) return;
                    setSpecialtiesByOwnerId((prev) => ({
                      ...prev,
                      [ownerId]: [],
                    }));
                  }}
                  className="rounded-full"
                >
                  Generalist (All)
                </Button>
                {categories.map((category) => {
                  const isSelected = specialties.includes(category);
                  return (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => toggleSpecialty(category)}
                      className="rounded-full capitalize"
                    >
                      {category}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Select specialties or choose Generalist to allow all services.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-zinc-50/50 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
