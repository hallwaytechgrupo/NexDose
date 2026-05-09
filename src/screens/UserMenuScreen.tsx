import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserMenuScreenProps = {
  onNavigate: (screen: 'settings' | 'home' | 'editProfile') => void;
  onLogout: () => void;
};

export function UserMenuScreen({ onNavigate, onLogout }: UserMenuScreenProps) {
  const menuItems = [
    {
      icon: 'edit-3' as const,
      label: 'Editar Dados',
      onPress: () => onNavigate('editProfile'),
    },
    {
      icon: 'settings' as const,
      label: 'Configurações',
      onPress: () => onNavigate('settings'),
    },
    {
      icon: 'help-circle' as const,
      label: 'Ajuda',
      onPress: () => { /* TODO: Implementar tela de Ajuda */ },
    },
    {
      icon: 'log-out' as const,
      label: 'Sair',
      onPress: onLogout,
      color: colors.error, // Usando a cor de erro definida no tema
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Pressable onPress={() => onNavigate('home')}>
                <Feather name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Menu</Text>
            <View style={{ width: 24 }} />
        </View>
        <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
            <Pressable key={index} style={styles.menuItem} onPress={item.onPress}>
                <Feather name={item.icon} size={20} color={item.color || colors.primary} />
                <Text style={[styles.menuItemText, { color: item.color || colors.text }]}>{item.label}</Text>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
            ))}
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  menuContainer: {
    padding: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: radius.md,
    gap: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
