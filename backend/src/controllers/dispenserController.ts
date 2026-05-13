import { Request, Response } from 'express';
import pool from '../db';

type ClaimDispenserBody = {
  serialNumber?: string;
  name?: string;
};

export const getDispensers = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const result = await pool.query(
      `SELECT id, serial_number, name, status, last_sync, created_at
       FROM dispensers
       WHERE responsavel_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar dispensadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// Claim/associate a physical dispenser to the logged-in user by serial number.
export const claimDispenser = async (
  req: Request<{}, {}, ClaimDispenserBody>,
  res: Response
) => {
  const userId = (req as any).userId;
  const { serialNumber, name } = req.body ?? {};

  if (!serialNumber || typeof serialNumber !== 'string') {
    return res.status(400).json({ error: 'serialNumber e obrigatorio.' });
  }

  try {
    const existing = await pool.query(
      `SELECT id, responsavel_id, serial_number, name, status, last_sync, created_at
       FROM dispensers
       WHERE serial_number = $1`,
      [serialNumber.trim()]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Dispensador nao encontrado.' });
    }

    const dispenser = existing.rows[0];

    if (dispenser.responsavel_id !== null && Number(dispenser.responsavel_id) !== Number(userId)) {
      return res.status(409).json({ error: 'Este dispensador ja esta associado a outro usuario.' });
    }

    const updated = await pool.query(
      `UPDATE dispensers
       SET responsavel_id = $1,
           name = COALESCE($2, name)
       WHERE id = $3
       RETURNING id, serial_number, name, status, last_sync, created_at`,
      [userId, name && typeof name === 'string' ? name.trim() : null, dispenser.id]
    );

    return res.status(200).json({
      message: 'Dispensador associado com sucesso!',
      dispenser: updated.rows[0],
    });
  } catch (error) {
    console.error('Erro ao associar dispensador:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

