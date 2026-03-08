import React, { useState, useCallback, useRef } from "react";
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
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAssessment } from "@/lib/assessment-context";
import { ASSESSMENT_CATEGORIES } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

// ─── Date Picker Modal ───────────────────────────────────────────────────────
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

// ─── Question Item ────────────────────────────────────────────────────────────
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
        <View style={styles.subcategoryRow}>
          <View style={[styles.subcategoryDot, { backgroundColor: "#94A3B8" }]} />
          <Text style={[styles.subcategoryLabel, { color: colors.muted }]}>{subcategory}</Text>
        </View>
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
                { backgroundColor: colors.background, borderColor: "#FECACA", color: colors.foreground },
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

// ─── Category Tab Bar ─────────────────────────────────────────────────────────
function CategoryTabBar({
  categories,
  activeIndex,
  onSelect,
  answers,
}: {
  categories: typeof ASSESSMENT_CATEGORIES;
  activeIndex: number;
  onSelect: (index: number) => void;
  answers: Record<string, { answer: "yes" | "no" | null }>;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const getProgress = (cat: (typeof ASSESSMENT_CATEGORIES)[0]) => {
    const answered = cat.criteria.filter(
      (c) => answers[c.id]?.answer !== undefined && answers[c.id]?.answer !== null
    ).length;
    return Math.round((answered / cat.criteria.length) * 100);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabBar}
      contentContainerStyle={styles.tabBarContent}
    >
      {categories.map((cat, idx) => {
        const isActive = idx === activeIndex;
        const progress = getProgress(cat);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tabItem,
              {
                backgroundColor: isActive ? cat.color : "transparent",
                borderColor: isActive ? cat.color : "#E2E8F0",
                borderWidth: 1.5,
              },
            ]}
            onPress={() => onSelect(idx)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? "#FFFFFF" : "#64748B" },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
            {progress > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#E2E8F0" },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: isActive ? "#FFFFFF" : "#64748B" },
                  ]}
                >
                  {progress}%
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Category Panel ───────────────────────────────────────────────────────────
function CategoryPanel({
  category,
  colors,
}: {
  category: (typeof ASSESSMENT_CATEGORIES)[0];
  colors: ReturnType<typeof useColors>;
}) {
  const { state } = useAssessment();
  const answeredInCat = category.criteria.filter(
    (c) => state.answers[c.id]?.answer !== undefined && state.answers[c.id]?.answer !== null
  ).length;
  const yesInCat = category.criteria.filter((c) => state.answers[c.id]?.answer === "yes").length;
  const noInCat = category.criteria.filter((c) => state.answers[c.id]?.answer === "no").length;

  const subcategoryTracker: Record<string, boolean> = {};

  return (
    <View>
      {/* Category Header */}
      <View style={[styles.catPanelHeader, { backgroundColor: category.color }]}>
        <View style={styles.catPanelHeaderRight}>
          <Text style={styles.catPanelName}>{category.name}</Text>
          <Text style={styles.catPanelStats}>
            {answeredInCat}/{category.criteria.length} سؤال | ✓{yesInCat} ✗{noInCat}
          </Text>
        </View>
        <View style={[styles.catWeightBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.catWeightText}>{category.weight}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.catProgressBar, { backgroundColor: "#E5E7EB" }]}>
        <View
          style={[
            styles.catProgressFill,
            {
              width: `${category.criteria.length > 0 ? Math.round((answeredInCat / category.criteria.length) * 100) : 0}%`,
              backgroundColor: category.color,
            },
          ]}
        />
      </View>

      {/* Questions */}
      <View style={styles.criteriaList}>
        {category.criteria.map((criterion) => {
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
    </View>
  );
}

// ─── Main Assessment Screen ───────────────────────────────────────────────────
export default function AssessmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch, buildVisitRecord, getAnsweredCount, getTotalCount, getProgressPercentage } =
    useAssessment();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

  const handleCatSelect = (index: number) => {
    setActiveCatIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
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

  const activeCategory = ASSESSMENT_CATEGORIES[activeCatIndex];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Fixed Header */}
      <View style={[styles.assessmentHeader, { backgroundColor: colors.primary }]}>
        <Text style={styles.assessmentTitle}>نموذج التقييم</Text>
        <Text style={styles.assessmentSubtitle}>الزائر السري - مراكز الرعاية الأولية</Text>
      </View>

      {/* Overall Progress */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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

      {/* Category Tab Bar */}
      <CategoryTabBar
        categories={ASSESSMENT_CATEGORIES}
        activeIndex={activeCatIndex}
        onSelect={handleCatSelect}
        answers={state.answers as any}
      />

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Center Name & Date (only visible on first category or always) */}
        {activeCatIndex === 0 && (
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
        )}

        {/* Active Category Panel */}
        <CategoryPanel category={activeCategory} colors={colors} />

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          {activeCatIndex > 0 && (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleCatSelect(activeCatIndex - 1)}
              activeOpacity={0.8}
            >
              <IconSymbol name="chevron.right" size={18} color={colors.primary} />
              <Text style={[styles.navBtnText, { color: colors.primary }]}>
                {ASSESSMENT_CATEGORIES[activeCatIndex - 1].name}
              </Text>
            </TouchableOpacity>
          )}
          {activeCatIndex < ASSESSMENT_CATEGORIES.length - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { backgroundColor: activeCategory.color }]}
              onPress={() => handleCatSelect(activeCatIndex + 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.navBtnNextText}>
                {ASSESSMENT_CATEGORIES[activeCatIndex + 1].name}
              </Text>
              <IconSymbol name="chevron.left" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.finishBtn, { backgroundColor: colors.primary }]}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <IconSymbol name="checkmark.circle.fill" size={22} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>إنهاء التقييم وعرض النتائج</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center info reminder if not first tab */}
        {activeCatIndex > 0 && (
          <View style={[styles.centerReminder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.centerReminderText, { color: colors.muted }]}>
              {state.centerName ? `المركز: ${state.centerName}` : "لم يُدخل اسم المركز"}
              {" · "}
              {formatDisplayDate(state.visitDate)}
            </Text>
          </View>
        )}

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
  assessmentHeader: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  assessmentTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "right",
  },
  assessmentSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    textAlign: "right",
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  // Tab bar
  tabBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 90,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // Scroll content
  scrollContent: {
    paddingBottom: 20,
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
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
  // Category panel
  catPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  catPanelHeaderRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  catPanelName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
  },
  catPanelStats: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    textAlign: "right",
  },
  catWeightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  catWeightText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  catProgressBar: {
    height: 3,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  catProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  criteriaList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  subcategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  subcategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subcategoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  // Navigation
  navButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  navBtnNext: {
    borderWidth: 0,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  navBtnNextText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  finishBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#1B4F8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  centerReminder: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  centerReminderText: {
    fontSize: 12,
    textAlign: "center",
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
