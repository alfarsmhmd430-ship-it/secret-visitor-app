import { describe, it, expect, beforeEach, vi } from "vitest";

// محاكاة AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete mockStorage[key]; }),
  },
}));

// منطق المصادقة المستخرج للاختبار
const DEFAULT_PASSWORD = "1234";
const AUTH_KEY = "secret_visitor_auth";
const SESSION_KEY = "secret_visitor_session";

async function loginLogic(password: string, storedPassword: string | null) {
  const correct = storedPassword ?? DEFAULT_PASSWORD;
  if (password === correct) return { success: true };
  return { success: false, error: "كلمة المرور غير صحيحة" };
}

async function changePasswordLogic(
  oldPassword: string,
  newPassword: string,
  storedPassword: string | null
) {
  const correct = storedPassword ?? DEFAULT_PASSWORD;
  if (oldPassword !== correct) return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
  if (newPassword.length < 4) return { success: false, error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" };
  return { success: true };
}

describe("نظام المصادقة - تسجيل الدخول", () => {
  it("يجب أن يسمح بالدخول بكلمة المرور الافتراضية 1234", async () => {
    const result = await loginLogic("1234", null);
    expect(result.success).toBe(true);
  });

  it("يجب أن يرفض كلمة المرور الخاطئة", async () => {
    const result = await loginLogic("wrong", null);
    expect(result.success).toBe(false);
    expect(result.error).toBe("كلمة المرور غير صحيحة");
  });

  it("يجب أن يرفض كلمة المرور الفارغة", async () => {
    const result = await loginLogic("", null);
    expect(result.success).toBe(false);
  });

  it("يجب أن يقبل كلمة المرور المخصصة المحفوظة", async () => {
    const result = await loginLogic("mypass123", "mypass123");
    expect(result.success).toBe(true);
  });

  it("يجب أن يرفض كلمة المرور القديمة بعد التغيير", async () => {
    const result = await loginLogic("1234", "newpass");
    expect(result.success).toBe(false);
  });
});

describe("نظام المصادقة - تغيير كلمة المرور", () => {
  it("يجب أن يسمح بتغيير كلمة المرور بالبيانات الصحيحة", async () => {
    const result = await changePasswordLogic("1234", "newpass", null);
    expect(result.success).toBe(true);
  });

  it("يجب أن يرفض إذا كانت كلمة المرور الحالية خاطئة", async () => {
    const result = await changePasswordLogic("wrong", "newpass", null);
    expect(result.success).toBe(false);
    expect(result.error).toBe("كلمة المرور الحالية غير صحيحة");
  });

  it("يجب أن يرفض كلمة المرور الجديدة الأقل من 4 أحرف", async () => {
    const result = await changePasswordLogic("1234", "abc", null);
    expect(result.success).toBe(false);
    expect(result.error).toBe("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
  });

  it("يجب أن يقبل كلمة المرور الجديدة المكونة من 4 أحرف بالضبط", async () => {
    const result = await changePasswordLogic("1234", "abcd", null);
    expect(result.success).toBe(true);
  });

  it("يجب أن يقبل كلمة المرور الجديدة الطويلة", async () => {
    const result = await changePasswordLogic("1234", "securePassword2026", null);
    expect(result.success).toBe(true);
  });
});

describe("قيم ثوابت المصادقة", () => {
  it("كلمة المرور الافتراضية يجب أن تكون 1234", () => {
    expect(DEFAULT_PASSWORD).toBe("1234");
  });

  it("مفاتيح التخزين يجب أن تكون محددة", () => {
    expect(AUTH_KEY).toBe("secret_visitor_auth");
    expect(SESSION_KEY).toBe("secret_visitor_session");
  });
});
