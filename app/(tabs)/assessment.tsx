import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAssessment } from "@/lib/assessment-context";
import { ASSESSMENT_CATEGORIES } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

// Date Picker Modal Component
function DatePickerModal({
  visible,
  currentDate,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  currentDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(
    parseInt(currentDate.split("-")[0]) || today.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    parseInt(currentDate.split("-")[1]) - 1 || today.getMonth()
  );
  const [selectedDay, setSelectedDay] = useState(
    parseInt(currentDate.split("-")[2]) || today.getDate()
  );

  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const handleConfirm = () => {
    const month = String(selectedMonth + 1).padStart(2, "0");
    const day = String(selectedDay).padStart(2, "0");
    onSelect(`${selectedYear}-${month}-${day}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.datePickerTitle, { color: colors.foreground }]}>اختر تاريخ الزيارة</Text>

          {/* Year */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.muted }]}>السنة</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedYear((y) => y - 1)}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.dateValue, { color: colors.foreground }]}>{selectedYear}</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedYear((y) => Math.min(y + 1, today.getFullYear()))}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.muted }]}>الشهر</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedMonth((m) => (m === 0 ? 11 : m - 1))}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.dateValue, { color: colors.foreground, minWidth: 80 }]}>
                {months[selectedMonth]}
              </Text>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedMonth((m) => (m === 11 ? 0 : m + 1))}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Day */}
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.muted }]}>اليوم</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedDay((d) => (d === 1 ? daysInMonth : d - 1))}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.dateValue, { color: colors.foreground }]}>{selectedDay}</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedDay((d) => (d === daysInMonth ? 1 : d + 1))}
              >
                <Text style={{ color: colors.foreground, fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.datePickerButtons}>
            <TouchableOpacity
              style={[styles.datePickerBtn, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePickerBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>تأكيد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Question Item Component
function QuestionItem({
  questionId,
  question,
  subcategory,
  isFirstInSubcategory,
  colors,
}: {
  questionId: string;
  question: string;
  subcategory?: string;
  isFirstInSubcategory: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const { state, dispatch } = useAssessment();
  const answer = state.answers[questionId];
  const currentAnswer = answer?.answer ?? null;
  const reason = answer?.reason ?? "";
  const photos = answer?.photoUris ?? [];

  const handleAnswer = (value: "yes" | "no") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    dispatch({ type: "SET_ANSWER", payload: { questionId, answer: value } });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("الإذن مطلوب", "يرجى السماح بالوصول إلى مكتبة الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      dispatch({ type: "ADD_PHOTO", payload: { questionId, photoUri: result.assets[0].uri } });
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("الإذن مطلوب", "يرجى السماح بالوصول إلى الكاميرا");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      dispatch({ type: "ADD_PHOTO", payload: { questionId, photoUri: result.assets[0].uri } });
    }
  };

  const handleRemovePhoto = (uri: string) => {
    dispatch({ type: "REMOVE_PHOTO", payload: { questionId, photoUri: uri } });
  };

  return (
    <View>
      {isFirstInSubcategory && subcategory && (
        <Text style={[styles.subcategoryLabel, { color: colors.muted }]}>{subcategory}</Text>
      )}
      <View
        style={[
          styles.questionCard,
          {
            backgroundColor: colors.surface,
            borderColor:
              currentAnswer === "yes"
                ? "#16A34A"
                : currentAnswer === "no"
                ? "#DC2626"
                : colors.border,
            borderWidth: currentAnswer ? 1.5 : 1,
          },
        ]}
      >
        <Text style={[styles.questionText, { color: colors.foreground }]}>{question}</Text>

        {/* Yes/No Buttons */}
        <View style={styles.answerRow}>
          <TouchableOpacity
            style={[
              styles.answerBtn,
              {
                backgroundColor: currentAnswer === "no" ? "#DC2626" : colors.border,
                borderColor: currentAnswer === "no" ? "#DC2626" : colors.border,
              },
            ]}
            onPress={() => handleAnswer("no")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.answerBtnText,
                { color: currentAnswer === "no" ? "#FFFFFF" : colors.muted },
              ]}
            >
              ✗ لا
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.answerBtn,
              {
                backgroundColor: currentAnswer === "yes" ? "#16A34A" : colors.border,
                borderColor: currentAnswer === "yes" ? "#16A34A" : colors.border,
              },
            ]}
            onPress={() => handleAnswer("yes")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.answerBtnText,
                { color: currentAnswer === "yes" ? "#FFFFFF" : colors.muted },
              ]}
            >
              ✓ نعم
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reason & Photo when answer is No */}
        {currentAnswer === "no" && (
          <View style={styles.noSection}>
            <TextInput
              style={[
                styles.reasonInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="اذكر سبب عدم الالتزام..."
              placeholderTextColor={colors.muted}
              value={reason}
              onChangeText={(text) =>
                dispatch({ type: "SET_REASON", payload: { questionId, reason: text } })
              }
              multiline
              textAlign="right"
              returnKeyType="done"
            />

            {/* Photos */}
            {photos.length > 0 && (
              <ScrollView horizontal style={styles.photosRow} showsHorizontalScrollIndicator={false}>
                {photos.map((uri, idx) => (
                  <View key={idx} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(uri)}
                    >
                      <Text style={styles.removePhotoBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Photo Buttons */}
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <IconSymbol name="photo.fill" size={16} color="#3B82F6" />
                <Text style={[styles.photoBtnText, { color: "#3B82F6" }]}>من المعرض</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <IconSymbol name="camera.fill" size={16} color="#16A34A" />
                <Text style={[styles.photoBtnText, { color: "#16A34A" }]}>التقاط صورة</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Category Section Component
function CategorySection({
  category,
  colors,
}: {
  category: (typeof ASSESSMENT_CATEGORIES)[0];
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(true);
  const { state } = useAssessment();

  const answeredInCat = category.criteria.filter(
    (c) => state.answers[c.id]?.answer !== undefined && state.answers[c.id]?.answer !== null
  ).length;
  const yesInCat = category.criteria.filter((c) => state.answers[c.id]?.answer === "yes").length;
  const noInCat = category.criteria.filter((c) => state.answers[c.id]?.answer === "no").length;

  // Track subcategories
  const subcategoryTracker: Record<string, boolean> = {};

  return (
    <View style={[styles.categorySection, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.categoryHeader, { backgroundColor: category.color }]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
      >
        <View style={styles.categoryHeaderLeft}>
          <IconSymbol
            name={expanded ? "chevron.up" : "chevron.down"}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.categoryWeight}>{category.weight}%</Text>
        </View>
        <View style={styles.categoryHeaderRight}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryProgress}>
            {answeredInCat}/{category.criteria.length} | ✓{yesInCat} ✗{noInCat}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.criteriaList}>
          {category.criteria.map((criterion, idx) => {
            const isFirst = !subcategoryTracker[criterion.subcategory ?? ""];
            if (criterion.subcategory) subcategoryTracker[criterion.subcategory] = true;
            return (
              <QuestionItem
                key={criterion.id}
                questionId={criterion.id}
                question={criterion.question}
                subcategory={criterion.subcategory}
                isFirstInSubcategory={isFirst}
                colors={colors}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// Main Assessment Screen
export default function AssessmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch, buildVisitRecord, getAnsweredCount, getTotalCount, getProgressPercentage } =
    useAssessment();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const progress = getProgressPercentage();
  const answered = getAnsweredCount();
  const total = getTotalCount();

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "اختر التاريخ";
    const [year, month, day] = dateStr.split("-");
    const months = [
      "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    return `${parseInt(day)} ${months[parseInt(month)]} ${year}`;
  };

  const handleFinish = useCallback(() => {
    if (!state.centerName.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال اسم المركز الصحي");
      return;
    }
    if (answered === 0) {
      Alert.alert("تنبيه", "يرجى الإجابة على الأسئلة أولاً");
      return;
    }
    const record = buildVisitRecord();
    router.push({
      pathname: "/(tabs)/results" as any,
      params: { visitData: JSON.stringify(record) },
    });
  }, [state.centerName, answered, buildVisitRecord, router]);

  const progressColor =
    progress >= 80 ? "#16A34A" : progress >= 40 ? "#D97706" : colors.primary;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.assessmentHeader, { backgroundColor: colors.primary }]}>
          <Text style={styles.assessmentTitle}>نموذج التقييم</Text>
          <Text style={styles.assessmentSubtitle}>الزائر السري - مراكز الرعاية الأولية</Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>
              {answered} من {total} سؤال
            </Text>
            <Text style={[styles.progressPercent, { color: progressColor }]}>{progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]}
            />
          </View>
        </View>

        {/* Center Name & Date */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.foreground }]}>اسم المركز الصحي *</Text>
          <TextInput
            style={[
              styles.centerInput,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="أدخل اسم المركز الصحي..."
            placeholderTextColor={colors.muted}
            value={state.centerName}
            onChangeText={(text) => dispatch({ type: "SET_CENTER_NAME", payload: text })}
            textAlign="right"
            returnKeyType="done"
          />

          <Text style={[styles.infoLabel, { color: colors.foreground, marginTop: 16 }]}>
            تاريخ الزيارة *
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="clock.fill" size={18} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: state.visitDate ? colors.foreground : colors.muted }]}>
              {formatDisplayDate(state.visitDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        {ASSESSMENT_CATEGORIES.map((category) => (
          <CategorySection key={category.id} category={category} colors={colors} />
        ))}

        {/* Finish Button */}
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: colors.primary }]}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <IconSymbol name="checkmark.circle.fill" size={22} color="#FFFFFF" />
          <Text style={styles.finishBtnText}>إنهاء التقييم وعرض النتائج</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={state.visitDate}
        onSelect={(date) => dispatch({ type: "SET_VISIT_DATE", payload: date })}
        onClose={() => setShowDatePicker(false)}
        colors={colors}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  assessmentHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  assessmentTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "right",
  },
  assessmentSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textAlign: "right",
  },
  progressContainer: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  centerInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlign: "right",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 15,
    flex: 1,
    textAlign: "right",
  },
  categorySection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryHeaderRight: {
    alignItems: "flex-end",
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
  },
  categoryProgress: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    textAlign: "right",
  },
  categoryWeight: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  criteriaList: {
    padding: 12,
    gap: 8,
  },
  subcategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  questionCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
    marginBottom: 10,
    fontWeight: "500",
  },
  answerRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  answerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  answerBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  noSection: {
    marginTop: 10,
    gap: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
    textAlign: "right",
  },
  photosRow: {
    flexDirection: "row",
  },
  photoWrapper: {
    position: "relative",
    marginRight: 8,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 8,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  photoBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#1B4F8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 50,
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },
  datePickerButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  datePickerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
