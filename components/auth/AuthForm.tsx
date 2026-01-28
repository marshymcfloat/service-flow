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
import { LoaderCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();

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
        console.log("Logged in role:", session.user.role);
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
        className="space-y-4"
        onSubmit={form.handleSubmit(() => mutate())}
      >
        {formKeys.map((input) => (
          <FormField
            control={form.control}
            key={input}
            name={input}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="capitalize">{input}</FormLabel>
                <FormControl>
                  <Input {...field} type={input} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <LoaderCircle className="animate-spin" />}
            Login
          </Button>
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-sm font-medium">OR</span>
            <Separator className="flex-1" />
          </div>
          <Button variant={"outline"} type="button" disabled={isPending}>
            {isPending && <LoaderCircle className="animate-spin" />}
            <FaGoogle />
            Sign in with Google
          </Button>
        </div>
      </form>
    </Form>
  );
}
