import { Request, Response } from 'express';
import pool from '../db';

type AddCaregiverBody = {
  dispenserId?: number | string;
  caregiverEmail?: string;
  canEditMedications?: boolean;
};

function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

async function ensureIsDeviceOwner(userId: number, dispenserId: number): Promise<boolean> {
  const result = await pool.query(
      `SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2`,
      [dispenserId, userId]
  );
  return result.rows.length > 0;
}

export const getDeviceCaregivers = async (req: Request, res: Response) => {
  const sponsorId = Number((req as any).userId);
  const dispenserId = toInt(req.query.dispenserId);

  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId é obrigatório.' });
  }

  if (!(await ensureIsDeviceOwner(sponsorId, dispenserId))) {
    return res.status(403).json({ error: 'Sem permissão para listar acessos deste dispositivo.' });
  }

  try {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email, da.can_edit_medications
         FROM device_access da
                JOIN users u ON u.id = da.user_id
         WHERE da.dispenser_id = $1
         ORDER BY da.created_at DESC`,
        [dispenserId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar cuidadores do dispositivo:', error);
    return res.status(500).json({ error: 'Erro ao buscar cuidadores.' });
  }
};

export const addCaregiver = async (req: Request<{}, {}, AddCaregiverBody>, res: Response) => {
  const sponsorId = Number((req as any).userId);
  const dispenserId = toInt(req.body?.dispenserId);
  const caregiverEmail = req.body?.caregiverEmail;
  const canEdit = Boolean(req.body?.canEditMedications);

  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId é obrigatório.' });
  }
  if (!caregiverEmail || typeof caregiverEmail !== 'string') {
    return res.status(400).json({ error: 'E-mail do cuidador é obrigatório.' });
  }

  if (!(await ensureIsDeviceOwner(sponsorId, dispenserId))) {
    return res.status(403).json({ error: 'Sem permissão para compartilhar este dispositivo.' });
  }

  const client = await pool.connect();
  try {
    // ✅ CORREÇÃO: Removido o filtro "AND role = 'caregiver'" para permitir qualquer usuário por e-mail
    const caregiverResult = await client.query(
        `SELECT id, name, email FROM users WHERE email = $1`,
        [caregiverEmail.trim()]
    );

    if (caregiverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado com este e-mail.' });
    }

    const caregiver = caregiverResult.rows[0];

    if (Number(caregiver.id) === Number(sponsorId)) {
      return res.status(400).json({ error: 'Você não pode adicionar a si mesmo como cuidador.' });
    }

    await client.query(
        `INSERT INTO device_access (dispenser_id, user_id, can_edit_medications)
         VALUES ($1, $2, $3)
         ON CONFLICT (dispenser_id, user_id)
           DO UPDATE SET can_edit_medications = EXCLUDED.can_edit_medications`,
        [dispenserId, caregiver.id, canEdit]
    );

    return res.status(201).json({
      id: caregiver.id,
      name: caregiver.name,
      email: caregiver.email,
      can_edit_medications: canEdit,
    });
  } catch (error) {
    console.error('Erro ao compartilhar dispositivo:', error);
    return res.status(500).json({ error: 'Erro ao associar.' });
  } finally {
    client.release();
  }
};

export const removeCaregiver = async (req: Request, res: Response) => {
  const sponsorId = Number((req as any).userId);
  const dispenserId = toInt(req.query.dispenserId);
  const caregiverId = toInt(req.params.caregiverId);

  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId é obrigatório.' });
  }
  if (!caregiverId) {
    return res.status(400).json({ error: 'caregiverId inválido.' });
  }

  if (!(await ensureIsDeviceOwner(sponsorId, dispenserId))) {
    return res.status(403).json({ error: 'Sem permissão para remover acesso deste dispositivo.' });
  }

  try {
    await pool.query(
        `DELETE FROM device_access WHERE dispenser_id = $1 AND user_id = $2`,
        [dispenserId, caregiverId]
    );
    return res.status(200).json({ message: 'Acesso removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover cuidador do dispositivo:', error);
    return res.status(500).json({ error: 'Erro ao remover cuidador.' });
  }
};