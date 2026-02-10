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
import { Check, Copy, Trash2, Ticket, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

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

interface VoucherListProps {
  vouchers: Voucher[];
  onDelete: (id: number) => void;
  onCopy: (code: string, id: number) => void;
  copiedId: number | null;
}

export function VoucherList({
  vouchers,
  onDelete,
  onCopy,
  copiedId,
}: VoucherListProps) {
  const getStatusBadge = (voucher: Voucher) => {
    if (voucher.used_by) {
      return (
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">
          Used
        </Badge>
      );
    }
    if (!voucher.is_active) {
      return (
        <Badge variant="outline" className="text-zinc-500 border-zinc-200">
          Inactive
        </Badge>
      );
    }
    if (new Date(voucher.expires_at) < new Date()) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
        >
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm">
        Active
      </Badge>
    );
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {vouchers.map((voucher) => (
          <div
            key={voucher.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-3 transition-all active:scale-[0.99] active:bg-zinc-50/50"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100">
                    <Ticket className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="font-mono text-sm font-semibold text-zinc-900 tracking-wide">
                      {voucher.code}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full"
                    onClick={() => onCopy(voucher.code, voucher.id)}
                  >
                    {copiedId === voucher.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-zinc-900 flex items-center gap-1">
                    {voucher.type === "PERCENTAGE"
                      ? `${voucher.value}% OFF`
                      : `₱${voucher.value.toFixed(2)} OFF`}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Min. spend:{" "}
                    {voucher.minimum_amount > 0
                      ? `₱${voucher.minimum_amount.toFixed(2)}`
                      : "None"}
                  </span>
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
                    onClick={() => onDelete(voucher.id)}
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
                  Expires {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                </span>
              </div>
              {getStatusBadge(voucher)}
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
                Voucher Code
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Discount Value
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Min. Spend
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Expires
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
            {vouchers.map((voucher) => (
              <TableRow
                key={voucher.id}
                className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-100 bg-zinc-50/50 group-hover:bg-white transition-colors">
                      <Ticket className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="font-mono text-sm font-medium text-zinc-700">
                        {voucher.code}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-emerald-600 hover:bg-emerald-50"
                      onClick={() => onCopy(voucher.code, voucher.id)}
                    >
                      {copiedId === voucher.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900">
                      {voucher.type === "PERCENTAGE"
                        ? `${voucher.value}%`
                        : `₱${voucher.value.toFixed(2)}`}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {voucher.type === "PERCENTAGE"
                        ? "Percentage"
                        : "Flat Amount"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-zinc-600 font-medium">
                  {voucher.minimum_amount > 0
                    ? `₱${voucher.minimum_amount.toFixed(2)}`
                    : "—"}
                </TableCell>
                <TableCell className="py-4 text-zinc-600">
                  {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="py-4">
                  {getStatusBadge(voucher)}
                </TableCell>
                <TableCell className="text-right pr-6 py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => onDelete(voucher.id)}
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
