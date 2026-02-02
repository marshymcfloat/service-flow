import { ServicePackage, Service } from "@/prisma/generated/prisma/client";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type ServicePackageWithItems = ServicePackage & {
  items: {
    service: Service;
    custom_price: number;
    service_id: number;
  }[];
};

interface PackageListProps {
  packages: ServicePackageWithItems[];
  onEdit: (pkg: ServicePackageWithItems) => void;
  onDelete: (pkgId: number) => void;
}

export function PackageList({ packages, onEdit, onDelete }: PackageListProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Hair: "bg-purple-100 text-purple-700 border-purple-200",
      Nails: "bg-pink-100 text-pink-700 border-pink-200",
      Facial: "bg-green-100 text-green-700 border-green-200",
      Massage: "bg-blue-100 text-blue-700 border-blue-200",
      Makeup: "bg-orange-100 text-orange-700 border-orange-200",
      default: "bg-zinc-100 text-zinc-700 border-zinc-200",
    };
    return colors[category] || colors.default;
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-3 transition-all active:scale-[0.99] active:bg-zinc-50/50"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-zinc-900 truncate">
                    {pkg.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-5 font-medium border-0",
                      getCategoryColor(pkg.category),
                    )}
                  >
                    {pkg.category}
                  </Badge>
                </div>
                {pkg.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                    {pkg.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {pkg.items.slice(0, 3).map((item) => (
                    <Badge
                      key={item.service_id}
                      variant="outline"
                      className="text-[10px] h-5 font-normal bg-zinc-50/50"
                    >
                      {item.service.name}
                    </Badge>
                  ))}
                  {pkg.items.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 font-normal bg-zinc-50/50 text-zinc-500"
                    >
                      +{pkg.items.length - 3} more
                    </Badge>
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
                  <DropdownMenuItem onClick={() => onEdit(pkg)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700"
                    onClick={() => onDelete(pkg.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-50 mt-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {pkg.duration ? `${pkg.duration} mins` : "—"}
                </span>
              </div>
              <span className="font-bold text-zinc-900">
                {formatCurrency(pkg.price)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="w-[250px] font-semibold text-zinc-500 pl-6 h-12">
                Package Name
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Included Services
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Category
              </TableHead>
              <TableHead className="font-semibold text-zinc-500 h-12">
                Duration
              </TableHead>
              <TableHead className="text-right font-semibold text-zinc-500 h-12">
                Price
              </TableHead>
              <TableHead className="text-right w-[100px] font-semibold text-zinc-500 pr-6 h-12">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow
                key={pkg.id}
                className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-zinc-900">
                      {pkg.name}
                    </span>
                    {pkg.description && (
                      <span className="text-xs text-zinc-500 line-clamp-1 max-w-[200px]">
                        {pkg.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {pkg.items.slice(0, 3).map((item) => (
                      <Badge
                        key={item.service_id}
                        variant="outline"
                        className="text-[10px] h-5 font-normal bg-white"
                      >
                        {item.service.name}
                      </Badge>
                    ))}
                    {pkg.items.length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 font-normal text-zinc-500 bg-zinc-50"
                      >
                        +{pkg.items.length - 3} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium border shadow-sm px-2.5 py-0.5 rounded-full",
                      getCategoryColor(pkg.category),
                    )}
                  >
                    {pkg.category}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-sm font-medium">
                      {pkg.duration} min
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-900 py-4">
                  {formatCurrency(pkg.price)}
                </TableCell>
                <TableCell className="text-right pr-6 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[160px] rounded-xl border-zinc-100 shadow-lg"
                    >
                      <DropdownMenuItem onClick={() => onEdit(pkg)}>
                        <Pencil className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        onClick={() => onDelete(pkg.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
