import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  setFormData: (data: CustomerFormData) => void;
}

export function CustomerForm({ formData, setFormData }: CustomerFormProps) {
  return (
    <div className="grid gap-5 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-zinc-500 font-medium">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            id="name"
            placeholder="e.g., Juan Dela Cruz"
            className="pl-10 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-zinc-500 font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            id="email"
            type="email"
            placeholder="juan@example.com"
            className="pl-10 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone" className="text-zinc-500 font-medium">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            id="phone"
            placeholder="e.g., 0912 345 6789"
            className="pl-10 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
