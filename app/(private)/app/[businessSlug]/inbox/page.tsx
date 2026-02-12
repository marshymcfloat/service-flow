import { redirect } from "next/navigation";

export const metadata = {
  title: "Inbox Unavailable",
};

export default async function InboxPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  redirect(`/app/${businessSlug}`);
}
