import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { AppFooter } from "@/components/app-footer";
import { useColors } from "@/hooks/use-colors";
import { getAllVisits, VisitRecord } from "@/lib/storage";
import { JOUF_LOGO_BASE64 } from "@/constants/jouf-logo-base64";
import { ASSESSMENT_CATEGORIES, getComplianceLevel } from "@/constants/criteria-data";

// أحدث زيارة لكل مركز
function getLatestVisitPerCenter(visits: VisitRecord[]): VisitRecord[] {
  const map = new Map<string, VisitRecord>();
  for (const v of visits) {
    const existing = map.get(v.centerName);
    if (!existing || v.visitDate > existing.visitDate) {
      map.set(v.centerName, v);
    }
  }
  return Array.from(map.values());
}

export default function CompareScreen() {
  const colors = useColors();
  const [allVisits, setAllVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const visits = await getAllVisits();
    setAllVisits(visits);
    setLoading(false);
  };

  const latestVisits = getLatestVisitPerCenter(allVisits);
  const sorted = [...latestVisits].sort((a, b) => b.overallPercentage - a.overallPercentage);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.length > 3 ? sorted.slice(-3).reverse() : [];

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "#16A34A";
    if (rate >= 60) return "#D97706";
    return "#DC2626";
  };

  // حساب نسبة محور معين لزيارة معينة
  const getCategoryRate = (visit: VisitRecord, catId: string): number => {
    const catResult = visit.categoryResults?.find((c) => c.categoryId === catId);
    if (catResult) return Math.round(catResult.percentage);
    return 0;
  };

  const handleExportPDF = async () => {
    if ((Platform.OS as string) === "web") {
      Alert.alert("غير مدعوم", "تصدير PDF متاح على الجوال فقط");
      return;
    }
    if (sorted.length < 1) {
      Alert.alert("لا توجد بيانات", "يرجى إجراء تقييمات أولاً لإنشاء تقرير المقارنة");
      return;
    }
    setExporting(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const today = new Date().toLocaleDateString("ar-SA");

      // بناء جدول المحاور
      const buildCategoryTable = (visits: VisitRecord[], title: string, color: string) => {
        const rows = visits.map((v, i) => {
          const catCells = ASSESSMENT_CATEGORIES.map((cat) => {
            const rate = getCategoryRate(v, cat.id);
            const bg = rate >= 80 ? "#dcfce7" : rate >= 60 ? "#fef3c7" : "#fee2e2";
            return `<td style="text-align:center;background:${bg};font-weight:600;">${rate}%</td>`;
          }).join("");
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
          const bg = v.overallPercentage >= 80 ? "#dcfce7" : v.overallPercentage >= 60 ? "#fef3c7" : "#fee2e2";
          return `
            <tr>
              <td style="font-weight:700;text-align:right;padding:8px;">${medal} ${v.centerName}</td>
              <td style="text-align:center;background:${bg};font-weight:700;font-size:16px;">${v.overallPercentage}%</td>
              ${catCells}
              <td style="text-align:center;color:#666;">${v.visitDate}</td>
            </tr>`;
        }).join("");

        const catHeaders = ASSESSMENT_CATEGORIES.map((c) =>
          `<th style="background:#1e40af;color:white;padding:6px;font-size:11px;">${c.name.split(" ")[0]}</th>`
        ).join("");

        return `
          <div style="margin-bottom:30px;">
            <h3 style="background:${color};color:white;padding:12px 16px;border-radius:8px;margin-bottom:12px;">${title}</h3>
            <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:12px;direction:rtl;">
              <thead>
                <tr>
                  <th style="background:#1e3a8a;color:white;padding:8px;text-align:right;">المركز الصحي</th>
                  <th style="background:#1e3a8a;color:white;padding:8px;">الالتزام الكلي</th>
                  ${catHeaders}
                  <th style="background:#1e3a8a;color:white;padding:8px;">تاريخ الزيارة</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      };

      // جدول جميع المراكز
      const allRows = sorted.map((v, i) => {
        const bg = v.overallPercentage >= 80 ? "#dcfce7" : v.overallPercentage >= 60 ? "#fef3c7" : "#fee2e2";
        const status = v.overallPercentage >= 80 ? "ممتاز" : v.overallPercentage >= 60 ? "متوسط" : "يحتاج تحسين";
        return `
          <tr>
            <td style="text-align:center;font-weight:700;">${i + 1}</td>
            <td style="text-align:right;padding:8px;font-weight:600;">${v.centerName}</td>
            <td style="text-align:center;background:${bg};font-weight:700;font-size:15px;">${v.overallPercentage}%</td>
            <td style="text-align:center;">${v.totalYes}</td>
            <td style="text-align:center;">${v.totalNo}</td>
            <td style="text-align:center;background:${bg};">${status}</td>
            <td style="text-align:center;color:#666;">${v.visitDate}</td>
          </tr>`;
      }).join("");

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; direction: rtl; background: #f8fafc; }
    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #1e3a8a, #1e40af); color: white; border-radius: 12px; margin-bottom: 24px; }
    .header img { width: 80px; height: 80px; object-fit: contain; background: white; border-radius: 50%; padding: 6px; margin-bottom: 10px; }
    .header h1 { margin: 6px 0; font-size: 22px; }
    .header h2 { margin: 4px 0; font-size: 16px; opacity: 0.9; }
    .header p { margin: 4px 0; font-size: 13px; opacity: 0.75; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: white; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .summary-card .num { font-size: 28px; font-weight: 800; }
    .summary-card .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px; }
    .footer { text-align: center; margin-top: 30px; padding: 16px; background: #1e3a8a; color: white; border-radius: 8px; font-size: 12px; }
    @page { margin: 15mm; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${JOUF_LOGO_BASE64}" alt="شعار تجمع الجوف الصحي"/>
    <h1>تجمع الجوف الصحي</h1>
    <h2>إدارة الزائر السري</h2>
    <p>تقرير مقارنة أداء مراكز الرعاية الصحية الأولية</p>
    <p>تاريخ التقرير: ${today}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="num" style="color:#1e40af;">${sorted.length}</div>
      <div class="lbl">إجمالي المراكز المُقيَّمة</div>
    </div>
    <div class="summary-card">
      <div class="num" style="color:#16A34A;">${sorted.filter(v => v.overallPercentage >= 80).length}</div>
      <div class="lbl">مراكز بمستوى ممتاز</div>
    </div>
    <div class="summary-card">
      <div class="num" style="color:#DC2626;">${sorted.filter(v => v.overallPercentage < 60).length}</div>
      <div class="lbl">مراكز تحتاج تحسين</div>
    </div>
  </div>

  ${top3.length > 0 ? buildCategoryTable(top3, "أفضل 3 مراكز - نسب الالتزام بالمحاور", "#16A34A") : ""}
  ${bottom3.length > 0 ? buildCategoryTable(bottom3, "أقل 3 مراكز - نسب الالتزام بالمحاور", "#DC2626") : ""}

  <div style="margin-bottom:30px;">
    <h3 style="background:#1e3a8a;color:white;padding:12px 16px;border-radius:8px;margin-bottom:12px;">ترتيب جميع المراكز</h3>
    <table style="direction:rtl;">
      <thead>
        <tr style="background:#1e3a8a;color:white;">
          <th>الترتيب</th>
          <th style="text-align:right;">المركز الصحي</th>
          <th>نسبة الالتزام</th>
          <th>نعم</th>
          <th>لا</th>
          <th>التقييم</th>
          <th>تاريخ الزيارة</th>
        </tr>
      </thead>
      <tbody>${allRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <strong>تجمع الجوف الصحي - إدارة الزائر السري</strong><br/>
    M.lafiAlshrari &nbsp;|&nbsp; ${today}
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, margins: { left: 15, top: 15, right: 15, bottom: 15 } });
      const destUri = `${FileSystem.documentDirectory}تقرير_مقارنة_المراكز_${today.replace(/\//g, "-")}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: destUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destUri, {
          mimeType: "application/pdf",
          dialogTitle: "تقرير مقارنة المراكز الصحية",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (err) {
      Alert.alert("خطأ", "تعذّر إنشاء ملف PDF، يرجى المحاولة مرة أخرى");
    } finally {
      setExporting(false);
    }
  };

  const renderCenterCard = (visit: VisitRecord, rank: number) => {
    const barColor = getBarColor(visit.overallPercentage);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

    return (
      <View key={visit.id} style={[styles.centerCard, { backgroundColor: colors.surface, borderColor: barColor, borderWidth: 2 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.medal}>{medal}</Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.centerName, { color: colors.foreground }]} numberOfLines={1}>{visit.centerName}</Text>
            <Text style={[styles.visitDate, { color: colors.muted }]}>{visit.visitDate}</Text>
          </View>
          <View style={[styles.rateBadge, { backgroundColor: barColor }]}>
            <Text style={styles.rateText}>{visit.overallPercentage}%</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${visit.overallPercentage}%` as any, backgroundColor: barColor }]} />
        </View>

        {/* نسب المحاور */}
        <View style={styles.catGrid}>
          {ASSESSMENT_CATEGORIES.map((cat) => {
            const rate = getCategoryRate(visit, cat.id);
            const catColor = rate >= 80 ? "#16A34A" : rate >= 60 ? "#D97706" : "#DC2626";
            return (
              <View key={cat.id} style={styles.catItem}>
                <Text style={[styles.catRate, { color: catColor }]}>{rate}%</Text>
                <Text style={[styles.catName, { color: colors.muted }]} numberOfLines={2}>{cat.name.split(" ")[0]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* رأس الصفحة */}
        <View style={[styles.header, { backgroundColor: "#1e3a8a" }]}>
          <Text style={styles.headerTitle}>مقارنة المراكز الصحية</Text>
          <Text style={styles.headerSubtitle}>{sorted.length} مركز مُقيَّم</Text>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد بيانات كافية</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              قم بإجراء تقييمات لمراكز صحية متعددة وحفظ النتائج لعرض المقارنة
            </Text>
          </View>
        ) : (
          <>
            {/* ملخص سريع */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: "#dcfce7" }]}>
                <Text style={[styles.summaryNum, { color: "#16A34A" }]}>{sorted.filter(v => v.overallPercentage >= 80).length}</Text>
                <Text style={[styles.summaryLbl, { color: "#16A34A" }]}>ممتاز</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#fef3c7" }]}>
                <Text style={[styles.summaryNum, { color: "#D97706" }]}>{sorted.filter(v => v.overallPercentage >= 60 && v.overallPercentage < 80).length}</Text>
                <Text style={[styles.summaryLbl, { color: "#D97706" }]}>متوسط</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#fee2e2" }]}>
                <Text style={[styles.summaryNum, { color: "#DC2626" }]}>{sorted.filter(v => v.overallPercentage < 60).length}</Text>
                <Text style={[styles.summaryLbl, { color: "#DC2626" }]}>يحتاج تحسين</Text>
              </View>
            </View>

            {/* أفضل 3 مراكز */}
            {top3.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: "#16A34A" }]}>
                  <Text style={styles.sectionTitle}>أفضل 3 مراكز</Text>
                </View>
                {top3.map((v, i) => renderCenterCard(v, i + 1))}
              </View>
            )}

            {/* أقل 3 مراكز */}
            {bottom3.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: "#DC2626" }]}>
                  <Text style={styles.sectionTitle}>أقل 3 مراكز - تحتاج تحسين</Text>
                </View>
                {bottom3.map((v, i) => renderCenterCard(v, i + 1))}
              </View>
            )}

            {/* زر تصدير PDF */}
            <TouchableOpacity
              style={[styles.exportBtn, { opacity: exporting ? 0.7 : 1 }]}
              onPress={handleExportPDF}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.exportBtnText}>تصدير تقرير المقارنة PDF</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <AppFooter />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 30 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  summaryRow: { flexDirection: "row", gap: 10, padding: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  summaryNum: { fontSize: 28, fontWeight: "800" },
  summaryLbl: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  centerCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  medal: { fontSize: 28, marginLeft: 10 },
  cardInfo: { flex: 1 },
  centerName: { fontSize: 14, fontWeight: "700" },
  visitDate: { fontSize: 11, marginTop: 2 },
  rateBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  rateText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  progressBg: { height: 8, borderRadius: 4, marginBottom: 12, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catItem: { alignItems: "center", minWidth: 60, flex: 1 },
  catRate: { fontSize: 13, fontWeight: "700" },
  catName: { fontSize: 9, textAlign: "center", marginTop: 2 },
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  exportBtn: {
    margin: 16,
    backgroundColor: "#1e3a8a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  exportBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
