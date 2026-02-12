import { z } from "zod";

const coreEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
});

const urlEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    APP_URL: z.string().url().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NEXT_PUBLIC_APP_URL || value.APP_URL || value.NEXTAUTH_URL) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXT_PUBLIC_APP_URL"],
      message:
        "Set one of NEXT_PUBLIC_APP_URL, APP_URL, or NEXTAUTH_URL so email/redirect links are absolute.",
    });
  });

const cronEnvSchema = z
  .object({
    CRON_SECRET: z.string().min(1).optional(),
    CRON_PASSWORD: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.CRON_SECRET || value.CRON_PASSWORD) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CRON_SECRET"],
      message: "Set CRON_SECRET or CRON_PASSWORD so cron routes remain protected.",
    });
  });

let hasValidated = false;

function getEnvIssues() {
  const coreResult = coreEnvSchema.safeParse(process.env);
  const urlResult = urlEnvSchema.safeParse(process.env);
  const cronResult = cronEnvSchema.safeParse(process.env);

  const issues = [
    ...(coreResult.success ? [] : coreResult.error.issues),
    ...(urlResult.success ? [] : urlResult.error.issues),
    ...(cronResult.success ? [] : cronResult.error.issues),
  ];

  return issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function validateServerRuntimeEnv(options?: { strict?: boolean }) {
  if (hasValidated) {
    return;
  }

  const strict = options?.strict ?? process.env.NODE_ENV === "production";
  const issues = getEnvIssues();
  if (issues.length === 0) {
    hasValidated = true;
    return;
  }

  const message = `[EnvValidation] ${issues.join(" | ")}`;
  if (strict) {
    throw new Error(message);
  }

  console.warn(message);
  hasValidated = true;
}
