import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function InboxPage() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
        <h2 className="text-xl font-semibold mb-4">Inbox</h2>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No new messages
        </div>
      </div>
    </div>
  );
}
