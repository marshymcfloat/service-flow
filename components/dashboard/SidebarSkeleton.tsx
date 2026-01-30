import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

export function SidebarSkeleton() {
  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <SidebarHeader>
        <Skeleton className="h-8 w-full rounded-md" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className="h-12 w-full rounded-md" />
      </SidebarFooter>
    </div>
  );
}
