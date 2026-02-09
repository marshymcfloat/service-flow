"use client";

import { Owner, User } from "@/prisma/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type OwnerWithUser = Owner & {
  user: User;
};

interface OwnersTableProps {
  owners: OwnerWithUser[];
  onEditSpecialties: (owner: OwnerWithUser) => void;
}

export function OwnersTable({ owners, onEditSpecialties }: OwnersTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {owners.map((owner) => (
          <Card
            key={owner.id}
            className="bg-white rounded-2xl shadow-sm border border-zinc-100"
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-amber-100 text-amber-700">
                    <AvatarFallback className="bg-amber-100 text-amber-700">
                      <Crown className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{owner.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {owner.user.email}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onEditSpecialties(owner)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <div className="pt-3 border-t border-zinc-50">
                <p className="text-xs text-muted-foreground mb-2">
                  Service Specialties
                </p>
                <div className="flex flex-wrap gap-1">
                  {owner.specialties.length > 0 ? (
                    owner.specialties.map((specialty) => (
                      <Badge
                        key={specialty}
                        variant="secondary"
                        className="text-xs"
                      >
                        {specialty}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      All services
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="pl-6 h-12 w-[300px]">Owner</TableHead>
              <TableHead className="h-12">Email</TableHead>
              <TableHead className="h-12">Service Specialties</TableHead>
              <TableHead className="text-right pr-6 h-12 w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((owner) => (
              <TableRow
                key={owner.id}
                className="border-zinc-100 hover:bg-zinc-50/50 transition-colors"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 bg-amber-100 text-amber-700">
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-medium">
                        {getInitials(owner.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {owner.user.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] h-5 px-1.5 border-amber-200 text-amber-700 bg-amber-50"
                      >
                        <Crown className="h-3 w-3 mr-0.5" />
                        Owner
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm text-muted-foreground">
                    {owner.user.email}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-1">
                    {owner.specialties.length > 0 ? (
                      owner.specialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="secondary"
                          className="text-xs"
                        >
                          {specialty}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        All services
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6 py-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-zinc-100"
                    onClick={() => onEditSpecialties(owner)}
                  >
                    <Edit className="h-4 w-4" />
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
