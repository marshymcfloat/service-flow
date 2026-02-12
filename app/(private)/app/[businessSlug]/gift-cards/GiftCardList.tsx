import { format } from "date-fns";
import {
  Calendar,
  Check,
  Copy,
  Gift,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GiftCardListItem = {
  id: number;
  code: string;
  customer_name: string;
  customer_email: string;
  expires_at: Date;
  is_claimed: boolean;
  included_services: { service: { id: number; name: string } }[];
  included_packages: { package: { id: number; name: string } }[];
};

interface GiftCardListProps {
  giftCards: GiftCardListItem[];
  copiedId: number | null;
  onCopy: (code: string, id: number) => void;
  onEdit: (giftCard: GiftCardListItem) => void;
  onDelete: (id: number) => void;
}

function getStatusBadge(giftCard: GiftCardListItem) {
  if (giftCard.is_claimed) {
    return (
      <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
        Claimed
      </Badge>
    );
  }

  if (new Date(giftCard.expires_at) < new Date()) {
    return (
      <Badge
        variant="destructive"
        className="border-red-200 bg-red-100 text-red-700 hover:bg-red-100"
      >
        Expired
      </Badge>
    );
  }

  return (
    <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      Active
    </Badge>
  );
}

function includedItems(giftCard: GiftCardListItem) {
  return [
    ...giftCard.included_services.map((item) => item.service.name),
    ...giftCard.included_packages.map((item) => item.package.name),
  ];
}

export function GiftCardList({
  giftCards,
  copiedId,
  onCopy,
  onEdit,
  onDelete,
}: GiftCardListProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {giftCards.map((giftCard) => {
          const items = includedItems(giftCard);

          return (
            <div
              key={giftCard.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1">
                      <Gift className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-mono text-sm font-semibold tracking-wide text-zinc-900">
                        {giftCard.code}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      onClick={() => onCopy(giftCard.code, giftCard.id)}
                    >
                      {copiedId === giftCard.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {giftCard.customer_name}
                  </p>
                  <p className="text-xs text-zinc-500">{giftCard.customer_email}</p>
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
                  <DropdownMenuContent align="end" className="w-[160px] rounded-xl">
                    <DropdownMenuItem onClick={() => onEdit(giftCard)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-700"
                      onClick={() => onDelete(giftCard.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-1">
                {items.slice(0, 3).map((itemName) => (
                  <Badge
                    key={`${giftCard.id}-${itemName}`}
                    variant="outline"
                    className="h-5 bg-zinc-50 text-[10px] font-normal"
                  >
                    {itemName}
                  </Badge>
                ))}
                {items.length > 3 && (
                  <Badge
                    variant="outline"
                    className="h-5 bg-zinc-50 text-[10px] font-normal text-zinc-500"
                  >
                    +{items.length - 3} more
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-zinc-50 pt-3">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    Expires {format(new Date(giftCard.expires_at), "MMM d, yyyy")}
                  </span>
                </div>
                {getStatusBadge(giftCard)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-50/80 backdrop-blur-sm">
            <TableRow className="border-zinc-100 hover:bg-transparent">
              <TableHead className="h-12 w-[180px] pl-6 font-semibold text-zinc-500">
                Gift Card Code
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">Customer</TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">Included</TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">Expires</TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">Status</TableHead>
              <TableHead className="h-12 w-[90px] pr-6 text-right font-semibold text-zinc-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giftCards.map((giftCard) => {
              const items = includedItems(giftCard);

              return (
                <TableRow
                  key={giftCard.id}
                  className="group border-zinc-100 transition-colors hover:bg-zinc-50/50"
                >
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50/50 px-2.5 py-1 transition-colors group-hover:bg-white">
                        <Gift className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="font-mono text-sm font-medium text-zinc-700">
                          {giftCard.code}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 opacity-0 transition-all hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100"
                        onClick={() => onCopy(giftCard.code, giftCard.id)}
                      >
                        {copiedId === giftCard.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-zinc-900">
                        {giftCard.customer_name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {giftCard.customer_email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex max-w-[280px] flex-wrap gap-1">
                      {items.slice(0, 3).map((itemName) => (
                        <Badge
                          key={`${giftCard.id}-desktop-${itemName}`}
                          variant="outline"
                          className="h-5 bg-white text-[10px] font-normal"
                        >
                          {itemName}
                        </Badge>
                      ))}
                      {items.length > 3 && (
                        <Badge
                          variant="outline"
                          className="h-5 bg-zinc-50 text-[10px] font-normal text-zinc-500"
                        >
                          +{items.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {format(new Date(giftCard.expires_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="py-4">{getStatusBadge(giftCard)}</TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl">
                        <DropdownMenuItem onClick={() => onEdit(giftCard)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50 focus:text-red-700"
                          onClick={() => onDelete(giftCard.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
