"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Save, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getBusinessHours,
  updateBusinessHours,
  getServiceCategories,
  BusinessHourInput,
} from "@/lib/server actions/business-hours";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_HOURS = Array.from({ length: 7 }).map((_, i) => ({
  day_of_week: i,
  open_time: "09:00",
  close_time: "18:00",
  is_closed: i === 0 || i === 6 ? true : false, // Closed weekends by default
  category: "GENERAL",
}));

export default function BusinessHoursPage() {
  const params = useParams();
  const businessSlug = params.businessSlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [hours, setHours] = useState<BusinessHourInput[]>([]);
  const [activeCategory, setActiveCategory] = useState("GENERAL");

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedHours, fetchedCategories] = await Promise.all([
          getBusinessHours(businessSlug),
          getServiceCategories(businessSlug),
        ]);

        setCategories([
          "GENERAL",
          ...fetchedCategories.filter((c) => c !== "GENERAL"),
        ]);

        // Initialize hours if empty, or map existing
        if (fetchedHours.length === 0) {
          setHours(DEFAULT_HOURS);
        } else {
          // We need to ensure we have entries for all days and all categories
          // This is a bit complex as we might have gaps
          setHours(
            fetchedHours.map((h) => ({
              day_of_week: h.day_of_week,
              open_time: h.open_time,
              close_time: h.close_time,
              is_closed: h.is_closed,
              category: h.category,
            })),
          );
        }
      } catch (error) {
        toast.error("Failed to load business hours");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [businessSlug]);

  const handleTimeChange = (
    day: number,
    field: "open_time" | "close_time",
    value: string,
  ) => {
    setHours((prev) => {
      const existing = prev.find(
        (h) => h.day_of_week === day && h.category === activeCategory,
      );
      if (existing) {
        return prev.map((h) =>
          h.day_of_week === day && h.category === activeCategory
            ? { ...h, [field]: value }
            : h,
        );
      } else {
        // Create new entry if not exists
        return [
          ...prev,
          {
            day_of_week: day,
            open_time: field === "open_time" ? value : "18:00",
            close_time: field === "close_time" ? value : "09:00",
            is_closed: false,
            category: activeCategory,
          },
        ];
      }
    });
  };

  const toggleClosed = (day: number) => {
    setHours((prev) => {
      const existing = prev.find(
        (h) => h.day_of_week === day && h.category === activeCategory,
      );
      if (existing) {
        return prev.map((h) =>
          h.day_of_week === day && h.category === activeCategory
            ? { ...h, is_closed: !h.is_closed }
            : h,
        );
      } else {
        return [
          ...prev,
          {
            day_of_week: day,
            open_time: "09:00",
            close_time: "18:00",
            is_closed: true, // Toggling to closed
            category: activeCategory,
          },
        ];
      }
    });
  };

  const copyToAllDays = (sourceDay: number) => {
    const source = hours.find(
      (h) => h.day_of_week === sourceDay && h.category === activeCategory,
    );
    if (!source) return;

    setHours((prev) => {
      // Remove other days for this category
      const others = prev.filter((h) => h.category !== activeCategory);
      // Create new entries for all days
      const newEntries = Array.from({ length: 7 }).map((_, i) => ({
        ...source,
        day_of_week: i,
      }));
      return [...others, ...newEntries];
    });
    toast.success("Schedule copied to all days");
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Filter only current category to save? Or save all changes?
      // Better to save all state.
      await updateBusinessHours(businessSlug, hours);
      toast.success("Business hours saved");
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to ensure we render a row even if no data exists yet for that day/category
  const getHourForDay = (day: number) => {
    return (
      hours.find(
        (h) => h.day_of_week === day && h.category === activeCategory,
      ) || {
        day_of_week: day,
        open_time: "09:00",
        close_time: "18:00",
        is_closed: true, // Default to closed if not set? Or open? Let's say closed until configured.
        category: activeCategory,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Hours</h1>
          <p className="text-muted-foreground">
            Configure your operating hours for different service categories.
          </p>
        </div>
        <Button
          onClick={saveChanges}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent p-0 mb-6">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card hover:bg-muted/50 px-6 py-2 rounded-full"
            >
              {category === "GENERAL" ? "General Hours" : category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>
                  {category === "GENERAL"
                    ? "General Operating Hours"
                    : `${category} Hours`}
                </CardTitle>
                <CardDescription>
                  Set the weekly schedule for{" "}
                  {category === "GENERAL" ? "general services" : category}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {DAYS.map((dayName, index) => {
                  const hour = getHourForDay(index);
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-32 flex items-center gap-2">
                        <Switch
                          checked={!hour.is_closed}
                          onCheckedChange={() => toggleClosed(index)}
                        />
                        <span
                          className={`font-medium ${hour.is_closed ? "text-muted-foreground" : ""}`}
                        >
                          {dayName}
                        </span>
                      </div>

                      <div className="flex-1 flex items-center gap-4">
                        {hour.is_closed ? (
                          <div className="text-sm text-muted-foreground italic px-2">
                            Closed
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Select
                                value={hour.open_time}
                                onValueChange={(v) =>
                                  handleTimeChange(index, "open_time", v)
                                }
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-muted-foreground">-</span>
                              <Select
                                value={hour.close_time}
                                onValueChange={(v) =>
                                  handleTimeChange(index, "close_time", v)
                                }
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-muted-foreground hover:text-primary"
                              onClick={() => copyToAllDays(index)}
                              title="Copy to all days"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function generateTimeOptions() {
  const times = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, "0");
    times.push(`${hour}:00`);
    times.push(`${hour}:30`);
  }
  return times;
}
