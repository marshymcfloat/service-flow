import { useQuery } from "@tanstack/react-query";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Search } from "lucide-react";
import { searchCustomer } from "@/lib/server actions/customer";
import { UseFormReturn } from "react-hook-form";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { useDebounce } from "@/hooks/use-debounce";

const CustomerSearchInput = React.memo(function CustomerSearchInput({
  form,
  businessSlug,
  onCustomerSelect,
  ...props
}: {
  form: UseFormReturn<any>;
  businessSlug: string;
  onCustomerSelect?: (customer: any) => void;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}) {
  const inputValue = props.value || "";
  const debouncedSearchQuery = useDebounce(inputValue, 300);
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
    // Call parent onChange to update customerName
    if (props.onChange) {
      props.onChange(customer.name);
    } else {
      form.setValue("customerName", customer.name);
    }
    form.setValue("email", customer.email || "");
    setShowResults(false);
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
  };

  return (
    <div ref={containerRef} className="relative flex w-full flex-col">
      <InputGroup>
        <InputGroupInput
          placeholder="Search customer"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (props.onChange) {
              props.onChange(newValue);
            } else {
              // Fallback if no onChange prop
              form.setValue("customerName", newValue);
            }
            setShowResults(true);
            form.setValue("customerId", "");
          }}
          onBlur={props.onBlur}
          onFocus={() => setShowResults(true)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      {showResults && inputValue.length > 0 && (
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
});

export default CustomerSearchInput;
