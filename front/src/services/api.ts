import * as SecureStore from "expo-secure-store";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://nexdose-backend.onrender.com";

// --- INTERFACES ---

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: "sponsor" | "caregiver" | "pending";
  avatar_url?: string | null; // Adicionado para suportar a foto de perfil
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface UpdateProfileResponse {
  message: string;
  user: AuthUser;
}

interface ApiErrorResponse {
  error?: string;
}

export interface Caregiver {
  id: number;
  name: string;
  email: string;
  phone?: string;
  can_edit_medications?: boolean;
}

export type Dispenser = {
  id: number;
  serial_number: string;
  name: string | null;
  status: string | null;
  last_sync?: string | null;
  created_at?: string;
  is_owner?: boolean;
  sponsor_id: number;
  can_edit_medications?: boolean;
};

export type HistoryStatus = 'taken_on_time' | 'taken_late' | 'missed' | 'pending';

export interface HistoryItem {
  id: number;
  medication_name: string;
  scheduled_at: string;
  taken_at: string | null;
  status: HistoryStatus;
}

// --- HELPER DE REQUISIÇÃO ---

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = (await response.json().catch(() => null)) as
      | T
      | ApiErrorResponse
      | null;

  if (!response.ok) {
    const errorMessage =
        data && typeof data === "object" && "error" in data ? data.error : null;

    throw new Error(errorMessage || `Falha na comunicação. (Status: ${response.status})`);
  }

  return data as T;
}

// --- FUNÇÕES DE AUTENTICAÇÃO ---

export async function login(payload: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "sponsor" | "caregiver";
}): Promise<AuthUser> {
  return request<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function savePushToken(
    token: string,
    pushToken: string
): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/push-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pushToken }),
  });
}

// --- FUNÇÃO ATUALIZADA PARA O MULTER (FORM DATA) ---
export async function updateProfile(
    token: string,
    payload: {
      name: string;
      email: string;
      password?: string;
      avatarUri?: string | null; // Adicionado suporte para a URI local do Image Picker
    }
): Promise<UpdateProfileResponse> {

  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("email", payload.email);

  if (payload.password) {
    formData.append("password", payload.password);
  }

  if (payload.avatarUri && !payload.avatarUri.startsWith("http")) {
    const filename = payload.avatarUri.split("/").pop() || "avatar.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("avatar", {
      uri: payload.avatarUri,
      name: filename,
      type,
    } as any);
  }

  // Fazemos o fetch direto aqui para não passar pelo helper 'request',
  // pois o React Native precisa gerar o Content-Type de 'multipart/form-data' automaticamente.
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      // Não adicione o Content-Type aqui, o fetch faz isso sozinho quando o body é FormData
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data && data.error ? data.error : "Falha ao atualizar perfil.";
    throw new Error(errorMessage);
  }

  return data as UpdateProfileResponse;
}

// --- FUNÇÕES DE MEDICAMENTOS ---

export interface CreateMedicationPayload {
  name: string;
  dosage: string;
  startDate: string;
  intervalHours: number;
  isContinuous: boolean;
  endDate?: string | null;
}

export async function createMedication(
    token: string,
    dispenserId: number,
    payload: CreateMedicationPayload
): Promise<any> {
  return request<any>(`/api/dispensers/${dispenserId}/medications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function getMedications(token: string, dispenserId: number): Promise<any[]> {
  return request<any[]>(`/api/dispensers/${dispenserId}/medications`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateMedication(
    token: string,
    dispenserId: number,
    id: string,
    payload: Partial<CreateMedicationPayload>
): Promise<any> {
  return request<any>(`/api/dispensers/${dispenserId}/medications/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function deleteMedication(
    token: string,
    dispenserId: number,
    id: string
): Promise<any> {
  return request<any>(`/api/dispensers/${dispenserId}/medications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- FUNÇÕES DE HISTÓRICO ---

export async function getHistory(token: string, dispenserId: number): Promise<HistoryItem[]> {
  return request<HistoryItem[]>(`/api/dispensers/${dispenserId}/history`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- FUNÇÕES DE CUIDADORES ---

export async function addCaregiver(
    token: string,
    dispenserId: number,
    email: string,
    canEdit: boolean
): Promise<Caregiver> {
  return request<Caregiver>("/api/caregivers", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      dispenserId,
      caregiverEmail: email,
      canEditMedications: canEdit
    }),
  });
}

export async function getCaregivers(token: string, dispenserId: number): Promise<Caregiver[]> {
  return request<Caregiver[]>(`/api/caregivers?dispenserId=${dispenserId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function removeCaregiver(
    token: string,
    caregiverId: number,
    dispenserId: number
): Promise<void> {
  return request<void>(`/api/caregivers/${caregiverId}?dispenserId=${dispenserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- FUNÇÕES DE DISPENSERS ---

export async function getDispensers(token: string): Promise<Dispenser[]> {
  return request<Dispenser[]>("/api/dispensers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function claimDispenser(
    token: string,
    serialNumber: string,
    name: string
): Promise<Dispenser> {
  const payload = {
    serialNumber: serialNumber.trim(),
    name: name.trim() !== "" ? name.trim() : undefined
  };

  const res = await request<{ message: string; dispenser: Dispenser }>(
      "/api/dispensers/claim",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
  );
  return res.dispenser;
}

export async function removeDispenser(
    token: string,
    dispenserId: number
): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/dispensers/${dispenserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
