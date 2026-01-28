import AuthDialog from "@/components/auth/AuthDialog";

export default function Home() {
  return (
    <main className="min-h-screen w-screen bg-linear-to-bl from-green-100 to-green-100 via-green-200">
      <AuthDialog />
      <section className="w-full h-screen flex items-center justify-center">
        <div className="">
          <h1 className="text-8xl font-bold font-sans tracking-widest">
            ServiceFlow
          </h1>
          <p className="text-center text-gray-600 text-xl">
            Manage your business with ease
          </p>
        </div>
      </section>
    </main>
  );
}
