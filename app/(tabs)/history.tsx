import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getAllVisits, deleteVisit, VisitRecord, formatDate } from "@/lib/storage";
import { getComplianceLevel, ASSESSMENT_CATEGORIES } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = useCallback(async () => {
    const data = await getAllVisits();
    setVisits(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [loadVisits])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisits();
    setRefreshing(false);
  }, [loadVisits]);

  const handleDelete = (id: string, centerName: string) => {
    Alert.alert(
      "حذف الزيارة",
      `هل أنت متأكد من حذف زيارة "${centerName}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await deleteVisit(id);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            await loadVisits();
          },
        },
      ]
    );
  };

  const handleExportAll = async () => {
    if (visits.length === 0) {
      Alert.alert("تنبيه", "لا توجد زيارات للتصدير");
      return;
    }

    let csv = "رقم,المركز,تاريخ الزيارة,نسبة الالتزام,عدد نعم,عدد لا,إجمالي الأسئلة\n";
    visits.forEach((v, idx) => {
      csv += `${idx + 1},"${v.centerName}","${v.visitDate}",${v.overallPercentage}%,${v.totalYes},${v.totalNo},${v.totalQuestions}\n`;
    });

    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(csv);
      Alert.alert("تم", "تم نسخ البيانات بصيغة CSV إلى الحافظة");
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + `جميع_الزيارات_${new Date().toISOString().split("T")[0]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "تصدير جميع الزيارات" });
      }
    } catch {
      Alert.alert("خطأ", "تعذّر تصدير الملف");
    }
  };

  const renderVisitItem = ({ item }: { item: VisitRecord }) => {
    const level = getComplianceLevel(item.overallPercentage);
    return (
      <TouchableOpacity
        style={[styles.visitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: "/visit-detail" as any,
            params: { id: item.id },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.centerName)}
          >
            <IconSymbol name="trash.fill" size={16} color="#DC2626" />
          </TouchableOpacity>
          <View style={styles.cardInfo}>
            <Text style={[styles.centerName, { color: colors.foreground }]} numberOfLines={1}>
              {item.centerName || "مركز غير محدد"}
            </Text>
            <Text style={[styles.visitDate, { color: colors.muted }]}>
              {formatDate(item.visitDate)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: level.bgColor }]}>
            <Text style={[styles.badgeText, { color: level.color }]}>{item.overallPercentage}%</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${item.overallPercentage}%`, backgroundColor: level.color },
              ]}
            />
          </View>
          <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
        </View>

        <View style={styles.statsRow}>
          {item.categoryResults.map((cat) => {
            const catLevel = getComplianceLevel(cat.percentage);
            return (
              <View key={cat.categoryId} style={styles.catStat}>
                <Text style={[styles.catStatPct, { color: catLevel.color }]}>{cat.percentage}%</Text>
                <Text style={[styles.catStatName, { color: colors.muted }]} numberOfLines={1}>
                  {cat.categoryName.split(" ")[0]}
                </Text>
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>سجل الزيارات</Text>
                <Text style={styles.headerSubtitle}>{visits.length} زيارة مسجلة</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => router.push("/change-password" as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
            {visits.length > 0 && (
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: "#059669" }]}
                onPress={handleExportAll}
                activeOpacity={0.85}
              >
                <IconSymbol name="arrow.down.doc.fill" size={18} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>تصدير جميع البيانات (CSV)</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              لا توجد زيارات مسجلة
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              قم بإجراء تقييم جديد لمركز صحي وحفظ النتيجة
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textAlign: "right",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  visitCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  cardInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  centerName: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  visitDate: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    minWidth: 54,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 65,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  catStat: {
    alignItems: "center",
  },
  catStatPct: {
    fontSize: 13,
    fontWeight: "700",
  },
  catStatName: {
    fontSize: 10,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
