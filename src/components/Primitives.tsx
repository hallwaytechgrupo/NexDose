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

/**
 * @file Primitives.tsx
 * @brief Coleção de componentes reutilizáveis (UI kit) do NexDose.
 * 
 * Este arquivo contém os blocos de construção básicos da interface do usuário (botões, cartões, inputs, etc).
 * O objetivo é manter a consistência visual em todo o aplicativo e evitar a repetição de código.
 */

/**
 * Container principal padrão para as telas do app.
 * Suporta rolagem (ScrollView) por padrão, mas pode ser desativada.
 */
export function AppScreen({
  children,
  useScrollView = true,
}: PropsWithChildren<{ useScrollView?: boolean }>) {
  if (useScrollView) {
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
  return <View style={[styles.screen, styles.content]}>{children}</View>;
}

/**
 * Cartão de superfície padrão. Usado para agrupar conteúdo.
 * O prop 'muted' pode ser usado para aplicar um estilo visual ligeiramente diferente (atualmente similar ao padrão).
 */
export function SurfaceCard({
  children,
  muted = false,
  style,
}: PropsWithChildren<{ muted?: boolean; style?: any }>) {
  return (
    <View
      style={[
        styles.card,
        muted ? styles.cardMuted : styles.cardDefault,
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Cartão com estilo "Glassmorphism" (vidro). 
 * Usado geralmente para elementos de destaque.
 */
export function GlassCard({ children }: PropsWithChildren) {
  return (
    <View style={[styles.card, styles.glass, shadow.card]}>{children}</View>
  );
}

/**
 * Título de seção padronizado. 
 * Geralmente usado em letras maiúsculas para dividir áreas de conteúdo.
 */
export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/**
 * Botão principal do aplicativo com fundo em gradiente.
 * Suporta uma variante 'danger' (vermelho) para ações destrutivas ou de alerta.
 */
export function GradientButton({
  title,
  onPress,
  variant,
}: {
  title: string;
  onPress?: () => void;
  variant?: "default" | "danger";
}) {
  const gradientColors: [string, string] =
    variant === "danger"
      ? ["#EF4444", "#DC2626"] // Cores para a variante de perigo (vermelho)
      : [colors.primary, colors.primaryBright]; // Cores padrão (tema principal)

  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <Text style={styles.gradientButtonText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Componente "Chip" (pílula). Usado para filtros, categorias ou seleções rápidas.
 * Possui um estado ativo/inativo.
 */
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

/**
 * Campo de entrada de texto (Input) padronizado.
 * Inclui um rótulo (label) acima do campo.
 */
export function InputField({
  label,
  value,
  placeholder,
  secureTextEntry,
  onChangeText, 
  keyboardType,   
}: {
  label: string;
  value?: string;
  placeholder?: string;
  secureTextEntry?: boolean; // Define se é um campo de senha (esconde o texto)
  onChangeText?: (text: string) => void; 
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']; // Tipo de teclado (ex: numérico, email)
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value} 
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        style={styles.input}
        secureTextEntry={secureTextEntry}
        onChangeText={onChangeText} 
        keyboardType={keyboardType}   
      />
    </View>
  );
}

/**
 * Linha contendo um ícone, título, subtítulo e um botão de alternância (Switch/Toggle).
 * Usado frequentemente em telas de configurações.
 */
export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Feather>["name"]; // Ícone do pacote Feather
  title: string;
  subtitle: string;
  value: boolean; // Estado atual do toggle (ligado/desligado)
  onValueChange?: (value: boolean) => void; // Função chamada ao alterar o estado
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
        trackColor={{ false: "#E5E7EB", true: colors.primaryBright }}
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
