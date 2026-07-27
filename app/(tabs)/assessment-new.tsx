import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useAssessment } from "@/lib/assessment-context";
import { SectionAssessmentView } from "@/components/section-assessment-view";
import { VISITOR_JOURNEY_SECTIONS } from "@/constants/visitor-journey-sections";
import { saveVisit, VisitRecord } from "@/lib/storage";

type AssessmentStep = "setup" | "assessment" | "review";

export default function AssessmentScreen() {
  const { buildVisitRecord, state, dispatch } = useAssessment();
  const router = useRouter();
  const [step, setStep] = useState<AssessmentStep>("setup");
  const [centerName, setCenterName] = useState(state.centerName);
  const [visitDate, setVisitDate] = useState(state.visitDate);

  // خطوة 1: إعداد التقييم
  const handleStartAssessment = () => {
    if (!centerName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المركز الصحي");
      return;
    }

    dispatch({ type: "SET_CENTER_NAME", payload: centerName });
    dispatch({ type: "SET_VISIT_DATE", payload: visitDate });
    dispatch({ type: "MOVE_TO_SECTION", payload: 1 });
    setStep("assessment");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // خطوة 2: إنهاء التقييم
  const handleFinishAssessment = () => {
    Alert.alert("تأكيد", "هل تريد إنهاء التقييم والانتقال لمراجعة النتائج؟", [
      { text: "إلغاء", onPress: () => {} },
      {
        text: "نعم",
        onPress: () => {
          setStep("review");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // خطوة 3: حفظ التقييم
  const handleSaveAssessment = async () => {
    try {
      const record = buildVisitRecord();
      await saveVisit(record);
      Alert.alert("نجح", "تم حفظ التقييم بنجاح", [
        {
          text: "موافق",
          onPress: () => {
            dispatch({ type: "RESET" });
            router.push("/(tabs)/records");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("خطأ", "فشل حفظ التقييم. يرجى المحاولة مجدداً");
    }
  };

  // خطوة 1: شاشة الإعداد
  if (step === "setup") {
    return (
      <ScreenContainer className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="p-6 gap-6 flex-1 justify-center">
            {/* الرأس */}
            <View className="gap-2 items-center">
              <Text className="text-4xl font-bold text-foreground">تقييم جديد</Text>
              <Text className="text-base text-muted text-center">
                رحلة الزائر داخل المركز الصحي
              </Text>
            </View>

            {/* معلومات الرحلة */}
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 gap-2">
              <Text className="text-sm font-semibold text-blue-900">معلومات الرحلة</Text>
              <Text className="text-xs text-blue-800">
                سيتم تقييم المركز الصحي من خلال {VISITOR_JOURNEY_SECTIONS.length} أقسام:
              </Text>
              <View className="gap-1 mt-2">
                {VISITOR_JOURNEY_SECTIONS.map((section) => (
                  <Text key={section.id} className="text-xs text-blue-800">
                    {section.order}. {section.name}
                  </Text>
                ))}
              </View>
              <Text className="text-xs text-blue-800 mt-2 font-semibold">
                ⚠️ لا يمكنك الرجوع إلى الأقسام السابقة بعد إنهاء القسم الحالي
              </Text>
            </View>

            {/* حقول الإدخال */}
            <View className="gap-4">
              {/* اسم المركز */}
              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">اسم المركز الصحي *</Text>
                <TextInput
                  placeholder="أدخل اسم المركز الصحي"
                  value={centerName}
                  onChangeText={setCenterName}
                  className="bg-surface border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>

              {/* تاريخ الزيارة */}
              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">تاريخ الزيارة</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={visitDate}
                  onChangeText={setVisitDate}
                  className="bg-surface border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* زر البدء */}
            <TouchableOpacity
              onPress={handleStartAssessment}
              className="bg-primary py-4 rounded-lg items-center justify-center active:opacity-80 mt-4"
            >
              <Text className="text-background font-bold text-lg">ابدأ التقييم</Text>
            </TouchableOpacity>

            {/* زر الإلغاء */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-border py-3 rounded-lg items-center justify-center active:opacity-80"
            >
              <Text className="text-foreground font-semibold">إلغاء</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // خطوة 2: شاشة التقييم
  if (step === "assessment") {
    return (
      <View className="flex-1">
        <SectionAssessmentView
          onSectionComplete={(sectionOrder) => {
            if (sectionOrder === VISITOR_JOURNEY_SECTIONS.length) {
              handleFinishAssessment();
            }
          }}
          onNavigateNext={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onNavigatePrevious={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      </View>
    );
  }

  // خطوة 3: شاشة المراجعة والحفظ
  if (step === "review") {
    const record = buildVisitRecord();

    return (
      <ScreenContainer className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="p-6 gap-4">
            {/* الرأس */}
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">مراجعة النتائج</Text>
              <Text className="text-base text-muted">
                {state.centerName} - {state.visitDate}
              </Text>
            </View>

            {/* النسبة الإجمالية */}
            <View className="bg-surface border border-border rounded-lg p-4 gap-2">
              <Text className="text-sm text-muted">النسبة الإجمالية</Text>
              <Text className="text-4xl font-bold text-primary">
                {record.overallPercentage}%
              </Text>
              <Text className="text-sm text-muted">
                {record.totalYes} من {record.totalYes + record.totalNo} إجابة صحيحة
              </Text>
            </View>

            {/* نتائج الأقسام */}
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">نتائج الأقسام</Text>
              {record.categoryResults.map((result: any, index: number) => {
                const section = VISITOR_JOURNEY_SECTIONS[index];
                return (
                  <View
                    key={result.categoryId}
                    className="bg-surface border border-border rounded-lg p-4 gap-2"
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="font-semibold text-foreground">{result.categoryName}</Text>
                      <Text className="text-lg font-bold text-primary">{result.percentage}%</Text>
                    </View>
                    <View className="h-2 bg-border rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${result.percentage}%`,
                          backgroundColor: section?.color || "#0891B2",
                        }}
                      />
                    </View>
                    <Text className="text-xs text-muted">
                      {result.yesCount} من {result.totalCount} معيار
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* أزرار الإجراء */}
            <View className="gap-3 mt-4">
              <TouchableOpacity
                onPress={handleSaveAssessment}
                className="bg-green-600 py-4 rounded-lg items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-bold text-lg">حفظ التقييم</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep("assessment");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="bg-border py-3 rounded-lg items-center justify-center active:opacity-80"
              >
                <Text className="text-foreground font-semibold">العودة للتقييم</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return null;
}
