import { prisma } from "@/prisma/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { revalidatePath } from "next/cache";
import LocationInputGroup from "@/components/business/LocationInputGroup";

export default async function BusinessSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    return <div>Business not found</div>;
  }

  async function updateBusiness(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;

    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;

    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    await prisma.business.update({
      where: { slug: businessSlug },
      data: {
        name,
        latitude: latitude,
        longitude: longitude,
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    revalidatePath(`/app/${businessSlug}/business`);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Business Settings</h2>
      </div>
      <Separator />

      <form action={updateBusiness}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Basic details about your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={business.name}
                  placeholder="e.g. BeautyFeel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Business Slug</Label>
                <Input
                  disabled
                  defaultValue={business.slug}
                  className="bg-zinc-50"
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  This is your unique identifier used in the URL. Only admins
                  can change this.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>
                Pin your business location on the map. This helps customers find
                you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationInputGroup
                initialLat={business.latitude}
                initialLng={business.longitude}
                businessSlug={businessSlug}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            {/* Using a simple submit button for now. 
                 Could be enhanced with useFormStatus for loading state later. */}
            <Button type="submit" size="lg">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
