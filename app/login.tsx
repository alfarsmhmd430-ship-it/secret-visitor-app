import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(password);
    setLoading(false);
    if (!result.success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(result.error ?? "كلمة المرور غير صحيحة");
      setPassword("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // التوجيه للشاشة الرئيسية بعد نجاح تسجيل الدخول
      router.replace("/(tabs)/index" as any);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#1A3A6B" }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* الشعار والعنوان */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("@/assets/images/jouf-logo.jpg")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appTitle}>الزائر السري</Text>
              <Text style={styles.appSubtitle}>تقييم مراكز الرعاية الصحية الأولية</Text>
              <Text style={styles.orgName}>تجمع الجوف الصحي</Text>
              <Text style={styles.deptName}>إدارة الزائر السري بتجمع الجوف الصحي</Text>
            </View>

            {/* بطاقة تسجيل الدخول */}
            <View style={[styles.card, { backgroundColor: colors.background }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                تسجيل الدخول
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                أدخل كلمة المرور للمتابعة
              </Text>

              {/* حقل كلمة المرور */}
              <View style={[styles.inputWrapper, {
                borderColor: error ? colors.error : colors.border,
                backgroundColor: colors.surface,
              }]}>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="كلمة المرور"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  autoFocus={false}
                  textAlign="right"
                />
                <View style={styles.lockIcon}>
                  <Text style={{ fontSize: 20 }}>🔒</Text>
                </View>
              </View>

              {/* رسالة الخطأ */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#FEE2E2" }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    ⚠️ {error}
                    {attempts >= 3 ? `  (المحاولة ${attempts})` : ""}
                  </Text>
                </View>
              ) : null}

              {/* زر الدخول */}
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: "#1A3A6B", opacity: loading ? 0.7 : 1 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>دخول</Text>
                )}
              </TouchableOpacity>

              {/* تلميح كلمة المرور الافتراضية */}
              <Text style={[styles.hint, { color: colors.muted }]}>
                
              </Text>
            </View>

            {/* تذييل */}
            <Text style={styles.footer}>
              إدارة الزائر السري · تجمع الجوف الصحي
            </Text>
            <Text style={styles.copyright}>
              © فريق الزائر السري · M.lafiAlshrari
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 4,
  },
  orgName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  deptName: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 3,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 54,
  },
  lockIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    textAlign: "right",
    letterSpacing: 2,
    paddingVertical: 0,
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  errorBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  loginBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1A3A6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  copyright: {
    marginTop: 4,
    fontSize: 8,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
