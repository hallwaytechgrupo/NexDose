const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.15.4:3000";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "responsavel" | "caregiver";
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

    throw new Error(errorMessage || "Falha na comunicacao com o servidor.");
  }

  return data as T;
}

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
  password: string;
  role: "responsavel" | "caregiver";
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

// --- Novas funções para Medicamentos ---

export interface CreateMedicationPayload {
  name: string;
  dosage: string;
  startDate: string; // ISO string da data
  intervalHours: number;
}

export interface UpdateMedicationPayload {
  name?: string;
  dosage?: string;
  startDate?: string;
  intervalHours?: number;
}

export async function createMedication(
  token: string,
  payload: CreateMedicationPayload
): Promise<any> {
  return request<any>("/api/medications", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getMedications(token: string): Promise<any[]> {
  return request<any[]>("/api/medications", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateMedication(
  token: string,
  id: string,
  payload: UpdateMedicationPayload
): Promise<any> {
  return request<any>(`/api/medications/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteMedication(
  token: string,
  id: string
): Promise<any> {
  return request<any>(`/api/medications/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// --- Novas funções para Cuidadores ---


export interface Caregiver {
  id: string;
  name: string;
  email: string;
  Tel: string | null;
}

// --- Funções de Cuidadores Atualizadas e Padronizadas ---

/**
 * Adiciona um cuidador (ou cria convite) via API.
 * Usa o wrapper 'request' para manter a consistência.
 */
export async function addCaregiver(
    token: string,
    name: string,
    email: string,
    tel: string
): Promise<Caregiver> {
  return request<Caregiver>("/api/caregivers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      caregiverEmail: email,
      name,
      Tel: tel // Mantendo o 'T' maiúsculo conforme seu estado anterior
    }),
  });
}

export async function getCaregivers(token: string | null): Promise<Caregiver[]> {
  return request<Caregiver[]>("/api/caregivers", {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });
}

/**
 * Remove um cuidador através da API.
 */
export async function removeCaregiver(
    token: string,
    id: string
): Promise<void> {
  return request<void>(`/api/caregivers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
