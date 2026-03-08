import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Share,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAssessment } from "@/lib/assessment-context";
import { saveVisit, VisitRecord, formatDate } from "@/lib/storage";
import { getComplianceLevel, ASSESSMENT_CATEGORIES } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

// Circular Progress Component
function CircularProgress({
  percentage,
  size = 160,
  strokeWidth = 14,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Background circle */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "#E5E7EB",
        }}
      />
      {/* Progress arc using rotation trick */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "transparent",
          borderTopColor: percentage > 0 ? color : "transparent",
          borderRightColor: percentage > 25 ? color : "transparent",
          borderBottomColor: percentage > 50 ? color : "transparent",
          borderLeftColor: percentage > 75 ? color : "transparent",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      {/* Center text */}
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color }}>{percentage}%</Text>
        <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>نسبة الالتزام</Text>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { visitData } = useLocalSearchParams<{ visitData: string }>();
  const { dispatch } = useAssessment();
  const [isSaved, setIsSaved] = useState(false);

  const visit: VisitRecord | null = visitData ? JSON.parse(visitData) : null;

  if (!visit) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.foreground }}>لا توجد بيانات</Text>
        </View>
      </ScreenContainer>
    );
  }

  const level = getComplianceLevel(visit.overallPercentage);

  const handleSave = async () => {
    try {
      await saveVisit(visit);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsSaved(true);
      Alert.alert("تم الحفظ", "تم حفظ نتيجة الزيارة بنجاح في السجلات");
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى");
    }
  };

  const generateReportText = () => {
    const noAnswers = visit.answers.filter((a) => a.answer === "no");
    const noWithReasons = noAnswers.filter((a) => a.reason?.trim());

    let report = `بسم الله الرحمن الرحيم\n\n`;
    report += `المكرم مدير ${visit.centerName}،\n\n`;
    report += `السلام عليكم ورحمة الله وبركاته،\n\n`;
    report += `نتائج زيارة الزائر السري بتاريخ ${formatDate(visit.visitDate)}\n`;
    report += `${"─".repeat(40)}\n\n`;
    report += `📊 نسبة الالتزام الإجمالية: ${visit.overallPercentage}% (${level.label})\n`;
    report += `✓ عدد الإجابات بـ"نعم": ${visit.totalYes}\n`;
    report += `✗ عدد الإجابات بـ"لا": ${visit.totalNo}\n`;
    report += `📋 إجمالي الأسئلة المجابة: ${visit.totalYes + visit.totalNo} من ${visit.totalQuestions}\n\n`;

    report += `نتائج المحاور:\n`;
    report += `${"─".repeat(40)}\n`;
    visit.categoryResults.forEach((cat) => {
      report += `• ${cat.categoryName} (${cat.weight}%): ${cat.percentage}% الالتزام\n`;
    });

    if (noWithReasons.length > 0) {
      report += `\nالملاحظات التفصيلية:\n`;
      report += `${"─".repeat(40)}\n`;

      ASSESSMENT_CATEGORIES.forEach((category) => {
        const catNoAnswers = noWithReasons.filter((a) =>
          category.criteria.some((c) => c.id === a.questionId)
        );
        if (catNoAnswers.length > 0) {
          report += `\n[${category.name}]\n`;
          catNoAnswers.forEach((a) => {
            const criterion = category.criteria.find((c) => c.id === a.questionId);
            if (criterion) {
              report += `  - ${criterion.question}\n`;
              if (a.reason) report += `    السبب: ${a.reason}\n`;
            }
          });
        }
      });
    }

    report += `\n${"─".repeat(40)}\n`;
    report += `يرجى اتخاذ الإجراءات لتحليل الأسباب واتخاذ الإجراءات المناسبة لتحسينها في مدة أسبوعين من تاريخه، وإرسال ما تم من تحسينات بالصور، أو بأخذ إقرار إذا كانت الملاحظة تخص تواجد الموظفين أو عدم الالتزام بالإجراءات.\n\n`;
    report += `مع أطيب تحياتنا،\n`;
    report += `فريق الزائر السري\n`;
    report += `مدير إدارة الزائر السري بتجمع الجوف الصحي\n`;
    report += `إلهام مبارك البحيران`;

    return report;
  };

  const handleSendReport = async () => {
    const reportText = generateReportText();

    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(reportText);
      Alert.alert("تم النسخ", "تم نسخ التقرير إلى الحافظة. يمكنك لصقه في البريد الإلكتروني.");
      return;
    }

    try {
      await Share.share({
        message: reportText,
        title: `تقرير الزائر السري - ${visit.centerName}`,
      });
    } catch {
      await Clipboard.setStringAsync(reportText);
      Alert.alert("تم النسخ", "تم نسخ التقرير إلى الحافظة");
    }
  };

  const handleExportCSV = async () => {
    const noAnswers = visit.answers.filter((a) => a.answer === "no");
    let csv = "رقم,المحور,السؤال,الإجابة,السبب\n";

    let rowNum = 1;
    ASSESSMENT_CATEGORIES.forEach((category) => {
      category.criteria.forEach((criterion) => {
        const answer = visit.answers.find((a) => a.questionId === criterion.id);
        const answerText = answer?.answer === "yes" ? "نعم" : answer?.answer === "no" ? "لا" : "لم يُجب";
        const reason = answer?.reason ?? "";
        csv += `${rowNum},"${category.name}","${criterion.question}","${answerText}","${reason}"\n`;
        rowNum++;
      });
    });

    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(csv);
      Alert.alert("تم", "تم نسخ البيانات بصيغة CSV إلى الحافظة");
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + `تقرير_${visit.centerName}_${visit.visitDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "تصدير البيانات" });
      }
    } catch {
      Alert.alert("خطأ", "تعذّر تصدير الملف");
    }
  };

  const handleNewAssessment = () => {
    dispatch({ type: "RESET" });
    router.replace("/(tabs)/assessment" as any);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: level.color }]}>
          <Text style={styles.headerTitle}>نتائج التقييم</Text>
          <Text style={styles.headerCenter}>{visit.centerName}</Text>
          <Text style={styles.headerDate}>{formatDate(visit.visitDate)}</Text>
        </View>

        {/* Circular Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CircularProgress
            percentage={visit.overallPercentage}
            size={180}
            strokeWidth={16}
            color={level.color}
          />
          <View style={[styles.levelBadge, { backgroundColor: level.bgColor }]}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#16A34A" }]}>{visit.totalYes}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>نعم</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#DC2626" }]}>{visit.totalNo}</Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>لا</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>
                {visit.totalYes + visit.totalNo}
              </Text>
              <Text style={[styles.statLbl, { color: colors.muted }]}>مجاب</Text>
            </View>
          </View>
        </View>

        {/* Category Results */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>نتائج المحاور</Text>
          {visit.categoryResults.map((cat) => {
            const catLevel = getComplianceLevel(cat.percentage);
            return (
              <View key={cat.categoryId} style={styles.catRow}>
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat.categoryName}</Text>
                  <Text style={[styles.catWeight, { color: colors.muted }]}>
                    الوزن: {cat.weight}% | ✓{cat.yesCount} ✗{cat.noCount}
                  </Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={[styles.catPercentage, { color: catLevel.color }]}>
                    {cat.percentage}%
                  </Text>
                  <View style={[styles.catBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.catBarFill,
                        { width: `${cat.percentage}%`, backgroundColor: catLevel.color },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Observations (No answers with reasons) */}
        {visit.answers.filter((a) => a.answer === "no" && a.reason?.trim()).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>الملاحظات التفصيلية</Text>
            {ASSESSMENT_CATEGORIES.map((category) => {
              const catObs = visit.answers.filter(
                (a) =>
                  a.answer === "no" &&
                  a.reason?.trim() &&
                  category.criteria.some((c) => c.id === a.questionId)
              );
              if (catObs.length === 0) return null;
              return (
                <View key={category.id} style={styles.obsCategory}>
                  <Text style={[styles.obsCategoryName, { color: category.color }]}>
                    {category.name}
                  </Text>
                  {catObs.map((obs) => {
                    const criterion = category.criteria.find((c) => c.id === obs.questionId);
                    return (
                      <View
                        key={obs.questionId}
                        style={[styles.obsItem, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                      >
                        <Text style={[styles.obsQuestion, { color: "#1A2332" }]}>
                          {criterion?.question}
                        </Text>
                        <Text style={[styles.obsReason, { color: "#DC2626" }]}>
                          السبب: {obs.reason}
                        </Text>
                        {obs.photoUris && obs.photoUris.length > 0 && (
                          <ScrollView horizontal style={styles.obsPhotos} showsHorizontalScrollIndicator={false}>
                            {obs.photoUris.map((uri, idx) => (
                              <Image key={idx} source={{ uri }} style={styles.obsPhoto} />
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isSaved ? "#16A34A" : colors.primary },
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{isSaved ? "تم الحفظ ✓" : "حفظ النتيجة"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
            onPress={handleSendReport}
            activeOpacity={0.85}
          >
            <IconSymbol name="envelope.fill" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>إرسال التقرير</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#059669" }]}
            onPress={handleExportCSV}
            activeOpacity={0.85}
          >
            <IconSymbol name="arrow.down.doc.fill" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>تصدير CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={handleNewAssessment}
            activeOpacity={0.85}
          >
            <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>تقييم جديد</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerCenter: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  progressCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 14,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  catInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  catName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  catWeight: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "right",
  },
  catRight: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  catPercentage: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  catBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  catBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  obsCategory: {
    marginBottom: 12,
  },
  obsCategoryName: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  obsItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  obsQuestion: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 4,
    lineHeight: 20,
  },
  obsReason: {
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  obsPhotos: {
    marginTop: 8,
  },
  obsPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  actionsContainer: {
    marginHorizontal: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
