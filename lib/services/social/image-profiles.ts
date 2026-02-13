export const SOCIAL_IMAGE_PROFILES = [
  "PHOTO_REALISTIC",
  "SOFT_EDITORIAL",
  "MODERN_GRAPHIC",
  "BOLD_MONOCHROME",
] as const;

export type SocialImageProfile = (typeof SOCIAL_IMAGE_PROFILES)[number];

export const DEFAULT_SOCIAL_IMAGE_PROFILE: SocialImageProfile =
  "SOFT_EDITORIAL";

export const SOCIAL_IMAGE_PROFILE_OPTIONS: Array<{
  value: SocialImageProfile;
  label: string;
  description: string;
}> = [
  {
    value: "PHOTO_REALISTIC",
    label: "Realistic Photo",
    description: "Natural people, true-to-life lighting, and lifestyle vibe.",
  },
  {
    value: "SOFT_EDITORIAL",
    label: "Soft Editorial",
    description: "Clean spa aesthetic, premium whites, and elegant composition.",
  },
  {
    value: "MODERN_GRAPHIC",
    label: "Modern Graphic",
    description: "Template-like social post with shapes, framing, and bold layout.",
  },
  {
    value: "BOLD_MONOCHROME",
    label: "Bold Monochrome",
    description: "Dark high-contrast style with strong typography and dramatic feel.",
  },
];

export function isSocialImageProfile(value: string): value is SocialImageProfile {
  return (SOCIAL_IMAGE_PROFILES as readonly string[]).includes(value);
}
