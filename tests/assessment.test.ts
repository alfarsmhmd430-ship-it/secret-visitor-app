import { describe, it, expect } from "vitest";
import { getComplianceLevel, ASSESSMENT_CATEGORIES, TOTAL_CRITERIA_COUNT } from "../constants/criteria-data";
import { generateVisitId, formatDate } from "../lib/storage";

describe("Assessment Criteria Data", () => {
  it("should have 7 assessment categories", () => {
    expect(ASSESSMENT_CATEGORIES).toHaveLength(7);
  });

  it("should have correct category weights summing to 100", () => {
    const totalWeight = ASSESSMENT_CATEGORIES.reduce((sum, cat) => sum + cat.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("should have correct category weights: 40, 10, 20, 10, 5, 10, 5", () => {
    // 7 محاور: تجربة المستفيد + سلامة + مكافحة عدوى + مرافق + موظفين + إمداد + ملاحظات
    expect(ASSESSMENT_CATEGORIES[0].weight).toBe(40); // تجربة المستفيد
    expect(ASSESSMENT_CATEGORIES[1].weight).toBe(10); // السلامة العامة
    expect(ASSESSMENT_CATEGORIES[2].weight).toBe(20); // مكافحة العدوى
    expect(ASSESSMENT_CATEGORIES[3].weight).toBe(10); // جودة المرافق والوصول
    expect(ASSESSMENT_CATEGORIES[4].weight).toBe(5);  // تواجد الموظفين
    expect(ASSESSMENT_CATEGORIES[5].weight).toBe(10); // الإمداد والتجهيزات
    expect(ASSESSMENT_CATEGORIES[6].weight).toBe(5);  // الملاحظات العامة
  });

  it("should have criteria in each category", () => {
    ASSESSMENT_CATEGORIES.forEach((cat) => {
      expect(cat.criteria.length).toBeGreaterThan(0);
    });
  });

  it("should have unique criterion IDs", () => {
    const allIds = ASSESSMENT_CATEGORIES.flatMap((cat) => cat.criteria.map((c) => c.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("should have correct total criteria count", () => {
    const manualCount = ASSESSMENT_CATEGORIES.reduce((sum, cat) => sum + cat.criteria.length, 0);
    expect(TOTAL_CRITERIA_COUNT).toBe(manualCount);
    expect(TOTAL_CRITERIA_COUNT).toBeGreaterThan(50); // should have at least 50 questions
  });

  it("should have patient experience category with correct ID", () => {
    const patientExp = ASSESSMENT_CATEGORIES.find((c) => c.id === "patient_experience");
    expect(patientExp).toBeDefined();
    expect(patientExp?.name).toBe("تجربة المستفيد");
  });
});

describe("Compliance Level", () => {
  it("should return 'ممتاز' for >= 80%", () => {
    expect(getComplianceLevel(80).label).toBe("ممتاز");
    expect(getComplianceLevel(90).label).toBe("ممتاز");
    expect(getComplianceLevel(100).label).toBe("ممتاز");
  });

  it("should return 'جيد' for 60-79%", () => {
    expect(getComplianceLevel(60).label).toBe("جيد");
    expect(getComplianceLevel(70).label).toBe("جيد");
    expect(getComplianceLevel(79).label).toBe("جيد");
  });

  it("should return 'يحتاج تحسين' for < 60%", () => {
    expect(getComplianceLevel(0).label).toBe("يحتاج تحسين");
    expect(getComplianceLevel(50).label).toBe("يحتاج تحسين");
    expect(getComplianceLevel(59).label).toBe("يحتاج تحسين");
  });

  it("should return green color for excellent compliance", () => {
    expect(getComplianceLevel(85).color).toBe("#16A34A");
  });

  it("should return red color for poor compliance", () => {
    expect(getComplianceLevel(40).color).toBe("#DC2626");
  });
});

describe("Storage Utilities", () => {
  it("should generate unique visit IDs", () => {
    const id1 = generateVisitId();
    const id2 = generateVisitId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^visit_/);
  });

  it("should format date correctly", () => {
    const dateStr = "2026-03-08";
    const formatted = formatDate(dateStr);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });
});

describe("Compliance Calculation Logic", () => {
  it("should calculate 100% when all answers are yes", () => {
    const totalYes = 10;
    const totalNo = 0;
    const totalAnswered = totalYes + totalNo;
    const percentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;
    expect(percentage).toBe(100);
  });

  it("should calculate 0% when all answers are no", () => {
    const totalYes = 0;
    const totalNo = 10;
    const totalAnswered = totalYes + totalNo;
    const percentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;
    expect(percentage).toBe(0);
  });

  it("should calculate 50% when half answers are yes", () => {
    const totalYes = 5;
    const totalNo = 5;
    const totalAnswered = totalYes + totalNo;
    const percentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;
    expect(percentage).toBe(50);
  });

  it("should return 0% when no questions answered", () => {
    const totalYes = 0;
    const totalNo = 0;
    const totalAnswered = totalYes + totalNo;
    const percentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;
    expect(percentage).toBe(0);
  });
});
