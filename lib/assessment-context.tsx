"use client";

import { createContext, useContext, useReducer, useCallback } from "react";
import { VISITOR_JOURNEY_SECTIONS } from "@/constants/visitor-journey-sections";
import { QuestionAnswer, CategoryResult, VisitRecord, generateVisitId } from "@/lib/storage";

interface AssessmentState {
  visitId: string;
  centerName: string;
  visitDate: string;
  answers: Record<string, QuestionAnswer>;
  isComplete: boolean;
  // الحقول الجديدة لنظام الأقسام المتسلسلة
  currentSectionOrder: number; // ترتيب القسم الحالي (1-7)
  completedSections: Set<number>; // الأقسام المكتملة
  sectionNotes: Record<number, string>; // ملاحظات كل قسم
}

type AssessmentAction =
  | { type: "SET_CENTER_NAME"; payload: string }
  | { type: "SET_VISIT_DATE"; payload: string }
  | { type: "SET_ANSWER"; payload: { questionId: string; answer: "yes" | "no" } }
  | { type: "SET_REASON"; payload: { questionId: string; reason: string } }
  | { type: "ADD_PHOTO"; payload: { questionId: string; photoUri: string } }
  | { type: "REMOVE_PHOTO"; payload: { questionId: string; photoUri: string } }
  | { type: "MOVE_TO_SECTION"; payload: number } // الانتقال إلى قسم محدد
  | { type: "COMPLETE_SECTION"; payload: number } // إنهاء قسم
  | { type: "SET_SECTION_NOTES"; payload: { sectionOrder: number; notes: string } }
  | { type: "RESET" };

function createInitialState(): AssessmentState {
  return {
    visitId: generateVisitId(),
    centerName: "",
    visitDate: new Date().toISOString().split("T")[0],
    answers: {},
    isComplete: false,
    currentSectionOrder: 1,
    completedSections: new Set(),
    sectionNotes: {},
  };
}

function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case "SET_CENTER_NAME":
      return { ...state, centerName: action.payload };

    case "SET_VISIT_DATE":
      return { ...state, visitDate: action.payload };

    case "SET_ANSWER": {
      const { questionId, answer } = action.payload;
      const existing = state.answers[questionId] ?? { questionId, answer: null };
      return {
        ...state,
        answers: {
          ...state.answers,
          [questionId]: {
            ...existing,
            answer,
            // مسح الملاحظات والصور عند تغيير الإجابة إلى "نعم"
            reason: answer === "yes" ? undefined : existing.reason,
            photoUris: answer === "yes" ? undefined : existing.photoUris,
          },
        },
      };
    }

    case "SET_REASON": {
      const { questionId, reason } = action.payload;
      const existing = state.answers[questionId] ?? { questionId, answer: null };
      return {
        ...state,
        answers: {
          ...state.answers,
          [questionId]: { ...existing, reason },
        },
      };
    }

    case "ADD_PHOTO": {
      const { questionId, photoUri } = action.payload;
      const existing = state.answers[questionId] ?? { questionId, answer: null };
      const currentPhotos = existing.photoUris ?? [];
      return {
        ...state,
        answers: {
          ...state.answers,
          [questionId]: {
            ...existing,
            photoUris: [...currentPhotos, photoUri],
          },
        },
      };
    }

    case "REMOVE_PHOTO": {
      const { questionId, photoUri } = action.payload;
      const existing = state.answers[questionId];
      if (!existing) return state;
      return {
        ...state,
        answers: {
          ...state.answers,
          [questionId]: {
            ...existing,
            photoUris: (existing.photoUris ?? []).filter((uri) => uri !== photoUri),
          },
        },
      };
    }

    case "MOVE_TO_SECTION": {
      const newOrder = action.payload;
      // منع الرجوع إلى قسم سابق مكتمل
      if (newOrder < state.currentSectionOrder && state.completedSections.has(state.currentSectionOrder)) {
        return state; // لا تسمح بالرجوع
      }
      return { ...state, currentSectionOrder: newOrder };
    }

    case "COMPLETE_SECTION": {
      const sectionOrder = action.payload;
      const newCompleted = new Set(state.completedSections);
      newCompleted.add(sectionOrder);
      return { ...state, completedSections: newCompleted };
    }

    case "SET_SECTION_NOTES": {
      const { sectionOrder, notes } = action.payload;
      return {
        ...state,
        sectionNotes: {
          ...state.sectionNotes,
          [sectionOrder]: notes,
        },
      };
    }

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

function calculateResults(state: AssessmentState): {
  sectionResults: Array<{
    sectionId: string;
    sectionName: string;
    order: number;
    yesCount: number;
    noCount: number;
    totalCount: number;
    percentage: number;
  }>;
  overallPercentage: number;
  totalYes: number;
  totalNo: number;
  totalQuestions: number;
} {
  let totalYes = 0;
  let totalNo = 0;
  let totalQuestions = 0;

  const sectionResults = VISITOR_JOURNEY_SECTIONS.map((section) => {
    let sectionYes = 0;
    let sectionNo = 0;
    section.criteria.forEach((criterion) => {
      const answer = state.answers[criterion.id];
      if (answer?.answer === "yes") sectionYes++;
      else if (answer?.answer === "no") sectionNo++;
    });
    const sectionTotal = section.criteria.length;
    const sectionAnswered = sectionYes + sectionNo;
    const sectionPercentage = sectionAnswered > 0 ? Math.round((sectionYes / sectionAnswered) * 100) : 0;

    totalYes += sectionYes;
    totalNo += sectionNo;
    totalQuestions += sectionTotal;

    return {
      sectionId: section.id,
      sectionName: section.name,
      order: section.order,
      yesCount: sectionYes,
      noCount: sectionNo,
      totalCount: sectionTotal,
      percentage: sectionPercentage,
    };
  });

  const totalAnswered = totalYes + totalNo;
  const overallPercentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;

  return { sectionResults, overallPercentage, totalYes, totalNo, totalQuestions };
}

interface AssessmentContextType {
  state: AssessmentState;
  dispatch: React.Dispatch<AssessmentAction>;
  buildVisitRecord: () => VisitRecord;
  getAnsweredCount: () => number;
  getTotalCount: () => number;
  getProgressPercentage: () => number;
  getCurrentSection: () => (typeof VISITOR_JOURNEY_SECTIONS)[0] | undefined;
  getSectionProgress: (sectionOrder: number) => { answered: number; total: number; percentage: number };
  canGoToNextSection: () => boolean;
  canGoToPreviousSection: () => boolean;
  goToNextSection: () => void;
  goToPreviousSection: () => void;
  isSectionCompleted: (sectionOrder: number) => boolean;
}

const AssessmentContext = createContext<AssessmentContextType | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(assessmentReducer, undefined, createInitialState);

  const getCurrentSection = useCallback(() => {
    return VISITOR_JOURNEY_SECTIONS.find((s) => s.order === state.currentSectionOrder);
  }, [state.currentSectionOrder]);

  const getSectionProgress = useCallback(
    (sectionOrder: number) => {
      const section = VISITOR_JOURNEY_SECTIONS.find((s) => s.order === sectionOrder);
      if (!section) return { answered: 0, total: 0, percentage: 0 };

      let answered = 0;
      section.criteria.forEach((criterion) => {
        const answer = state.answers[criterion.id];
        if (answer?.answer !== null && answer?.answer !== undefined) {
          answered++;
        }
      });

      const total = section.criteria.length;
      const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

      return { answered, total, percentage };
    },
    [state.answers]
  );

  const canGoToNextSection = useCallback(() => {
    return state.currentSectionOrder < VISITOR_JOURNEY_SECTIONS.length;
  }, [state.currentSectionOrder]);

  const canGoToPreviousSection = useCallback(() => {
    return state.currentSectionOrder > 1;
  }, [state.currentSectionOrder]);

  const goToNextSection = useCallback(() => {
    if (canGoToNextSection()) {
      dispatch({ type: "MOVE_TO_SECTION", payload: state.currentSectionOrder + 1 });
    }
  }, [state.currentSectionOrder, canGoToNextSection]);

  const goToPreviousSection = useCallback(() => {
    if (canGoToPreviousSection()) {
      dispatch({ type: "MOVE_TO_SECTION", payload: state.currentSectionOrder - 1 });
    }
  }, [state.currentSectionOrder, canGoToPreviousSection]);

  const isSectionCompleted = useCallback(
    (sectionOrder: number) => {
      return state.completedSections.has(sectionOrder);
    },
    [state.completedSections]
  );

  const buildVisitRecord = useCallback((): VisitRecord => {
    const { sectionResults, overallPercentage, totalYes, totalNo, totalQuestions } = calculateResults(state);

    // تحويل نتائج الأقسام إلى نتائج الفئات للتوافق مع البنية القديمة
    const categoryResults: CategoryResult[] = sectionResults.map((sr) => ({
      categoryId: sr.sectionId,
      categoryName: sr.sectionName,
      weight: 100 / sectionResults.length, // توزيع متساوي
      yesCount: sr.yesCount,
      noCount: sr.noCount,
      totalCount: sr.totalCount,
      percentage: sr.percentage,
    }));

    return {
      id: state.visitId,
      centerName: state.centerName,
      visitDate: state.visitDate,
      answers: Object.values(state.answers),
      categoryResults,
      overallPercentage,
      totalYes,
      totalNo,
      totalQuestions,
      createdAt: new Date().toISOString(),
    };
  }, [state]);

  const getAnsweredCount = useCallback(() => {
    return Object.values(state.answers).filter((a) => a.answer !== null && a.answer !== undefined).length;
  }, [state.answers]);

  const getTotalCount = useCallback(() => {
    return VISITOR_JOURNEY_SECTIONS.reduce((sum, section) => sum + section.criteria.length, 0);
  }, []);

  const getProgressPercentage = useCallback(() => {
    const total = getTotalCount();
    const answered = getAnsweredCount();
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [getAnsweredCount, getTotalCount]);

  return (
    <AssessmentContext.Provider
      value={{
        state,
        dispatch,
        buildVisitRecord,
        getAnsweredCount,
        getTotalCount,
        getProgressPercentage,
        getCurrentSection,
        getSectionProgress,
        canGoToNextSection,
        canGoToPreviousSection,
        goToNextSection,
        goToPreviousSection,
        isSectionCompleted,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}

export { calculateResults };
