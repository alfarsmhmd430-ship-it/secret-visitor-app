import React, { createContext, useContext, useReducer, useCallback } from "react";
import { ASSESSMENT_CATEGORIES, Category, Criterion } from "@/constants/criteria-data";
import { QuestionAnswer, CategoryResult, VisitRecord, generateVisitId } from "@/lib/storage";

interface AssessmentState {
  visitId: string;
  centerName: string;
  visitDate: string;
  answers: Record<string, QuestionAnswer>;
  isComplete: boolean;
}

type AssessmentAction =
  | { type: "SET_CENTER_NAME"; payload: string }
  | { type: "SET_VISIT_DATE"; payload: string }
  | { type: "SET_ANSWER"; payload: { questionId: string; answer: "yes" | "no" } }
  | { type: "SET_REASON"; payload: { questionId: string; reason: string } }
  | { type: "ADD_PHOTO"; payload: { questionId: string; photoUri: string } }
  | { type: "REMOVE_PHOTO"; payload: { questionId: string; photoUri: string } }
  | { type: "RESET" };

function createInitialState(): AssessmentState {
  return {
    visitId: generateVisitId(),
    centerName: "",
    visitDate: new Date().toISOString().split("T")[0],
    answers: {},
    isComplete: false,
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
            // Clear reason and photos if switching to yes
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
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}

function calculateResults(state: AssessmentState): {
  categoryResults: CategoryResult[];
  overallPercentage: number;
  totalYes: number;
  totalNo: number;
  totalQuestions: number;
} {
  let totalYes = 0;
  let totalNo = 0;
  let totalQuestions = 0;

  const categoryResults: CategoryResult[] = ASSESSMENT_CATEGORIES.map((cat) => {
    let catYes = 0;
    let catNo = 0;
    cat.criteria.forEach((criterion) => {
      const answer = state.answers[criterion.id];
      if (answer?.answer === "yes") catYes++;
      else if (answer?.answer === "no") catNo++;
    });
    const catTotal = cat.criteria.length;
    const catAnswered = catYes + catNo;
    const catPercentage = catAnswered > 0 ? Math.round((catYes / catAnswered) * 100) : 0;

    totalYes += catYes;
    totalNo += catNo;
    totalQuestions += catTotal;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      weight: cat.weight,
      yesCount: catYes,
      noCount: catNo,
      totalCount: catTotal,
      percentage: catPercentage,
    };
  });

  const totalAnswered = totalYes + totalNo;
  const overallPercentage = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;

  return { categoryResults, overallPercentage, totalYes, totalNo, totalQuestions };
}

interface AssessmentContextType {
  state: AssessmentState;
  dispatch: React.Dispatch<AssessmentAction>;
  buildVisitRecord: () => VisitRecord;
  getAnsweredCount: () => number;
  getTotalCount: () => number;
  getProgressPercentage: () => number;
}

const AssessmentContext = createContext<AssessmentContextType | null>(null);

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(assessmentReducer, undefined, createInitialState);

  const buildVisitRecord = useCallback((): VisitRecord => {
    const { categoryResults, overallPercentage, totalYes, totalNo, totalQuestions } =
      calculateResults(state);
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
    return Object.values(state.answers).filter((a) => a.answer !== null).length;
  }, [state.answers]);

  const getTotalCount = useCallback(() => {
    return ASSESSMENT_CATEGORIES.reduce((sum, cat) => sum + cat.criteria.length, 0);
  }, []);

  const getProgressPercentage = useCallback(() => {
    const total = getTotalCount();
    const answered = getAnsweredCount();
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [getAnsweredCount, getTotalCount]);

  return (
    <AssessmentContext.Provider
      value={{ state, dispatch, buildVisitRecord, getAnsweredCount, getTotalCount, getProgressPercentage }}
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
