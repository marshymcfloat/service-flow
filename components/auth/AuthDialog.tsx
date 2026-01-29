import Image from "next/image";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
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
          <Button className="absolute top-4 right-4 bg-white/50 backdrop-blur-md hover:bg-white/80 text-green-950 border border-green-200/50 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer">
            Get Started
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex min-w-[900px]! min-h-[500px]">
        <div className="flex-1 flex justify-center items-center  ">
          <Image
            src={"/ServiceFlow2-logo.png"}
            width={500}
            height={500}
            alt="ServiceFlow Logo"
          />
        </div>
        <div className="flex-1 ">
          <DialogHeader>
            <DialogTitle className="text-center">ServiceFlow</DialogTitle>
          </DialogHeader>
          <div className="w-full h-full flex flex-col justify-center ">
            <AuthForm />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
