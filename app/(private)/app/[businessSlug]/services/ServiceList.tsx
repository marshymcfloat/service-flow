import { memo } from "react";
import { Service } from "@/prisma/generated/prisma/client";
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
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ServiceCard } from "./ServiceCard";
import { cn } from "@/lib/utils";

interface ServiceListProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (serviceId: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Hair: "bg-purple-100 text-purple-700 border-purple-200",
  Nails: "bg-pink-100 text-pink-700 border-pink-200",
  Facial: "bg-green-100 text-green-700 border-green-200",
  Massage: "bg-blue-100 text-blue-700 border-blue-200",
  Makeup: "bg-orange-100 text-orange-700 border-orange-200",
  default: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}

function ServiceListComponent({ services, onEdit, onDelete }: ServiceListProps) {

  return (
    <>
      <div className="md:hidden grid grid-cols-1 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onEdit={onEdit}
            onDelete={onDelete}
            getCategoryColor={getCategoryColor}
          />
        ))}
      </div>

      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="w-[300px] font-semibold text-zinc-500 pl-6 h-12">
                Service
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
            {services.map((service) => (
              <TableRow
                key={service.id}
                className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-zinc-900">
                      {service.name}
                    </span>
                    {service.description && (
                      <span className="text-xs text-zinc-500 line-clamp-1 max-w-[250px]">
                        {service.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium border shadow-sm px-2.5 py-0.5 rounded-full",
                      getCategoryColor(service.category),
                    )}
                  >
                    {service.category}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  {service.duration ? (
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-sm font-medium">
                        {service.duration} min
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-zinc-900 py-4">
                  {formatCurrency(service.price)}
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
                      <DropdownMenuItem onClick={() => onEdit(service)}>
                        <Pencil className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        onClick={() => onDelete(service.id)}
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

export const ServiceList = memo(ServiceListComponent);
