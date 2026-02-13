"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Trash2, Percent, Calendar, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { DiscountType } from "@/prisma/generated/prisma/enums";
import type { SocialPostStatus } from "@/prisma/generated/prisma/enums";
import type { SaleEventRef } from "@/lib/utils/pricing";

export interface SaleEvent {
  id: number;
  title: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  discount_type: DiscountType;
  discount_value: number;
  applicable_services: SaleEventRef[];
  applicable_packages: SaleEventRef[];
  social_posts?: { id: string; status: SocialPostStatus }[];
}

interface SaleEventListProps {
  events: SaleEvent[];
  onDelete: (id: number) => void;
}

export function SaleEventList({ events, onDelete }: SaleEventListProps) {
  const getSocialSummary = (event: SaleEvent) => {
    if (!event.social_posts || event.social_posts.length === 0) {
      return null;
    }

    const published = event.social_posts.filter(
      (post) => post.status === "PUBLISHED",
    ).length;
    const failed = event.social_posts.filter(
      (post) => post.status === "FAILED",
    ).length;

    if (failed > 0) return `${failed} failed`;
    if (published === event.social_posts.length) return "Published";
    return `${event.social_posts.length} draft(s)`;
  };

  const getStatusBadge = (event: SaleEvent) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    if (now > end) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
        >
          Expired
        </Badge>
      );
    }
    if (now < start) {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"
        >
          Upcoming
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm">
        Active
      </Badge>
    );
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 mb-4 transition-transform hover:scale-105 duration-300">
          <Percent className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">
          No sale events yet
        </h3>
        <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">
          Create a new sale event to attract more customers and boost your
          revenue.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-3 transition-all active:scale-[0.99] active:bg-zinc-50/50"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="font-medium text-sm text-zinc-900 tracking-wide">
                      {event.title}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-zinc-900 flex items-center gap-1">
                    {event.discount_type === "PERCENTAGE"
                      ? `${event.discount_value}% OFF`
                      : `₱${event.discount_value.toFixed(2)} OFF`}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {event.applicable_services.length} Services,{" "}
                    {event.applicable_packages.length} Packages
                  </span>
                  {getSocialSummary(event) && (
                    <span className="text-xs text-zinc-600">
                      Social: {getSocialSummary(event)}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 h-8 w-8 text-zinc-400 hover:text-zinc-600"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[160px] rounded-xl"
                >
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-50 mt-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {format(new Date(event.start_date), "MMM d")} -{" "}
                  {format(new Date(event.end_date), "MMM d, yyyy")}
                </span>
              </div>
              {getStatusBadge(event)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="w-[200px] font-semibold text-zinc-500 pl-6 h-12">
                Event Name
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Discount
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Scope
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Duration
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Status
              </TableHead>
              <TableHead className="text-right w-[100px] font-semibold text-zinc-500 pr-6 h-12">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow
                key={event.id}
                className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-100 bg-zinc-50/50 group-hover:bg-white transition-colors">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="font-medium text-sm text-zinc-700">
                        {event.title}
                      </span>
                    </div>
                    {getSocialSummary(event) && (
                      <span className="text-xs text-zinc-500">
                        Social: {getSocialSummary(event)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900">
                      {event.discount_type === "PERCENTAGE"
                        ? `${event.discount_value}%`
                        : `₱${event.discount_value.toFixed(2)}`}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {event.discount_type === "PERCENTAGE"
                        ? "Percentage"
                        : "Flat Amount"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-zinc-600 font-medium">
                  {event.applicable_services.length +
                    event.applicable_packages.length}{" "}
                  Items
                </TableCell>
                <TableCell className="py-4 text-zinc-600">
                  <div className="flex flex-col text-xs">
                    <span>
                      {format(new Date(event.start_date), "MMM d, yyyy")}
                    </span>
                    <span className="text-zinc-400">to</span>
                    <span>
                      {format(new Date(event.end_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4">{getStatusBadge(event)}</TableCell>
                <TableCell className="text-right pr-6 py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
