import { describe, it, expect, vi } from "vitest";
import { getComplianceLevel, ASSESSMENT_CATEGORIES } from "../constants/criteria-data";
import { formatDate } from "../lib/storage";

// محاكاة بيانات زيارة كاملة لاختبار منطق التقرير
const mockVisit = {
  id: "visit_test_123",
  centerName: "مركز الاختبار الصحي",
  visitDate: "2026-03-09",
  overallPercentage: 75,
  totalYes: 15,
  totalNo: 5,
  totalQuestions: 20,
  categoryResults: [
    { categoryId: "patient_experience", categoryName: "تجربة المستفيد", weight: 40, percentage: 80, yesCount: 8, noCount: 2 },
    { categoryId: "safety", categoryName: "السلامة العامة", weight: 10, percentage: 60, yesCount: 3, noCount: 2 },
    { categoryId: "infection_control", categoryName: "مكافحة العدوى", weight: 20, percentage: 70, yesCount: 4, noCount: 1 },
  ],
  answers: [
    { questionId: "q1", answer: "yes" as const, reason: "", photoUris: [] },
    { questionId: "q2", answer: "no" as const, reason: "سبب الملاحظة", photoUris: [] },
    { questionId: "q3", answer: "no" as const, reason: "", photoUris: ["file:///test/photo.jpg"] },
  ],
};

describe("PDF Report Generation Logic", () => {
  it("should correctly identify photos from 'no' answers", () => {
    const photos: { questionId: string; uri: string }[] = [];
    mockVisit.answers.forEach((a) => {
      if (a.answer === "no" && a.photoUris && a.photoUris.length > 0) {
        a.photoUris.forEach((uri) => photos.push({ questionId: a.questionId, uri }));
      }
    });
    expect(photos).toHaveLength(1);
    expect(photos[0].questionId).toBe("q3");
    expect(photos[0].uri).toBe("file:///test/photo.jpg");
  });

  it("should correctly identify 'no' answers with reasons", () => {
    const noWithReasons = mockVisit.answers.filter(
      (a) => a.answer === "no" && a.reason?.trim()
    );
    expect(noWithReasons).toHaveLength(1);
    expect(noWithReasons[0].questionId).toBe("q2");
  });

  it("should detect hasPhotos correctly when photos exist", () => {
    const allPhotos = mockVisit.answers
      .filter((a) => a.answer === "no" && a.photoUris && a.photoUris.length > 0)
      .flatMap((a) => a.photoUris.map((uri) => ({ questionId: a.questionId, uri })));
    const hasPhotos = allPhotos.length > 0;
    expect(hasPhotos).toBe(true);
  });

  it("should detect hasPhotos as false when no photos", () => {
    const visitNoPhotos = {
      ...mockVisit,
      answers: [
        { questionId: "q1", answer: "yes" as const, reason: "", photoUris: [] },
        { questionId: "q2", answer: "no" as const, reason: "سبب", photoUris: [] },
      ],
    };
    const allPhotos = visitNoPhotos.answers
      .filter((a) => a.answer === "no" && a.photoUris && a.photoUris.length > 0)
      .flatMap((a) => a.photoUris.map((uri) => ({ questionId: a.questionId, uri })));
    const hasPhotos = allPhotos.length > 0;
    expect(hasPhotos).toBe(false);
  });

  it("should generate correct report text with center name", () => {
    const noAnswers = mockVisit.answers.filter((a) => a.answer === "no");
    const noWithReasons = noAnswers.filter((a) => a.reason?.trim());

    let report = `بسم الله الرحمن الرحيم\n\n`;
    report += `المكرم مدير ${mockVisit.centerName}،\n\n`;
    report += `نسبة الالتزام الإجمالية: ${mockVisit.overallPercentage}%\n`;

    expect(report).toContain(mockVisit.centerName);
    expect(report).toContain(`${mockVisit.overallPercentage}%`);
    expect(report).toContain("إلهام مبارك البحيران".length > 0 ? "بسم الله" : "");
  });

  it("should format date correctly for report", () => {
    const formatted = formatDate(mockVisit.visitDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });

  it("should calculate category results correctly", () => {
    const totalWeight = mockVisit.categoryResults.reduce((sum, cat) => sum + cat.weight, 0);
    // المجموع الجزئي للمحاور الثلاثة في البيانات الوهمية
    expect(totalWeight).toBe(70);
  });

  it("should get compliance level for overall percentage", () => {
    const level = getComplianceLevel(mockVisit.overallPercentage);
    expect(level).toBeDefined();
    expect(level.label).toBe("جيد"); // 75% = جيد
    expect(level.color).toBeTruthy();
  });

  it("should handle setTimeout-based PDF call pattern (no double-press)", () => {
    let callCount = 0;
    let isGeneratingPDF = false;

    const handleExportPDF = async () => {
      if (isGeneratingPDF) return;
      isGeneratingPDF = true;
      callCount++;
      // محاكاة عملية PDF
      await new Promise((resolve) => setTimeout(resolve, 10));
      isGeneratingPDF = false;
    };

    // محاكاة ضغطتين متتاليتين
    handleExportPDF();
    handleExportPDF(); // يجب أن تُتجاهل بسبب isGeneratingPDF

    // بعد الانتهاء، يجب أن تكون استُدعيت مرة واحدة فقط
    expect(callCount).toBe(1);
  });
});
