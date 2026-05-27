import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Platform,
    UIManager,
    LayoutAnimation,
    ScrollView,
    Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppScreen, SectionTitle, SurfaceCard, GradientButton } from "../components/Primitives";
import { colors, radius } from "../theme/tokens";

// Habilita a animação de Layout no Android
if (Platform.OS === "android") {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const faqData = [
    {
        category: "Dispositivo (Hardware)",
        items: [
            {
                id: "hw-1",
                question: "O que fazer se o dispositivo aparecer 'Offline'?",
                answer: "Verifique se a máquina está conectada na tomada e se o seu roteador Wi-Fi está ligado. Se o problema persistir, retire o dispenser da tomada por 10 segundos e ligue novamente.",
            },
            {
                id: "hw-2",
                question: "Como saber se a bateria está acabando?",
                answer: "Você pode conferir a porcentagem exata na tela de 'Início' do aplicativo. Além disso, o aplicativo enviará uma notificação automática quando a bateria atingir 20%.",
            },
            {
                id: "hw-3",
                question: "Como limpar o compartimento de remédios?",
                answer: "Use um pano seco ou levemente umedecido com álcool isopropílico. Nunca jogue água diretamente na máquina para não danificar os sensores internos.",
            },
        ],
    },
    {
        category: "Medicamentos e Alertas",
        items: [

            {
                id: "med-1",
                question: "O que acontece se uma dose não for retirada?",
                answer: "O sistema marcará o status como 'Pendente' no Histórico e enviará imediatamente um alerta para os Cuidadores e o Administrador cadastrados.",
            },
        ],
    },
    {
        category: "Cuidadores e Rede de Apoio",
        items: [
            {
                id: "care-1",
                question: "Qual a diferença entre Responsável e Cuidador?",
                answer: "O Responsável pode adicionar medicamentos, alterar horários e adicionar novos usuários. O Cuidador apenas visualiza o histórico e recebe os alertas de emergência.",
            },
        ],
    },
];

export function HelpScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        // Configura a animação suave para expandir/recolher
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const handleSupportContact = () => {
        // Substitua pelo número real de suporte do NexDose ou e-mail
        Linking.openURL("mailto:suporte@nexdose.com.br");
    };

    return (
        <AppScreen>
            <View style={styles.header}>
                <Pressable onPress={() => onNavigate("userMenu")} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>Central de Ajuda</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {faqData.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <SectionTitle>{section.category}</SectionTitle>
                        <View style={styles.accordionContainer}>
                            {section.items.map((item, itemIndex) => {
                                const isExpanded = expandedId === item.id;

                                return (
                                    <View key={item.id} style={[styles.accordionItem, itemIndex === section.items.length - 1 && styles.lastAccordionItem]}>
                                        <Pressable style={styles.accordionHeader} onPress={() => toggleExpand(item.id)}>
                                            <Text style={[styles.questionText, isExpanded && styles.questionTextActive]}>
                                                {item.question}
                                            </Text>
                                            <Feather
                                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                                size={20}
                                                color={isExpanded ? colors.primary : colors.textMuted}
                                            />
                                        </Pressable>
                                        {isExpanded && (
                                            <View style={styles.accordionBody}>
                                                <Text style={styles.answerText}>{item.answer}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ))}

                <View style={styles.supportSection}>
                    <SurfaceCard muted>
                        <View style={styles.supportIconWrap}>
                            <Feather name="life-buoy" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.supportTitle}>Ainda precisa de ajuda?</Text>
                        <Text style={styles.supportBody}>
                            Nossa equipe técnica está pronta para te auxiliar com o seu dispositivo ou aplicativo.
                        </Text>
                        <GradientButton title="Falar com o Suporte" onPress={handleSupportContact} />
                    </SurfaceCard>
                </View>

            </ScrollView>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.text,
    },
    scrollContent: {
        paddingBottom: 40,
        gap: 24,
    },
    section: {
        gap: 12,
    },
    accordionContainer: {
        backgroundColor: colors.surfaceLowest,
        borderRadius: radius.lg,
        overflow: "hidden",
    },
    accordionItem: {
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceHigh,
    },
    lastAccordionItem: {
        borderBottomWidth: 0,
    },
    accordionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.surfaceLowest,
    },
    questionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
        paddingRight: 16,
    },
    questionTextActive: {
        color: colors.primary,
    },
    accordionBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    answerText: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 22,
    },
    supportSection: {
        marginTop: 12,
    },
    supportIconWrap: {
        width: 48,
        height: 48,
        borderRadius: radius.full,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    supportTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.text,
        marginBottom: 6,
    },
    supportBody: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 20,
        marginBottom: 20,
    },
});