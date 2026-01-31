import { useQuery } from "@tanstack/react-query";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Search } from "lucide-react";
import { searchCustomer } from "@/lib/server actions/customer";
import { UseFormReturn } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { useDebounce } from "@/hooks/use-debounce";

export default function CustomerSearchInput({
  form,
  businessSlug,
}: {
  form: UseFormReturn<any>;
  businessSlug: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customer", debouncedSearchQuery, businessSlug],
    queryFn: () => searchCustomer(debouncedSearchQuery, businessSlug),
    enabled: debouncedSearchQuery.length > 0 && !!businessSlug,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectCustomer = (customer: {
    id: string;
    name: string;
    email?: string | null;
  }) => {
    form.setValue("customerId", customer.id);
    form.setValue("customerName", customer.name);
    form.setValue("email", customer.email || "");
    setSearchQuery(customer.name);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative flex w-full flex-col">
      <InputGroup>
        <InputGroupInput
          placeholder="Search customer"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
            form.setValue("customerName", e.target.value);
            form.setValue("customerId", "");
          }}
          onFocus={() => setShowResults(true)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      {showResults && searchQuery.length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
          {isLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : data?.success && data?.data && data.data.length > 0 ? (
            <div className="flex flex-col">
              {data.data.map((customer: any) => (
                <Button
                  key={customer.id}
                  variant="ghost"
                  className="justify-start rounded-none"
                  onClick={() => handleSelectCustomer(customer)}
                  type="button"
                >
                  {customer.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              No customers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
