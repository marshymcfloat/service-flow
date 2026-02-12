import { describe, expect, it } from "vitest";
import {
  getEmployeeSpecialtySet,
  hasAnyAllowedCategoryForEmployee,
  isCategoryAllowedForEmployee,
} from "./employee-specialties";

describe("employee-specialties", () => {
  it("treats empty specialties as generalist access", () => {
    const specialtySet = getEmployeeSpecialtySet([]);

    expect(specialtySet).toBeNull();
    expect(isCategoryAllowedForEmployee("hair", specialtySet)).toBe(true);
  });

  it("treats explicit generalist specialty as full access", () => {
    const specialtySet = getEmployeeSpecialtySet(["Generalist"]);

    expect(specialtySet).toBeNull();
    expect(
      hasAnyAllowedCategoryForEmployee(["hair", "nails"], specialtySet),
    ).toBe(true);
  });

  it("matches categories case-insensitively", () => {
    const specialtySet = getEmployeeSpecialtySet(["Hair"]);

    expect(isCategoryAllowedForEmployee("hair", specialtySet)).toBe(true);
    expect(isCategoryAllowedForEmployee("HAIR", specialtySet)).toBe(true);
    expect(isCategoryAllowedForEmployee("nails", specialtySet)).toBe(false);
  });
});
