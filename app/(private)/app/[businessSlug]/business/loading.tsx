import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function BusinessSettingsLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-64" /> {/* Title: Business Settings */}
      </div>
      <Separator />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" /> {/* Card Title */}
            <Skeleton className="h-4 w-72" /> {/* Card Description */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-32" /> {/* Label: Business Name */}
              <Skeleton className="h-10 w-full" /> {/* Input */}
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-32" /> {/* Label: Business Slug */}
              <Skeleton className="h-10 w-full" /> {/* Input */}
              <Skeleton className="h-3 w-64" /> {/* Helper text */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" /> {/* Card Title: Location */}
            <Skeleton className="h-4 w-96" /> {/* Card Description */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* Label: Latitude */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> {/* Label: Longitude */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
            </div>
            {/* Map placeholder */}
            <Skeleton className="h-[400px] w-full rounded-md" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Skeleton className="h-11 w-32" /> {/* Save Button */}
        </div>
      </div>
    </div>
  );
}
