"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BookingForm, {
  PackageWithItems,
} from "@/components/bookings/BookingForm";
import { Service } from "@/prisma/generated/prisma/client";
import { useState } from "react";

/* type PackageWithItems = ServicePackage & {
  items: any[]; // Adjust type if strictly needed, but 'any' or specific structure usually works for props passing if strict type isn't exported
};
 */
interface BookingDialogProps {
  services: Service[];
  packages?: PackageWithItems[]; // Using any to avoid complex type import chains if possible, will refine if needed
  categories: string[];
  businessSlug: string;
}

export function BookingDialog({
  services,
  packages = [],
  categories,
  businessSlug,
}: BookingDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-sm shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-6 h-11 transition-transform active:scale-95">
          <Plus className="h-4 w-4 md:mr-2" strokeWidth={3} />
          <span className="hidden md:inline font-semibold">New Booking</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="md:max-w-4xl! max-w-[95vw] max-h-[90vh] overflow-y-auto w-full p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <BookingForm
            services={services}
            packages={packages}
            categories={categories}
            isEmployee={true}
            isModal={true}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
