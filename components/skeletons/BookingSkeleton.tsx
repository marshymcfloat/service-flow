import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BookingSkeleton() {
  return (
    <Card className="w-full max-w-2xl shadow-lg border-border/50 bg-background/95">
      <CardHeader className="text-center space-y-4 pb-6 border-b flex flex-col items-center">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex flex-col items-center w-full">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}
