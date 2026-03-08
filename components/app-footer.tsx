import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function AppFooter() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.muted }]}>
        © فريق الزائر السري · تجمع الجوف الصحي
      </Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        M.lafiAlshrari
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 10,
    paddingBottom: 16,
    opacity: 0.5,
  },
  text: {
    fontSize: 9,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 1,
    letterSpacing: 0.5,
  },
});
