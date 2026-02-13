import { DiscountType } from "@/prisma/generated/prisma/enums";
import { logger } from "@/lib/logger";
import {
  generateGeminiText,
  isGeminiConfigured,
} from "@/lib/services/social/gemini-client";

export type CaptionGenerationInput = {
  businessSlug: string;
  businessName: string;
  businessDescription?: string | null;
  saleTitle: string;
  saleDescription?: string | null;
  discountType: DiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  serviceNames?: string[];
  serviceCategories?: string[];
  packageNames?: string[];
};

export type CaptionGenerationOutput = {
  caption: string;
  hashtags: string[];
};

const MAX_HASHTAG_LENGTH = 28;
const MIN_ACCEPTABLE_WORDS = 45;
const MIN_ACCEPTABLE_LINES = 6;
const REQUIRED_CTA_LINE = "Book now through ServiceFlow and claim your spot today.";
const REQUIRED_DISCOVERY_LINE = "and see everything they offer.";
const CAPTION_HOOK_STYLES = [
  "teasing-question",
  "bold-relatable-one-liner",
  "funny-work-burnout-callout",
  "self-care-guilty-pleasure",
] as const;
const CAPTION_PERSUASION_ANGLES = [
  "limited-slots urgency",
  "reward-yourself framing",
  "bestie-or-partner bonding",
  "confidence-and-glow-up outcome",
] as const;
const CAPTION_TONE_TWISTS = [
  "playful and cheeky",
  "warm and nurturing",
  "confident and premium",
  "lightly witty and conversational",
] as const;

type SeasonSignal = {
  seasonLabel: string;
  seasonLine: string;
};

function formatDiscount(discountType: DiscountType, discountValue: number) {
  if (discountType === "PERCENTAGE") {
    return `${discountValue}% OFF`;
  }
  return `PHP ${discountValue.toFixed(0)} OFF`;
}

function formatDateWindow(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
}

function toHashtagSeed(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function normalizeHashtag(value: string) {
  const seed = value.replace(/^#/, "").trim();
  if (!seed) return null;

  const compact = seed.replace(/[^a-zA-Z0-9_]/g, "");
  if (!compact) return null;

  if (compact.length > MAX_HASHTAG_LENGTH) {
    return `#${compact.slice(0, MAX_HASHTAG_LENGTH)}`;
  }

  return `#${compact}`;
}

function uniqueHashtags(values: string[]) {
  const normalized = values
    .map((value) => normalizeHashtag(value))
    .filter((value): value is string => !!value);

  return Array.from(new Set(normalized)).slice(0, 10);
}

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function dedupeCategories(values?: string[]) {
  if (!values?.length) return [];
  return Array.from(
    new Set(values.map((value) => normalizeCategory(value)).filter(Boolean)),
  ).slice(0, 6);
}

function buildFallbackHashtags(input: CaptionGenerationInput) {
  const serviceTags = (input.serviceNames ?? [])
    .map((name) => toHashtagSeed(name))
    .filter((tag) => tag.length > 0 && tag.length <= MAX_HASHTAG_LENGTH)
    .slice(0, 2);

  return uniqueHashtags([
    "ServiceFlow",
    "SelfCarePH",
    "SulitPromo",
    "BookNow",
    toHashtagSeed(input.businessName),
    ...dedupeCategories(input.serviceCategories).map((category) =>
      toHashtagSeed(category),
    ),
    ...serviceTags,
  ]);
}

function sanitizeBusinessSlug(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function buildServiceFlowUrl(businessSlug: string) {
  const slug = sanitizeBusinessSlug(businessSlug);
  return slug ? `www.serviceflow.store/${slug}` : "www.serviceflow.store";
}

function pickRandom<T>(items: readonly T[]) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function inferSeasonSignal(input: CaptionGenerationInput): SeasonSignal {
  const title = input.saleTitle.toLowerCase();
  const dateWindow = formatDateWindow(input.startDate, input.endDate);

  if (/(valentine|date|hearts?|love month|couple)/i.test(title)) {
    return {
      seasonLabel: "Valentine season",
      seasonLine:
        "Season cue from title: Valentine season and love-month self-care moments.",
    };
  }

  if (/(summer|tag-init|beach|sunshine|heat)/i.test(title)) {
    return {
      seasonLabel: "Summer season",
      seasonLine: "Season cue from title: Summer season, fresh glow, and feel-good reset.",
    };
  }

  if (/(christmas|xmas|holiday|new year|ber month|ber)/i.test(title)) {
    return {
      seasonLabel: "Holiday season",
      seasonLine:
        "Season cue from title: Holiday season prep, party-ready confidence, and gifting energy.",
    };
  }

  if (/(rainy|tag-ulan|ulan|monsoon)/i.test(title)) {
    return {
      seasonLabel: "Rainy season",
      seasonLine:
        "Season cue from title: Rainy-season comfort care and stress-relief downtime.",
    };
  }

  if (/(back to school|school|enrollment)/i.test(title)) {
    return {
      seasonLabel: "Back-to-school season",
      seasonLine:
        "Season cue from title: Back-to-school reset, confidence boost, and routine self-care.",
    };
  }

  if (/(holy week|easter|lenten|lent)/i.test(title)) {
    return {
      seasonLabel: "Holy Week season",
      seasonLine:
        "Season cue from title: Holy Week break and quiet recharge for body and mind.",
    };
  }

  if (/(mother|mother's|mothers day|nanay)/i.test(title)) {
    return {
      seasonLabel: "Mother's Day season",
      seasonLine:
        "Season cue from title: Mother's Day season and quality self-care time with family.",
    };
  }

  if (/(father|father's|fathers day|tatay)/i.test(title)) {
    return {
      seasonLabel: "Father's Day season",
      seasonLine:
        "Season cue from title: Father's Day season and recovery-focused wellness offers.",
    };
  }

  return {
    seasonLabel: "current promo season",
    seasonLine: `Season cue from title/date: "${input.saleTitle}" running ${dateWindow}.`,
  };
}

function buildCaptionPromptVariation() {
  return {
    hookStyle: pickRandom(CAPTION_HOOK_STYLES),
    persuasionAngle: pickRandom(CAPTION_PERSUASION_ANGLES),
    toneTwist: pickRandom(CAPTION_TONE_TWISTS),
    variationSeed: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000)}`,
  };
}

function isBulletLine(line: string) {
  return /^[-*•]\s+/.test(line.trim());
}

function isHeadingLikeLine(line: string) {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.startsWith("try these") ||
    normalized.startsWith("our services") ||
    normalized.startsWith("featured services") ||
    normalized.startsWith("included in this promo") ||
    normalized.startsWith("crowd favorites")
  );
}

function isCtaLine(line: string) {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.includes("book now") ||
    normalized.includes("reserve") ||
    normalized.includes("dm ") ||
    normalized.includes("message us") ||
    normalized.includes("call ")
  );
}

function formatCaptionForSocialFeed(value: string) {
  const sourceLines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (sourceLines.length === 0) {
    return value.trim();
  }

  const outputLines: string[] = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];
    const prev = sourceLines[index - 1] || "";
    const next = sourceLines[index + 1] || "";
    const lineIsBullet = isBulletLine(line);
    const prevIsBullet = isBulletLine(prev);
    const nextIsBullet = isBulletLine(next);

    const needsLeadingBreak =
      index > 0 &&
      !prevIsBullet &&
      (lineIsBullet || isHeadingLikeLine(line) || isCtaLine(line));

    if (needsLeadingBreak && outputLines[outputLines.length - 1] !== "") {
      outputLines.push("");
    }

    if (!lineIsBullet && prevIsBullet && outputLines[outputLines.length - 1] !== "") {
      outputLines.push("");
    }

    outputLines.push(line);

    if (!lineIsBullet && nextIsBullet) {
      outputLines.push("");
    }
  }

  return outputLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isServiceFlowEndingLine(line: string) {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.startsWith("book now through serviceflow") ||
    normalized.startsWith("www.serviceflow") ||
    normalized.startsWith("http://www.serviceflow") ||
    normalized.startsWith("https://www.serviceflow") ||
    normalized === REQUIRED_DISCOVERY_LINE ||
    normalized === "and see all what they offer"
  );
}

function enforceServiceFlowEnding(caption: string, businessSlug: string) {
  const bodyLines = caption
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !isServiceFlowEndingLine(line));

  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1]?.trim() === "") {
    bodyLines.pop();
  }

  const footerLines = [
    REQUIRED_CTA_LINE,
    buildServiceFlowUrl(businessSlug),
    REQUIRED_DISCOVERY_LINE,
  ];

  const body = bodyLines.join("\n").trim();
  const merged = body ? `${body}\n\n${footerLines.join("\n")}` : footerLines.join("\n");
  return formatCaptionForSocialFeed(merged);
}

function cleanCaptionText(value: string) {
  const cleaned = value
    .replace(/^\s*{\s*/, "")
    .replace(/^\s*"caption"\s*:\s*/i, "")
    .replace(/^"+/, "")
    .replace(/"+$/, "");

  const lines = cleaned
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(
      (line, index, array) => !(line.trim() === "" && index === array.length - 1),
    );

  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1]?.trim() || "";
    if (/^(#[A-Za-z0-9_]+\s*)+$/.test(lastLine)) {
      lines.pop();
      continue;
    }
    break;
  }

  return stripInternalMetaLines(lines.join("\n").trim());
}

function isInternalMetaLine(line: string) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith("focused categories:")) return true;
  if (normalized.startsWith("season cue from title")) return true;
  if (normalized.startsWith("season cue from title/date")) return true;
  if (normalized.includes("based on your") && normalized.includes("promo")) return true;
  if (normalized.includes("primary context source")) return true;

  return false;
}

function stripInternalMetaLines(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !isInternalMetaLine(line));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractHashtagsFromText(text: string) {
  const matches = text.match(/#[A-Za-z0-9_]+/g) ?? [];
  return uniqueHashtags(matches);
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countNonEmptyLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function looksTruncated(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  if (/[,:-]$/.test(trimmed)) return true;

  const incompleteEndings = [
    " in a",
    " with",
    " and",
    " or",
    " for",
    " to",
    " sa",
    " ng",
    " na",
    " des",
  ];

  return incompleteEndings.some((ending) => trimmed.endsWith(ending));
}

function isLowQualityCaption(value: string) {
  const words = countWords(value);
  const lines = countNonEmptyLines(value);
  return words < MIN_ACCEPTABLE_WORDS || lines < MIN_ACCEPTABLE_LINES || looksTruncated(value);
}

function buildRescueCaptionDraft(input: CaptionGenerationInput): CaptionGenerationOutput {
  const services = (input.serviceNames ?? []).slice(0, 4);
  const packages = (input.packageNames ?? []).slice(0, 2);
  const items = [...services, ...packages].slice(0, 5);
  const season = inferSeasonSignal(input).seasonLabel.toLowerCase();

  const lines = [
    `Single, taken, or "it's complicated" sa work? Deserve mo pa rin ng reset, bes.`,
    `${input.businessName} has a feel-good promo for you this season.`,
    `Sakto for ${season}, this ${input.saleTitle} offer is made for your glow-up.`,
    `${formatDiscount(input.discountType, input.discountValue)} on ${input.saleTitle} from ${formatDateWindow(input.startDate, input.endDate)}.`,
    input.saleDescription?.trim() || "",
    items.length > 0 ? "Try these crowd favorites:" : "",
    ...items.map((item) => `- ${item}`),
    "Perfect for stress relief, glow-up, and quality me-time.",
    "Pwede solo self-care day, pwede rin with your bestie or partner.",
    "Limited slots lang, so reserve early para sa preferred time mo.",
    "Book now through ServiceFlow and claim your spot today.",
  ].filter(Boolean);

  return {
    caption: formatCaptionForSocialFeed(lines.join("\n")),
    hashtags: buildFallbackHashtags(input),
  };
}

function finalizeCaptionOutput(
  output: CaptionGenerationOutput,
  input: CaptionGenerationInput,
): CaptionGenerationOutput {
  return {
    caption: enforceServiceFlowEnding(output.caption, input.businessSlug),
    hashtags: output.hashtags.length > 0 ? output.hashtags : buildFallbackHashtags(input),
  };
}

function buildGeminiPrompt(input: CaptionGenerationInput, dateWindow: string) {
  const season = inferSeasonSignal(input);
  const variation = buildCaptionPromptVariation();
  const categories = dedupeCategories(input.serviceCategories);
  const categoryLine = categories.length
    ? `Service categories (selected): ${categories.join(", ")}`
    : "Service categories (selected): none listed";
  const serviceLine = (input.serviceNames ?? []).length
    ? `Services: ${(input.serviceNames ?? []).join(", ")}`
    : "Services: none listed";
  const packageLine = (input.packageNames ?? []).length
    ? `Packages: ${(input.packageNames ?? []).join(", ")}`
    : "Packages: none listed";

  return [
    "Write a high-converting social media caption for a Filipino audience.",
    "Voice: playful, witty, natural, and human.",
    "Language: Taglish (Filipino + English), everyday conversational style.",
    "Goal: invite and persuade customers to book now.",
    "Use tasteful emoji and clear line breaks for readability.",
    "Primary campaign context must rely on Sale title first, then sale description, then date window.",
    "Infer season/occasion mostly from the sale title and make that theme explicit in the caption.",
    "",
    "Output format:",
    "Prefer valid JSON with this exact shape:",
    '{"caption":"string","hashtags":["#TagOne","#TagTwo"]}',
    "No markdown code fences and no extra keys.",
    "If JSON is not possible, return plain text caption only.",
    "",
    `Business: ${input.businessName}`,
    `Business description: ${input.businessDescription?.trim() || "N/A"}`,
    `Sale title (primary context source): ${input.saleTitle}`,
    `Sale description: ${input.saleDescription?.trim() || "N/A"}`,
    `Discount: ${formatDiscount(input.discountType, input.discountValue)}`,
    `Date window: ${dateWindow}`,
    `${season.seasonLine}`,
    `Creative variation seed: ${variation.variationSeed}`,
    `Hook style target: ${variation.hookStyle}`,
    `Persuasion angle target: ${variation.persuasionAngle}`,
    `Tone twist target: ${variation.toneTwist}`,
    categoryLine,
    serviceLine,
    packageLine,
    "",
    "Requirements:",
    "- Write 9-14 lines and at least 80 words.",
    "- First line must be a catchy hook question or statement.",
    "- Mention the season/occasion implied by the sale title in a natural way.",
    "- Use selected service categories to shape vocabulary, benefits, and hook angle.",
    "- Include concrete benefits and a clear limited-time nudge.",
    "- If services/packages are present, include 3-6 short bullet-style lines.",
    "- Add a warm invitation line (bestie/partner/family angle is okay when relevant).",
    "- Add a clear CTA to book through ServiceFlow.",
    "- Keep tone local, relatable, and not scripted.",
    '- Never output internal reasoning/meta lines like "Focused categories:" or "based on your ... promo."',
    "- Avoid fake urgency, medical claims, or spammy wording.",
    "- Hashtags should be 5-10 items, all start with # and have no spaces.",
  ].join("\n");
}

function buildGeminiRewritePrompt(input: CaptionGenerationInput, caption: string) {
  const season = inferSeasonSignal(input);
  const variation = buildCaptionPromptVariation();
  const categories = dedupeCategories(input.serviceCategories);
  const categoryLine = categories.length
    ? `Service categories (selected): ${categories.join(", ")}`
    : "Service categories (selected): none listed";
  return [
    "Rewrite this caption because the previous output is too short or incomplete.",
    "Keep the same offer details, but make it complete, persuasive, and natural in Taglish.",
    "Use the sale title as the primary source of campaign context and season cues.",
    "Return valid JSON only:",
    '{"caption":"string","hashtags":["#TagOne","#TagTwo"]}',
    "",
    `Business: ${input.businessName}`,
    `Sale title (primary context source): ${input.saleTitle}`,
    `${season.seasonLine}`,
    `Creative variation seed: ${variation.variationSeed}`,
    `Hook style target: ${variation.hookStyle}`,
    `Persuasion angle target: ${variation.persuasionAngle}`,
    `Tone twist target: ${variation.toneTwist}`,
    categoryLine,
    `Existing caption: ${caption}`,
    "",
    "Rewrite rules:",
    "- 9-14 lines and at least 80 words.",
    "- Include a hook, value section, and clear CTA.",
    "- Explicitly mention the season/occasion suggested by the sale title.",
    "- Use selected service categories to make the message specific and not generic.",
    "- Include bullet lines when services/packages are relevant.",
    "- Sound human, local, and warm.",
    '- Do not include internal/meta phrases like "Focused categories:" or "based on your ... promo."',
  ].join("\n");
}

function parseGeminiCaptionJson(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const candidates = [normalized];
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(normalized.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        caption?: unknown;
        hashtags?: unknown;
      };
      if (typeof parsed.caption !== "string") {
        continue;
      }

      const hashtags = Array.isArray(parsed.hashtags)
        ? uniqueHashtags(
            parsed.hashtags.filter(
              (value): value is string => typeof value === "string",
            ),
          )
        : [];

      return {
        caption: parsed.caption.trim(),
        hashtags,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function extractCaptionFromJsonishText(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const quotedMatch = normalized.match(
    /"caption"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"hashtags"|"\s*}|$)/i,
  );
  if (quotedMatch?.[1]) {
    return quotedMatch[1].replace(/\\"/g, '"').trim();
  }

  const plainMatch = normalized.match(/caption\s*:\s*([\s\S]+)/i);
  if (!plainMatch?.[1]) {
    return null;
  }

  const cleaned = plainMatch[1]
    .split(/\n\s*hashtags\s*:/i)[0]
    .replace(/[{}]/g, "")
    .replace(/^"+|"+$/g, "")
    .trim();

  return cleaned || null;
}

function parseCaptionCandidate(responseText: string, fallbackHashtags: string[]) {
  const parsed = parseGeminiCaptionJson(responseText);
  if (parsed?.caption) {
    return {
      caption: formatCaptionForSocialFeed(cleanCaptionText(parsed.caption)),
      hashtags: parsed.hashtags.length > 0 ? parsed.hashtags : fallbackHashtags,
    };
  }

  const jsonishCaption = extractCaptionFromJsonishText(responseText);
  if (jsonishCaption) {
    const hashtags = extractHashtagsFromText(responseText);
    return {
      caption: formatCaptionForSocialFeed(cleanCaptionText(jsonishCaption)),
      hashtags: hashtags.length > 0 ? hashtags : fallbackHashtags,
    };
  }

  const plainText = responseText.trim();
  if (!plainText) {
    return null;
  }

  const hashtags = extractHashtagsFromText(plainText);
  return {
    caption: formatCaptionForSocialFeed(cleanCaptionText(plainText)),
    hashtags: hashtags.length > 0 ? hashtags : fallbackHashtags,
  };
}

export async function generateSocialCaptionDraft(
  input: CaptionGenerationInput,
): Promise<CaptionGenerationOutput> {
  const rescue = finalizeCaptionOutput(buildRescueCaptionDraft(input), input);

  if (!isGeminiConfigured()) {
    return rescue;
  }

  const dateWindow = formatDateWindow(input.startDate, input.endDate);
  const model = process.env.GEMINI_CAPTION_MODEL || "gemini-3-flash-preview";

  try {
    const responseText = await generateGeminiText({
      model,
      prompt: buildGeminiPrompt(input, dateWindow),
      responseMimeType: "application/json",
      temperature: 1,
      maxOutputTokens: 900,
    });

    const candidate = parseCaptionCandidate(responseText, rescue.hashtags);
    if (!candidate) {
      return rescue;
    }

    if (!isLowQualityCaption(candidate.caption)) {
      return finalizeCaptionOutput(candidate, input);
    }

    logger.warn("[Social] Caption quality gate triggered. Running rewrite pass.", {
      wordCount: countWords(candidate.caption),
      lineCount: countNonEmptyLines(candidate.caption),
    });

    const rewrittenText = await generateGeminiText({
      model,
      prompt: buildGeminiRewritePrompt(input, candidate.caption),
      responseMimeType: "application/json",
      temperature: 1,
      maxOutputTokens: 900,
    });

    const rewritten = parseCaptionCandidate(rewrittenText, candidate.hashtags);
    if (!rewritten) {
      return rescue;
    }

    if (!isLowQualityCaption(rewritten.caption)) {
      return finalizeCaptionOutput(rewritten, input);
    }

    return rescue;
  } catch (error) {
    logger.warn("[Social] Falling back to rescue caption generation", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return rescue;
  }
}
