import { Service } from "@/prisma/generated/prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: number) => void;
  getCategoryColor: (category: string) => string;
}

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  getCategoryColor,
}: ServiceCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-3 transition-all active:scale-[0.99] active:bg-zinc-50/50">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-zinc-900 truncate">
              {service.name}
            </h3>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 font-medium border-0",
                getCategoryColor(service.category),
              )}
            >
              {service.category}
            </Badge>
          </div>
          {service.description && (
            <p className="text-xs text-zinc-500 line-clamp-2">
              {service.description}
            </p>
          )}
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
            <DropdownMenuItem onClick={() => onEdit(service)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              onClick={() => onDelete(service.id)}
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
            {service.duration ? `${service.duration} mins` : "—"}
          </span>
        </div>
        <span className="font-bold text-zinc-900">
          {formatCurrency(service.price)}
        </span>
      </div>
    </div>
  );
}
