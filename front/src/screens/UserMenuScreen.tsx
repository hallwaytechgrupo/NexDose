import React from 'react';
import {View, Text, StyleSheet, Pressable, Image} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserMenuScreenProps = {
  onNavigate: (screen: 'settings' | 'home' | 'editProfile' | 'help') => void;
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
      onPress: () => onNavigate("help"),
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
                <View style={styles.backButton}>
                    <Feather name="arrow-left" size={20} color={colors.primary} />
                </View>
            </Pressable>
            <Text style={styles.title}>Menu</Text>
            <View style={{ width: 42 }} />
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
        <View style={styles.footer}>
          <Image
            source={require("../assets/img/logoHallway.png")}
            style={styles.logo}
          />
          <Text style={styles.footerText}>Developed by HallWayTech</Text>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
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
  footer: {
    marginTop: 350,
    flexDirection: 'row', // Alinha os itens na horizontal (lado a lado)
    alignItems: 'center', // Alinha verticalmente o texto com o centro da imagem
    justifyContent: 'center', // Centraliza o bloco todo no rodapé
    paddingVertical: 15,      // Espaçamento interno em cima e embaixo
    borderTopWidth: 1,        // Opcional: uma linha fina para separar o rodapé
    borderTopColor: '#eeeeee',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 30,               // Ajuste o tamanho conforme necessário
    height: 30,
    resizeMode: 'contain',
  },
  footerText: {
    marginLeft: 10,          // Espaçamento entre o logo e o texto
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
});
