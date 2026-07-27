import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { useAssessment } from "@/lib/assessment-context";
import { VISITOR_JOURNEY_SECTIONS } from "@/constants/visitor-journey-sections";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";

interface SectionAssessmentViewProps {
  onSectionComplete?: (sectionOrder: number) => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
}

export function SectionAssessmentView({
  onSectionComplete,
  onNavigateNext,
  onNavigatePrevious,
}: SectionAssessmentViewProps) {
  const { state, dispatch, getCurrentSection, getSectionProgress, goToNextSection, goToPreviousSection, canGoToNextSection, canGoToPreviousSection } = useAssessment();

  const currentSection = getCurrentSection();
  const progress = currentSection ? getSectionProgress(currentSection.order) : { answered: 0, total: 0, percentage: 0 };
  const [sectionNotes, setSectionNotes] = useState(state.sectionNotes[state.currentSectionOrder] || "");

  if (!currentSection) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-lg text-foreground">لم يتم العثور على القسم</Text>
      </ScreenContainer>
    );
  }

  const handleAnswerChange = (questionId: string, answer: "yes" | "no") => {
    dispatch({ type: "SET_ANSWER", payload: { questionId, answer } });
  };

  const handleReasonChange = (questionId: string, reason: string) => {
    dispatch({ type: "SET_REASON", payload: { questionId, reason } });
  };

  const handleSectionNotesChange = (notes: string) => {
    setSectionNotes(notes);
    dispatch({ type: "SET_SECTION_NOTES", payload: { sectionOrder: state.currentSectionOrder, notes } });
  };

  const handleCompleteSection = () => {
    dispatch({ type: "COMPLETE_SECTION", payload: state.currentSectionOrder });
    onSectionComplete?.(state.currentSectionOrder);

    // الانتقال التلقائي للقسم التالي إذا كان متاحاً
    if (canGoToNextSection()) {
      setTimeout(() => {
        goToNextSection();
        onNavigateNext?.();
      }, 500);
    }
  };

  const handleNextSection = () => {
    if (canGoToNextSection()) {
      goToNextSection();
      onNavigateNext?.();
    }
  };

  const handlePreviousSection = () => {
    if (canGoToPreviousSection()) {
      goToPreviousSection();
      onNavigatePrevious?.();
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={true}>
        <View className="p-4 gap-4">
          {/* رأس القسم */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-3xl font-bold text-foreground">{currentSection.name}</Text>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: currentSection.color + "20" }}
              >
                <Text className="text-sm font-semibold" style={{ color: currentSection.color }}>
                  {state.currentSectionOrder} / {VISITOR_JOURNEY_SECTIONS.length}
                </Text>
              </View>
            </View>
            <Text className="text-base text-muted">{currentSection.description}</Text>
          </View>

          {/* شريط التقدم */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted">التقدم</Text>
              <Text className="text-sm font-semibold text-foreground">
                {progress.answered} / {progress.total}
              </Text>
            </View>
            <View className="h-2 bg-border rounded-full overflow-hidden">
              <View
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress.percentage}%`,
                  backgroundColor: currentSection.color,
                }}
              />
            </View>
            <Text className="text-xs text-muted text-center">{progress.percentage}%</Text>
          </View>

          {/* المعايير */}
          <View className="gap-3">
            {currentSection.criteria.map((criterion, index) => {
              const answer = state.answers[criterion.id];
              const isAnswered = answer?.answer !== null && answer?.answer !== undefined;

              return (
                <View key={criterion.id} className="bg-surface rounded-lg p-4 gap-3 border border-border">
                  {/* رقم وسؤال */}
                  <View className="gap-2">
                    <View className="flex-row items-start gap-2">
                      <View
                        className="w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: currentSection.color }}
                      >
                        <Text className="text-xs font-bold text-background">{index + 1}</Text>
                      </View>
                      <Text className="flex-1 text-base font-semibold text-foreground">
                        {criterion.question}
                      </Text>
                    </View>
                    {criterion.sourceAxis && (
                      <Text className="text-xs text-muted ml-8">
                        من: {criterion.sourceAxis}
                        {criterion.subcategory && ` - ${criterion.subcategory}`}
                      </Text>
                    )}
                  </View>

                  {/* أزرار الإجابة */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAnswerChange(criterion.id, "yes")}
                      className={cn(
                        "flex-1 py-2 rounded-lg border-2 items-center justify-center",
                        answer?.answer === "yes"
                          ? "bg-green-100 border-green-500"
                          : "bg-background border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold",
                          answer?.answer === "yes" ? "text-green-700" : "text-foreground"
                        )}
                      >
                        نعم
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleAnswerChange(criterion.id, "no")}
                      className={cn(
                        "flex-1 py-2 rounded-lg border-2 items-center justify-center",
                        answer?.answer === "no"
                          ? "bg-red-100 border-red-500"
                          : "bg-background border-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold",
                          answer?.answer === "no" ? "text-red-700" : "text-foreground"
                        )}
                      >
                        لا
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* حقل الملاحظات للإجابات "لا" */}
                  {answer?.answer === "no" && (
                    <TextInput
                      placeholder="أضف ملاحظة أو سبب..."
                      value={answer.reason || ""}
                      onChangeText={(text) => handleReasonChange(criterion.id, text)}
                      multiline
                      numberOfLines={3}
                      className="bg-background border border-border rounded-lg p-3 text-foreground"
                      placeholderTextColor="#999"
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* ملاحظات القسم */}
          <View className="gap-2">
            <Text className="text-base font-semibold text-foreground">ملاحظات عامة للقسم</Text>
            <TextInput
              placeholder="أضف ملاحظات عامة حول هذا القسم..."
              value={sectionNotes}
              onChangeText={handleSectionNotesChange}
              multiline
              numberOfLines={4}
              className="bg-background border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor="#999"
            />
          </View>

          {/* أزرار التنقل */}
          <View className="gap-3 mt-4">
            {/* زر إنهاء القسم والانتقال للقسم التالي */}
            {canGoToNextSection() && (
              <TouchableOpacity
                onPress={handleCompleteSection}
                className="bg-primary py-3 rounded-lg items-center justify-center active:opacity-80"
              >
                <Text className="text-background font-semibold text-base">
                  إنهاء القسم والمتابعة
                </Text>
              </TouchableOpacity>
            )}

            {/* زر الانتقال للقسم التالي فقط */}
            {canGoToNextSection() && !canGoToPreviousSection() && (
              <TouchableOpacity
                onPress={handleNextSection}
                className="bg-primary py-3 rounded-lg items-center justify-center active:opacity-80"
              >
                <Text className="text-background font-semibold text-base">
                  التالي
                </Text>
              </TouchableOpacity>
            )}

            {/* أزرار التنقل للأمام والخلف */}
            {canGoToPreviousSection() && (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handlePreviousSection}
                  className="flex-1 bg-border py-3 rounded-lg items-center justify-center active:opacity-80"
                >
                  <Text className="text-foreground font-semibold">السابق</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextSection}
                  className="flex-1 bg-primary py-3 rounded-lg items-center justify-center active:opacity-80"
                >
                  <Text className="text-background font-semibold">التالي</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* زر الانتهاء من التقييم */}
            {state.currentSectionOrder === VISITOR_JOURNEY_SECTIONS.length && (
              <TouchableOpacity
                onPress={handleCompleteSection}
                className="bg-green-600 py-3 rounded-lg items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-semibold text-base">
                  إنهاء التقييم
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* معلومات إضافية */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 gap-2">
            <Text className="text-sm font-semibold text-blue-900">معلومات</Text>
            <Text className="text-xs text-blue-800">
              • لا يمكنك الرجوع إلى الأقسام السابقة بعد إنهاء القسم الحالي
            </Text>
            <Text className="text-xs text-blue-800">
              • سيتم حفظ إجاباتك تلقائياً
            </Text>
            <Text className="text-xs text-blue-800">
              • يمكنك إضافة ملاحظات لكل إجابة "لا"
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
