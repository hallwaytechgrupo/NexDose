import React, { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow } from "../theme/tokens";
import { Feather } from "@expo/vector-icons";

export function AppScreen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function SurfaceCard({
  children,
  muted = false,
}: PropsWithChildren<{ muted?: boolean }>) {
  return (
    <View
      style={[
        styles.card,
        muted ? styles.cardMuted : styles.cardDefault,
        shadow.card,
      ]}
    >
      {children}
    </View>
  );
}

export function GlassCard({ children }: PropsWithChildren) {
  return (
    <View style={[styles.card, styles.glass, shadow.card]}>{children}</View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function GradientButton({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[colors.primary, colors.primaryBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <Text style={styles.gradientButtonText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text
        style={[styles.chipText, active ? styles.chipTextActive : undefined]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function InputField({
  label,
  value,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        defaultValue={value}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        style={styles.input}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch 
        value={value} 
        trackColor={{ true: colors.primaryBright }}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
    gap: 24,
  },
  card: {
    borderRadius: radius.xl,
    padding: 20,
  },
  cardDefault: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardMuted: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  glass: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  gradientButton: {
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipIdle: {
    backgroundColor: colors.surfaceLowest,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  toggleSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
