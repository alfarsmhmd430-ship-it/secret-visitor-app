import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

export default function ChangePasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async () => {
    setError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }
    if (newPassword.length < 4) {
      setError("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setLoading(false);
    if (result.success) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("تم بنجاح", "تم تغيير كلمة المرور بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } else {
      setError(result.error ?? "حدث خطأ");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="chevron.right" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            {/* كلمة المرور الحالية */}
            <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور الحالية</Text>
            <View style={[styles.inputWrapper, {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }]}>
              <TouchableOpacity onPress={() => setShowOld(!showOld)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showOld ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showOld}
                value={oldPassword}
                onChangeText={(t) => { setOldPassword(t); setError(""); }}
                textAlign="right"
                returnKeyType="next"
              />
            </View>

            {/* كلمة المرور الجديدة */}
            <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور الجديدة</Text>
            <View style={[styles.inputWrapper, {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }]}>
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showNew ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(""); }}
                textAlign="right"
                returnKeyType="next"
              />
            </View>

            {/* تأكيد كلمة المرور */}
            <Text style={[styles.label, { color: colors.foreground }]}>تأكيد كلمة المرور الجديدة</Text>
            <View style={[styles.inputWrapper, {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                placeholderTextColor={colors.muted}
                secureTextEntry={true}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={handleChange}
              />
            </View>

            {/* رسالة الخطأ */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#FEE2E2" }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* زر الحفظ */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleChange}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>حفظ كلمة المرور الجديدة</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.hint, { color: colors.muted }]}>
              كلمة المرور الافتراضية هي: 1234
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
    paddingVertical: 0,
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  errorBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
});
