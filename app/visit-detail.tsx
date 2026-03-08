import React, { useEffect, useState, useCallback } from "react";
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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getVisitById, VisitRecord, formatDate } from "@/lib/storage";
import { getComplianceLevel, ASSESSMENT_CATEGORIES } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function VisitDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [visit, setVisit] = useState<VisitRecord | null>(null);

  useEffect(() => {
    if (id) {
      getVisitById(id).then(setVisit);
    }
  }, [id]);

  const generateReportText = useCallback((v: VisitRecord) => {
    const level = getComplianceLevel(v.overallPercentage);
    const noWithReasons = v.answers.filter((a) => a.answer === "no" && a.reason?.trim());

    let report = `بسم الله الرحمن الرحيم\n\n`;
    report += `المكرم مدير ${v.centerName}،\n\n`;
    report += `السلام عليكم ورحمة الله وبركاته،\n\n`;
    report += `نتائج زيارة الزائر السري بتاريخ ${formatDate(v.visitDate)}\n`;
    report += `${"─".repeat(40)}\n\n`;
    report += `📊 نسبة الالتزام الإجمالية: ${v.overallPercentage}% (${level.label})\n`;
    report += `✓ عدد الإجابات بـ"نعم": ${v.totalYes}\n`;
    report += `✗ عدد الإجابات بـ"لا": ${v.totalNo}\n`;
    report += `📋 إجمالي الأسئلة المجابة: ${v.totalYes + v.totalNo} من ${v.totalQuestions}\n\n`;

    report += `نتائج المحاور:\n`;
    report += `${"─".repeat(40)}\n`;
    v.categoryResults.forEach((cat) => {
      report += `• ${cat.categoryName} (${cat.weight}%): ${cat.percentage}% الالتزام\n`;
    });

    if (noWithReasons.length > 0) {
      report += `\nالملاحظات التفصيلية:\n`;
      report += `${"─".repeat(40)}\n`;
      ASSESSMENT_CATEGORIES.forEach((category) => {
        const catObs = noWithReasons.filter((a) =>
          category.criteria.some((c) => c.id === a.questionId)
        );
        if (catObs.length > 0) {
          report += `\n[${category.name}]\n`;
          catObs.forEach((a) => {
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
  }, []);

  const handleSendReport = async () => {
    if (!visit) return;
    const reportText = generateReportText(visit);

    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(reportText);
      Alert.alert("تم النسخ", "تم نسخ التقرير إلى الحافظة");
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
    if (!visit) return;
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
      const fileUri =
        FileSystem.documentDirectory +
        `تقرير_${visit.centerName}_${visit.visitDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "تصدير البيانات",
        });
      }
    } catch {
      Alert.alert("خطأ", "تعذّر تصدير الملف");
    }
  };

  if (!visit) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const level = getComplianceLevel(visit.overallPercentage);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
            <Text style={styles.backText}>رجوع</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{visit.centerName}</Text>
          <Text style={styles.headerDate}>{formatDate(visit.visitDate)}</Text>
        </View>

        {/* Overall Result */}
        <View style={[styles.resultCard, { backgroundColor: level.bgColor, borderColor: level.color }]}>
          <Text style={[styles.resultPct, { color: level.color }]}>{visit.overallPercentage}%</Text>
          <Text style={[styles.resultLabel, { color: level.color }]}>{level.label}</Text>
          <Text style={[styles.resultStats, { color: level.color }]}>
            ✓ {visit.totalYes} نعم | ✗ {visit.totalNo} لا | {visit.totalYes + visit.totalNo}/{visit.totalQuestions} سؤال
          </Text>
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
                  <Text style={[styles.catMeta, { color: colors.muted }]}>
                    الوزن {cat.weight}% | ✓{cat.yesCount} ✗{cat.noCount}
                  </Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={[styles.catPct, { color: catLevel.color }]}>{cat.percentage}%</Text>
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

        {/* Observations */}
        {visit.answers.filter((a) => a.answer === "no").length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              الملاحظات ({visit.answers.filter((a) => a.answer === "no").length})
            </Text>
            {ASSESSMENT_CATEGORIES.map((category) => {
              const catObs = visit.answers.filter(
                (a) =>
                  a.answer === "no" &&
                  category.criteria.some((c) => c.id === a.questionId)
              );
              if (catObs.length === 0) return null;
              return (
                <View key={category.id} style={styles.obsSection}>
                  <Text style={[styles.obsCatName, { color: category.color }]}>
                    {category.name}
                  </Text>
                  {catObs.map((obs) => {
                    const criterion = category.criteria.find((c) => c.id === obs.questionId);
                    return (
                      <View
                        key={obs.questionId}
                        style={[styles.obsItem, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                      >
                        <Text style={[styles.obsQ, { color: "#1A2332" }]}>
                          {criterion?.question}
                        </Text>
                        {obs.reason ? (
                          <Text style={[styles.obsReason, { color: "#DC2626" }]}>
                            السبب: {obs.reason}
                          </Text>
                        ) : null}
                        {obs.photoUris && obs.photoUris.length > 0 && (
                          <ScrollView
                            horizontal
                            style={styles.photosRow}
                            showsHorizontalScrollIndicator={false}
                          >
                            {obs.photoUris.map((uri, idx) => (
                              <Image key={idx} source={{ uri }} style={styles.photo} />
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
            style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
            onPress={handleSendReport}
            activeOpacity={0.85}
          >
            <IconSymbol name="envelope.fill" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>إرسال التقرير</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#059669" }]}
            onPress={handleExportCSV}
            activeOpacity={0.85}
          >
            <IconSymbol name="arrow.down.doc.fill" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>تصدير CSV</Text>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "right",
  },
  headerDate: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textAlign: "right",
  },
  resultCard: {
    margin: 16,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
  },
  resultPct: {
    fontSize: 52,
    fontWeight: "900",
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  resultStats: {
    fontSize: 13,
    marginTop: 8,
    opacity: 0.8,
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
  catMeta: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "right",
  },
  catRight: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  catPct: {
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
  obsSection: {
    marginBottom: 12,
  },
  obsCatName: {
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
  obsQ: {
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
  photosRow: {
    marginTop: 8,
  },
  photo: {
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
