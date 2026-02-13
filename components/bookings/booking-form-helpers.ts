export const MANILA_TIME_ZONE = "Asia/Manila";

export const capitalizeWords = (value: string) => {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const maskEmail = (email: string) => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser =
    user.length > 2
      ? `${user.substring(0, 2)}***${user.substring(user.length - 1)}`
      : `${user}***`;
  return `${maskedUser}@${domain}`;
};

export const toPHDateString = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

export const buildServiceClaimUniqueId = (
  service: { id: number; packageId?: number },
  unitIndex: number,
) => `${service.id}-${service.packageId ? `pkg${service.packageId}` : "std"}-${unitIndex}`;
