export type TabKey = "home" | "medications" | "history" | "settings" | "caregiver" | "pharmacy";

export const adherence = [60, 80, 40, 95, 100, 10, 10];

export const quickActions = [
  
  {
    key: "caregiver",
    label: " Cuidador",
    icon: "user",
  },
  {
    key: "pharmacy",
    label: "Achar farmácia",
    icon: "map-pin",
  },
  {
    key: "dispenser",
    label: "Dispositivo(s)",
    icon: "package",
  },
];

export const medicationTypes = [
  { key: "tablet", label: "Comprimido", icon: "square" },
  { key: "capsule", label: "Capsula", icon: "circle" },
  { key: "drops", label: "Gotas", icon: "droplet" },
];

export const intervals = ["4h", "6h", "8h", "12h", "24h"];

export const schedulePreview = [
  { label: "Hoje", value: "16:30" },
  { label: "Amanha", value: "00:30" },
  { label: "Amanha", value: "08:30" },
];

export const historyItems = [
  {
    name: "Metformina 500mg",
    time: "Tomado as 08:00",
    status: "taken" as const,
  },
  {
    name: "Vitamina D3",
    time: "Dose perdida as 12:30",
    status: "missed" as const,
  },
  { name: "Losartana 25mg", time: "Tomado as 14:00", status: "taken" as const },
];

export const notificationSettings = [
  {
    key: "release",
    icon: "package",
    title: "Alerta de liberacao",
    subtitle: "Aviso imediato quando a dose for liberada.",
    enabled: true,
  },
  {
    key: "intake",
    icon: "check-circle",
    title: "Confirmacao de ingestao",
    subtitle: "Notificar quando o paciente retirar a dose.",
    enabled: true,
  },
  {
    key: "delay",
    icon: "alert-triangle",
    title: "Alerta de esquecimento",
    subtitle: "Aviso critico apos 15 min de atraso.",
    enabled: true,
  },
  {
    key: "device",
    icon: "cpu",
    title: "Status do dispenser",
    subtitle: "Bateria baixa ou perda de conexao.",
    enabled: false,
  },
];
