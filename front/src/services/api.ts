const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.68.55.62:3000";

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
  dispenserId: number,
  payload: CreateMedicationPayload
): Promise<any> {
  return request<any>(`/api/dispensers/${dispenserId}/medications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getMedications(token: string, dispenserId: number): Promise<any[]> {
  return request<any[]>(`/api/dispensers/${dispenserId}/medications`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateMedication(
  token: string,
  dispenserId: number,
  id: string,
  payload: UpdateMedicationPayload
): Promise<any> {
  return request<any>(`/api/dispensers/${dispenserId}/medications/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// --- Novas funções para Cuidadores ---


export interface Caregiver {
  id: number;
  name: string;
  email: string;
  can_edit_medications?: boolean;
}

// --- Funções de Cuidadores Atualizadas e Padronizadas ---

/**
 * Adiciona um cuidador (ou cria convite) via API.
 * Usa o wrapper 'request' para manter a consistência.
 */
export async function addCaregiver(
    token: string,
    payload: {
      dispenserId: number;
      caregiverEmail: string;
      canEditMedications?: boolean;
    }
): Promise<Caregiver> {
  return request<Caregiver>("/api/caregivers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getCaregivers(token: string, dispenserId: number): Promise<Caregiver[]> {
  return request<Caregiver[]>(`/api/caregivers?dispenserId=${dispenserId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Remove um cuidador através da API.
 */
export async function removeCaregiver(
    token: string,
    caregiverId: number,
    dispenserId: number
): Promise<void> {
  return request<void>(`/api/caregivers/${caregiverId}?dispenserId=${dispenserId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

// --- Funções para Dispensers ---

export type Dispenser = {
  can_edit_medications: boolean;
  id: number;
  serial_number: string;
  name: string | null;
  status: string | null;
  last_sync?: string | null;
  created_at?: string;
};

export async function getDispensers(token: string): Promise<Dispenser[]> {
  return request<Dispenser[]>("/api/dispensers", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function claimDispenser(
    token: string,
    s: string
    , s1: string): Promise<Dispenser> {

  let payload: { serialNumber: string; name?: string } = { serialNumber: s };
  if (s1.trim() !== "") {
    payload.name = s1.trim();
  }
  const res = await request<{ message: string; dispenser: Dispenser }>(
    "/api/dispensers/claim",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
