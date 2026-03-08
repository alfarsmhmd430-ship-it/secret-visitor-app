import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QuestionAnswer {
  questionId: string;
  answer: "yes" | "no" | null;
  reason?: string;
  photoUris?: string[];
}

export interface CategoryResult {
  categoryId: string;
  categoryName: string;
  weight: number;
  yesCount: number;
  noCount: number;
  totalCount: number;
  percentage: number;
}

export interface VisitRecord {
  id: string;
  centerName: string;
  visitDate: string; // ISO date string
  answers: QuestionAnswer[];
  categoryResults: CategoryResult[];
  overallPercentage: number;
  totalYes: number;
  totalNo: number;
  totalQuestions: number;
  createdAt: string;
}

const STORAGE_KEY = "secret_visitor_visits";

export async function getAllVisits(): Promise<VisitRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as VisitRecord[];
  } catch {
    return [];
  }
}

export async function saveVisit(visit: VisitRecord): Promise<void> {
  const visits = await getAllVisits();
  const existingIndex = visits.findIndex((v) => v.id === visit.id);
  if (existingIndex >= 0) {
    visits[existingIndex] = visit;
  } else {
    visits.unshift(visit);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

export async function deleteVisit(id: string): Promise<void> {
  const visits = await getAllVisits();
  const filtered = visits.filter((v) => v.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function getVisitById(id: string): Promise<VisitRecord | null> {
  const visits = await getAllVisits();
  return visits.find((v) => v.id === id) ?? null;
}

export function generateVisitId(): string {
  return `visit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
