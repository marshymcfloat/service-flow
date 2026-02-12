const GENERALIST_SPECIALTY = "generalist";

function normalizeSpecialtyValue(value: string) {
  return value.trim().toLowerCase();
}

export function getEmployeeSpecialtySet(
  specialties?: string[] | null,
): Set<string> | null {
  const normalized = (specialties ?? [])
    .map(normalizeSpecialtyValue)
    .filter(Boolean);

  if (
    normalized.length === 0 ||
    normalized.includes(GENERALIST_SPECIALTY)
  ) {
    return null;
  }

  return new Set(normalized);
}

export function isCategoryAllowedForEmployee(
  category: string | null | undefined,
  specialtySet: Set<string> | null,
) {
  if (!specialtySet) return true;
  if (!category) return false;

  return specialtySet.has(normalizeSpecialtyValue(category));
}

export function hasAnyAllowedCategoryForEmployee(
  categories: Array<string | null | undefined>,
  specialtySet: Set<string> | null,
) {
  if (!specialtySet) return true;

  return categories.some((category) =>
    isCategoryAllowedForEmployee(category, specialtySet),
  );
}
