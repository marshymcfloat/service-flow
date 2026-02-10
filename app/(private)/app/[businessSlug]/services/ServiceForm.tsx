import { useState } from "react";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { Service } from "@/prisma/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface ServiceFlowData {
  suggested_service_id: string;
  delay_duration: string;
  delay_unit: "DAYS" | "WEEKS" | "MONTHS";
  type: "REQUIRED" | "SUGGESTED";
}

export interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  flows: ServiceFlowData[];
}

interface ServiceFormProps {
  formData: ServiceFormData;
  setFormData: (data: ServiceFormData) => void;
  categories: string[];
  newCategory: string;
  setNewCategory: (value: string) => void;
  services: Service[];
}

export function ServiceForm({
  formData,
  setFormData,
  categories,
  newCategory,
  setNewCategory,
  services,
}: ServiceFormProps) {
  const [showNewCategory, setShowNewCategory] = useState(false);

  const getEstimatedDate = (
    duration: string,
    unit: "DAYS" | "WEEKS" | "MONTHS",
  ) => {
    const num = parseInt(duration);
    if (isNaN(num)) return "";
    const today = new Date();
    let futureDate = today;
    if (unit === "DAYS") futureDate = addDays(today, num);
    if (unit === "WEEKS") futureDate = addWeeks(today, num);
    if (unit === "MONTHS") futureDate = addMonths(today, num);
    return format(futureDate, "MMM dd, yyyy");
  };

  const addFlow = () => {
    setFormData({
      ...formData,
      flows: [
        ...formData.flows,
        {
          suggested_service_id: "",
          delay_duration: "1",
          delay_unit: "WEEKS",
          type: "SUGGESTED",
        },
      ],
    });
  };

  const removeFlow = (index: number) => {
    const newFlows = [...formData.flows];
    newFlows.splice(index, 1);
    setFormData({ ...formData, flows: newFlows });
  };

  const updateFlow = <K extends keyof ServiceFlowData>(
    index: number,
    field: K,
    value: ServiceFlowData[K],
  ) => {
    const newFlows = [...formData.flows];
    newFlows[index] = { ...newFlows[index], [field]: value };
    setFormData({ ...formData, flows: newFlows });
  };

  return (
    <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">
            1
          </span>
          Basic Details
        </h3>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-zinc-600">
              Service Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Haircut, Manicure"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="h-9 rounded-lg border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-medium text-zinc-600"
            >
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="resize-none rounded-lg border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">
            2
          </span>
          Pricing & Category
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label
              htmlFor="price"
              className="text-xs font-medium text-zinc-600"
            >
              Price (₱) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="h-9 rounded-lg border-zinc-200"
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="duration"
              className="text-xs font-medium text-zinc-600"
            >
              Duration (mins)
            </Label>
            <Input
              id="duration"
              type="number"
              min="0"
              placeholder="e.g., 30"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              className="h-9 rounded-lg border-zinc-200"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs font-medium text-zinc-600">
            Category <span className="text-red-500">*</span>
          </Label>
          {showNewCategory ? (
            <div className="flex gap-2">
              <Input
                placeholder="New category..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-9 rounded-lg border-zinc-200"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory("");
                }}
                className="h-9 px-3 text-zinc-500"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="flex-1 h-9 rounded-lg border-zinc-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNewCategory(true)}
                title="Add new category"
                className="h-9 w-9 rounded-lg border-zinc-200"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">
              3
            </span>
            Service Flows
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFlow}
            className="h-7 text-xs rounded-lg border-dashed border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Add Step
          </Button>
        </div>

        {formData.flows.length === 0 ? (
          <div className="text-center py-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            <div className="flex justify-center mb-2">
              <Sparkles className="h-5 w-5 text-zinc-300" />
            </div>
            <p className="text-xs font-medium text-zinc-500">
              Automate next steps
            </p>
          </div>
        ) : (
          <div className="space-y-4 pl-1">
            {formData.flows.map((flow, index) => (
              <div key={index} className="relative pl-6 pb-2">
                {/* Timeline Line */}
                <div className="absolute left-[9px] top-6 bottom-0 w-px bg-emerald-100 last:bottom-auto last:h-full" />

                {/* Timeline Dot */}
                <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 z-10">
                  <Clock className="h-3 w-3" />
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-3 relative group hover:border-emerald-200 transition-colors">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => removeFlow(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>

                  <div className="flex flex-wrap items-center gap-2 text-sm mb-3 pr-6">
                    <span className="text-zinc-500 font-medium">Wait</span>
                    <Input
                      type="number"
                      min="0"
                      value={flow.delay_duration}
                      onChange={(e) =>
                        updateFlow(index, "delay_duration", e.target.value)
                      }
                      className="w-16 h-7 text-center rounded-md border-zinc-200"
                    />
                    <Select
                      value={flow.delay_unit}
                      onValueChange={(value) =>
                        updateFlow(
                          index,
                          "delay_unit",
                          value as ServiceFlowData["delay_unit"],
                        )
                      }
                    >
                      <SelectTrigger className="w-24 h-7 rounded-md border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAYS">Day(s)</SelectItem>
                        <SelectItem value="WEEKS">Week(s)</SelectItem>
                        <SelectItem value="MONTHS">Month(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-zinc-50/50 p-2.5 rounded-lg border border-zinc-100">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <span>Then</span>
                        <Select
                          value={flow.type}
                          onValueChange={(value) =>
                            updateFlow(
                              index,
                              "type",
                              value as ServiceFlowData["type"],
                            )
                          }
                        >
                          <SelectTrigger className="w-28 h-6 text-xs border-zinc-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SUGGESTED">Suggest</SelectItem>
                            <SelectItem value="REQUIRED">Require</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Select
                        value={flow.suggested_service_id}
                        onValueChange={(value) =>
                          updateFlow(index, "suggested_service_id", value)
                        }
                      >
                        <SelectTrigger className="w-full h-8 bg-white border-zinc-200">
                          <SelectValue placeholder="Select service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {flow.delay_duration && (
                    <div className="mt-2 text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      est.{" "}
                      {getEstimatedDate(flow.delay_duration, flow.delay_unit)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
