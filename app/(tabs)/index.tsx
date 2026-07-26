import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AppFooter } from "@/components/app-footer";
import { useColors } from "@/hooks/use-colors";
import { getAllVisits, VisitRecord, formatDate } from "@/lib/storage";
import { getComplianceLevel } from "@/constants/criteria-data";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/lib/auth-context";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // توجيه لشاشة تسجيل الدخول إذا لم يكن المستخدم مصادقاً
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "تسجيل الخروج",
      "هل تريد تسجيل الخروج من التطبيق؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  }, [logout, router]);

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

  const totalVisits = visits.length;
  const avgCompliance =
    totalVisits > 0
      ? Math.round(visits.reduce((sum, v) => sum + v.overallPercentage, 0) / totalVisits)
      : 0;

  const complianceLevel = getComplianceLevel(avgCompliance);

  // لا تعرض شيئاً أثناء التحقق من المصادقة
  if (isLoading || !isAuthenticated) return null;

  const renderVisitItem = ({ item }: { item: VisitRecord }) => {
    const level = getComplianceLevel(item.overallPercentage);
    return (
      <TouchableOpacity
        style={[styles.visitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: "/visit-detail", params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.visitCardHeader}>
          <View style={styles.visitCardInfo}>
            <Text style={[styles.centerName, { color: colors.foreground }]} numberOfLines={1}>
              {item.centerName || "مركز غير محدد"}
            </Text>
            <Text style={[styles.visitDate, { color: colors.muted }]}>
              {formatDate(item.visitDate)}
            </Text>
          </View>
          <View style={[styles.percentageBadge, { backgroundColor: level.bgColor }]}>
            <Text style={[styles.percentageText, { color: level.color }]}>
              {item.overallPercentage}%
            </Text>
          </View>
        </View>
        <View style={styles.visitCardFooter}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${item.overallPercentage}%` as any, backgroundColor: level.color },
              ]}
            />
          </View>
          <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
        </View>
        <View style={styles.visitStats}>
          <Text style={[styles.statText, { color: colors.muted }]}>
            ✓ {item.totalYes} نعم
          </Text>
          <Text style={[styles.statText, { color: colors.muted }]}>
            ✗ {item.totalNo} لا
          </Text>
          <Text style={[styles.statText, { color: colors.muted }]}>
            {item.totalYes + item.totalNo}/{item.totalQuestions} سؤال
          </Text>
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
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
              <View style={styles.headerContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>الزائر السري</Text>
                  <Text style={styles.headerSubtitle}>تقييم مراكز الرعاية الصحية الأولية</Text>
                  <Text style={styles.headerOrg}>تجمع الجوف الصحي</Text>
                </View>
                {/* زر تسجيل الخروج */}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.logoutIcon}>🚪</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{totalVisits}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>إجمالي الزيارات</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: complianceLevel.color }]}>
                  {totalVisits > 0 ? `${avgCompliance}%` : "--"}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>متوسط الالتزام</Text>
              </View>
            </View>

            {/* New Assessment Button */}
            <TouchableOpacity
              style={[styles.newAssessmentBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/assessment")}
              activeOpacity={0.85}
            >
              <IconSymbol name="plus.circle.fill" size={22} color="#FFFFFF" />
              <Text style={styles.newAssessmentText}>بدء تقييم جديد</Text>
            </TouchableOpacity>

            {/* Recent Visits Header */}
            {visits.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  آخر الزيارات
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>عرض الكل</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              لا توجد زيارات بعد
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              ابدأ أول تقييم لمركز صحي بالضغط على الزر أعلاه
            </Text>
          </View>
        }
      />
      <AppFooter />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    textAlign: "right",
  },
  headerOrg: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    textAlign: "right",
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  logoutIcon: {
    fontSize: 20,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  newAssessmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#1B4F8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newAssessmentText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  visitCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  visitCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  visitCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  centerName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  visitDate: {
    fontSize: 13,
    marginTop: 3,
    textAlign: "right",
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "800",
  },
  visitCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: "600",
    minWidth: 70,
    textAlign: "right",
  },
  visitStats: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  statText: {
    fontSize: 12,
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
