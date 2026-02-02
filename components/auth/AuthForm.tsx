"use client";

import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { loginSchema, LoginSchemaType } from "@/lib/zod schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { FaGoogle } from "react-icons/fa6";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { signIn, getSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Mail, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AuthForm() {
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const formKeys = Object.keys(loginSchema.shape) as (keyof LoginSchemaType)[];

  const { mutate, isPending } = useMutation({
    mutationFn: handleSigningIn,
    onSuccess: (session) => {
      if (session?.user.role) {
        if (session.user.role === "EMPLOYEE") {
          router.push(`/app/${session.user.businessSlug}`);
        } else if (session.user.role === "OWNER") {
          router.push(`/app/${session.user.businessSlug}`);
        }
      }
    },
  });

  async function handleSigningIn() {
    const result = await signIn("credentials", {
      email: form.getValues("email"),
      password: form.getValues("password"),
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("password")) {
        form.setError("password", { message: result.error });
      } else if (
        result.error.includes("email") ||
        result.error.includes("user")
      ) {
        form.setError("email", { message: result.error });
      } else {
        form.setError("root", { message: result.error });
      }
      throw new Error(result.error);
    }

    return await getSession();
  }

  return (
    <Form {...form}>
      <form
        action=""
        className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
        onSubmit={form.handleSubmit(() => mutate())}
      >
        <div className="space-y-5">
          {formKeys.map((input, index) => (
            <FormField
              control={form.control}
              key={input}
              name={input}
              render={({ field }) => (
                <FormItem
                  className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-backwards"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <FormLabel className="text-sm font-medium text-slate-600 ml-1">
                    {input.charAt(0).toUpperCase() + input.slice(1)}
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div
                        className={cn(
                          "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300 z-10",
                          focusedField === input && "text-emerald-600",
                        )}
                      >
                        {input === "email" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <Input
                        {...field}
                        type={input}
                        onFocus={(e) => {
                          setFocusedField(input);
                          field.onBlur();
                        }}
                        onBlur={() => {
                          setFocusedField(null);
                          field.onBlur();
                        }}
                        className={cn(
                          "pl-10 h-12 bg-slate-50 border-slate-200 text-base transition-all duration-300",
                          "focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:bg-white",
                          "hover:border-emerald-200",
                        )}
                        placeholder={
                          input === "email" ? "name@example.com" : "••••••••"
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs ml-1" />
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 ease-out fill-mode-backwards">
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:bg-emerald-700 transition-all duration-300 hover:-translate-y-0.5"
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="animate-spin mr-2" />
            ) : (
              "Login to Dashboard"
            )}
          </Button>

          <div className="flex items-center gap-4">
            <Separator className="flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or continue with
            </span>
            <Separator className="flex-1 bg-slate-200" />
          </div>

          <Button
            variant={"outline"}
            type="button"
            disabled={isPending}
            className="w-full h-12 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300"
          >
            {isPending ? (
              <LoaderCircle className="animate-spin mr-2" />
            ) : (
              <FaGoogle className="mr-2 h-4 w-4" />
            )}
            Google
          </Button>
        </div>
      </form>
    </Form>
  );
}
