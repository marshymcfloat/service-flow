import { cn } from "@/lib/utils";

const DEFAULT_ERROR_MESSAGE = "We couldn't complete that action. Please try again.";
const DEFAULT_SUCCESS_MESSAGE = "Action completed successfully.";
const MAX_FLASH_MESSAGE_LENGTH = 180;

type RawSearchParamValue = string | string[] | undefined;
type RawSearchParams = Record<string, RawSearchParamValue>;
export type PlatformSearchParams = RawSearchParams | Promise<RawSearchParams>;

export type PlatformFlashMessage = {
  tone: "error" | "success";
  message: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function capLength(value: string) {
  return value.slice(0, MAX_FLASH_MESSAGE_LENGTH);
}

function decodeSearchParam(value: string) {
  const withSpaces = value.replaceAll("+", " ");
  try {
    return decodeURIComponent(withSpaces);
  } catch {
    return withSpaces;
  }
}

function readFirstSearchParam(value: RawSearchParamValue) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sanitizeFlashMessage(rawMessage: string, fallback: string) {
  const decoded = decodeSearchParam(rawMessage);
  const normalized = normalizeWhitespace(decoded);
  if (!normalized) {
    return fallback;
  }
  return capLength(normalized);
}

export function toActionErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
) {
  if (error instanceof Error) {
    return sanitizeFlashMessage(error.message, fallback);
  }
  if (typeof error === "string") {
    return sanitizeFlashMessage(error, fallback);
  }
  return fallback;
}

function addFlashParam(pathname: string, key: "error" | "success", rawMessage: string) {
  const params = new URLSearchParams();
  params.set(
    key,
    sanitizeFlashMessage(
      rawMessage,
      key === "error" ? DEFAULT_ERROR_MESSAGE : DEFAULT_SUCCESS_MESSAGE,
    ),
  );
  return `${pathname}?${params.toString()}`;
}

export function buildPlatformErrorPath(pathname: string, rawMessage?: string | null) {
  return addFlashParam(pathname, "error", rawMessage ?? DEFAULT_ERROR_MESSAGE);
}

export function buildPlatformSuccessPath(pathname: string, rawMessage?: string | null) {
  return addFlashParam(pathname, "success", rawMessage ?? DEFAULT_SUCCESS_MESSAGE);
}

export async function getPlatformFlashMessage(
  searchParams?: PlatformSearchParams,
): Promise<PlatformFlashMessage | null> {
  if (!searchParams) {
    return null;
  }

  const resolved = await searchParams;
  const error = readFirstSearchParam(resolved.error);
  if (error) {
    return {
      tone: "error",
      message: sanitizeFlashMessage(error, DEFAULT_ERROR_MESSAGE),
    };
  }

  const success = readFirstSearchParam(resolved.success);
  if (success) {
    return {
      tone: "success",
      message: sanitizeFlashMessage(success, DEFAULT_SUCCESS_MESSAGE),
    };
  }

  return null;
}

export function PlatformFlashNotice({ flash }: { flash: PlatformFlashMessage }) {
  return (
    <article
      role="status"
      className={cn(
        "rounded-2xl border p-4 text-sm",
        flash.tone === "error"
          ? "border-rose-300 bg-rose-50 text-rose-800"
          : "border-emerald-300 bg-emerald-50 text-emerald-800",
      )}
    >
      {flash.message}
    </article>
  );
}
