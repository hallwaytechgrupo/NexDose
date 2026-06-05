import { Request, Response } from 'express';
import pool from '../db';
import { getRecentMedicationHistory } from '../services/medicationScheduleService';

function toInt(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

async function assertDeviceAccess(userId: number, dispenserId: number): Promise<boolean> {
  const owner = await pool.query(
    `SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2`,
    [dispenserId, userId]
  );

  if (owner.rows.length > 0) {
    return true;
  }

  const access = await pool.query(
    `SELECT 1 FROM device_access WHERE dispenser_id = $1 AND user_id = $2`,
    [dispenserId, userId]
  );

  return access.rows.length > 0;
}

export const getRecentEvents = async (req: Request, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = toInt(req.query.dispenserId ?? req.params.dispenserId);
  if (!dispenserId) {
    return res.status(400).json({ error: 'dispenserId é obrigatório.' });
  }

  if (!(await assertDeviceAccess(userId, dispenserId))) {
    return res.status(403).json({ error: 'Acesso negado. Você não está vinculado a este dispositivo.' });
  }

  try {
    const history = await getRecentMedicationHistory(dispenserId, 25);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Erro ao buscar eventos recentes:', error);
    return res.status(500).json({ error: 'Erro ao buscar eventos recentes.' });
  }
};