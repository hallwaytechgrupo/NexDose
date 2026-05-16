import * as SecureStore from "expo-secure-store";

const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.15.8:3000";

// --- INTERFACES ---

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: "sponsor" | "caregiver" | "pending"; // Ajustado para os novos nomes de role
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

// No seu arquivo api.ts, procure por 'export type Dispenser' e deixe assim:
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

    throw new Error(errorMessage || "Falha na comunicação com o servidor.");
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

/**
 * Cadastro simplificado: sem Role (definida pelo sistema depois)
 */
export async function register(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthUser> {
  return request<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(
    token: string,
    payload: {
      name: string;
      email: string;
      password?: string;
    }
): Promise<UpdateProfileResponse> {
  return request<UpdateProfileResponse>("/auth/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
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

// --- FUNÇÕES DE CUIDADORES ---

/**
 * Adiciona um cuidador vinculado a um dispenser específico.
 * Implementado conforme sua solicitação de parâmetros posicionais.
 */
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