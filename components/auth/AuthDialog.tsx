import Image from "next/image";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import AuthForm from "./AuthForm";

export default function AuthDialog({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button className="absolute right-4 top-4 cursor-pointer border border-green-200/50 bg-white/50 text-green-950 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/80 hover:shadow-md">
            Get Started
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[425px] overflow-hidden p-0! md:max-w-4xl lg:max-w-5xl bg-gray-100">
        <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 md:h-[600px]">
          <div className="relative hidden flex-col items-center justify-center bg-muted/30 p-8 md:flex">
            <div className="absolute inset-0 bg-gray-100" />
            <Image
              src={"/ServiceFlow2-logo.png"}
              width={400}
              height={400}
              alt="ServiceFlow Logo"
              className="relative z-10 object-contain drop-shadow-xl"
              priority
            />
            <div className="relative z-10 mt-8 text-center">
              <h3 className="text-xl font-bold text-green-950">
                Streamline Your Business
              </h3>
              <p className="mt-2 text-sm text-green-800/80">
                Manage employees, bookings, and payroll in one place.
              </p>
            </div>
          </div>
          <div className="flex h-full flex-col justify-center p-6 md:p-10 lg:p-12 rounded-l-4xl bg-white">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-2xl font-bold lg:text-3xl">
                Welcome Back
              </DialogTitle>
              <DialogDescription>
                Sign in to your account to continue
              </DialogDescription>
            </DialogHeader>
            <div className="w-full">
              <AuthForm />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
