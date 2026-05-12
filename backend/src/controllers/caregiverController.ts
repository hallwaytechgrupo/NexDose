import { Request, Response } from 'express';
import pool from '../db';

// 1. Adicionar um Cuidador (Já estava correto)
export const addCaregiver = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId;
  const caregiverEmail: string | undefined =
    req.body?.caregiverEmail ?? req.body?.email;

  if (!caregiverEmail || typeof caregiverEmail !== "string") {
    return res.status(400).json({ error: "E-mail do cuidador e obrigatorio." });
  }

  const client = await pool.connect();
  try {
    const caregiverResult = await client.query(
        "SELECT id, name, email FROM users WHERE email = $1 AND role = 'caregiver'",
        [caregiverEmail]
    );

    if (caregiverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cuidador não encontrado.' });
    }

    const caregiver = caregiverResult.rows[0];

    await client.query(
        "INSERT INTO caregiver_sponsor_associations (caregiver_id, sponsor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [caregiver.id, sponsorId]
    );

    res.status(201).json({
      id: caregiver.id,
      name: caregiver.name,
      email: caregiver.email,
      Tel: null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao associar.' });
  } finally {
    client.release();
  }
};

// 2. CORREÇÃO: Buscar cuidadores associados (Transformado de class para função)
export const getMyCaregivers = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId;

  try {
    const result = await pool.query(
        `SELECT 
         u.id, 
         u.name, 
         u.email,
         NULL as "Tel"
       FROM users u
       JOIN caregiver_sponsor_associations a ON u.id = a.caregiver_id
       WHERE a.sponsor_id = $1`,
        [sponsorId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar cuidadores:', error);
    res.status(500).json({ error: 'Erro ao buscar cuidadores.' });
  }
};

// 3. CORREÇÃO: Remover associação (Transformado de class para função)
export const removeCaregiver = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId;
  const { caregiverId } = req.params;

  try {
    await pool.query(
        "DELETE FROM caregiver_sponsor_associations WHERE caregiver_id = $1 AND sponsor_id = $2",
        [caregiverId, sponsorId]
    );

    res.status(200).json({ message: 'Associação removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover cuidador:', error);
    res.status(500).json({ error: 'Erro ao remover cuidador.' });
  }
};
