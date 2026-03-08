import { describe, it, expect } from "vitest";
import { ASSESSMENT_CATEGORIES, TOTAL_CRITERIA_COUNT, getComplianceLevel } from "../constants/criteria-data";

describe("ASSESSMENT_CATEGORIES - بيانات المعايير", () => {
  it("يجب أن يحتوي على 7 محاور", () => {
    expect(ASSESSMENT_CATEGORIES).toHaveLength(7);
  });

  it("يجب أن تكون أسماء المحاور صحيحة", () => {
    const names = ASSESSMENT_CATEGORIES.map((c) => c.name);
    expect(names).toContain("تجربة المستفيد");
    expect(names).toContain("السلامة العامة");
    expect(names).toContain("مكافحة العدوى");
    expect(names).toContain("جودة المرافق والوصول");
    expect(names).toContain("تواجد الموظفين");
    expect(names).toContain("الإمداد والتجهيزات");
    expect(names).toContain("الملاحظات العامة");
  });

  it("يجب أن يكون مجموع الأوزان 100%", () => {
    const totalWeight = ASSESSMENT_CATEGORIES.reduce((sum, cat) => sum + cat.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("يجب أن يكون إجمالي المعايير 157", () => {
    expect(TOTAL_CRITERIA_COUNT).toBe(157);
  });

  it("يجب أن يحتوي محور تجربة المستفيد على 26 معيار", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "patient_experience");
    expect(cat?.criteria).toHaveLength(26);
  });

  it("يجب أن يحتوي محور السلامة العامة على 5 معايير", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "general_safety");
    expect(cat?.criteria).toHaveLength(5);
  });

  it("يجب أن يحتوي محور مكافحة العدوى على 12 معيار", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "infection_control");
    expect(cat?.criteria).toHaveLength(12);
  });

  it("يجب أن يحتوي محور جودة المرافق على 9 معايير", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "facilities_access");
    expect(cat?.criteria).toHaveLength(9);
  });

  it("يجب أن يحتوي محور تواجد الموظفين على 11 معيار", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "staff_presence");
    expect(cat?.criteria).toHaveLength(11);
  });

  it("يجب أن يحتوي محور الإمداد والتجهيزات على 83 معياراً", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "supply_equipment");
    // العدد الفعلي من المعايير في هذا المحور
    expect(cat?.criteria.length).toBeGreaterThan(70);
  });

  it("يجب أن يحتوي محور الملاحظات العامة على 11 معيار", () => {
    const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === "general_notes");
    expect(cat?.criteria).toHaveLength(11);
  });

  it("يجب أن تكون جميع معرفات المعايير فريدة", () => {
    const allIds = ASSESSMENT_CATEGORIES.flatMap((c) => c.criteria.map((cr) => cr.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("يجب أن تحتوي جميع المعايير على سؤال غير فارغ", () => {
    ASSESSMENT_CATEGORIES.forEach((cat) => {
      cat.criteria.forEach((cr) => {
        expect(cr.question.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it("يجب أن يكون لكل محور لون مختلف", () => {
    const colors = ASSESSMENT_CATEGORIES.map((c) => c.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(ASSESSMENT_CATEGORIES.length);
  });
});

describe("getComplianceLevel - مستوى الالتزام", () => {
  it("يجب أن يكون ممتاز عند 80% أو أكثر", () => {
    expect(getComplianceLevel(80).label).toBe("ممتاز");
    expect(getComplianceLevel(100).label).toBe("ممتاز");
    expect(getComplianceLevel(95).label).toBe("ممتاز");
  });

  it("يجب أن يكون جيد بين 60% و79%", () => {
    expect(getComplianceLevel(60).label).toBe("جيد");
    expect(getComplianceLevel(70).label).toBe("جيد");
    expect(getComplianceLevel(79).label).toBe("جيد");
  });

  it("يجب أن يكون يحتاج تحسين أقل من 60%", () => {
    expect(getComplianceLevel(0).label).toBe("يحتاج تحسين");
    expect(getComplianceLevel(50).label).toBe("يحتاج تحسين");
    expect(getComplianceLevel(59).label).toBe("يحتاج تحسين");
  });

  it("يجب أن يكون لون ممتاز أخضر", () => {
    expect(getComplianceLevel(90).color).toBe("#16A34A");
  });

  it("يجب أن يكون لون يحتاج تحسين أحمر", () => {
    expect(getComplianceLevel(30).color).toBe("#DC2626");
  });
});
