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
      `SELECT DISTINCT d.id, d.serial_number, d.name, d.status, d.last_sync, d.created_at
       FROM dispensers d
       LEFT JOIN device_access da ON da.dispenser_id = d.id AND da.user_id = $1
       WHERE d.sponsor_id = $1 OR da.user_id = $1
       ORDER BY d.created_at DESC`,
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
      `SELECT id, sponsor_id, serial_number, name, status, last_sync, created_at
       FROM dispensers
       WHERE serial_number = $1`,
      [serialNumber.trim()]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Dispensador nao encontrado.' });
    }

    const dispenser = existing.rows[0];

    if (dispenser.sponsor_id !== null && Number(dispenser.sponsor_id) !== Number(userId)) {
      return res.status(409).json({ error: 'Este dispensador ja esta associado a outro usuario.' });
    }

    const updated = await pool.query(
      `UPDATE dispensers
       SET sponsor_id = $1,
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

// Unclaim / remove association from a dispenser owned by the logged-in sponsor.
export const unclaimDispenser = async (req: Request<{ id: string }>, res: Response) => {
  const userId = Number((req as any).userId);
  const dispenserId = Number(req.params.id);

  if (!Number.isFinite(dispenserId)) {
    return res.status(400).json({ error: 'id invalido.' });
  }

  try {
    const owned = await pool.query(
      `SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2`,
      [dispenserId, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Dispensador nao encontrado ou nao pertence a este usuario.' });
    }

    // Preserve the device record (serial), just detach ownership and clear name.
    await pool.query(
      `UPDATE dispensers
       SET sponsor_id = NULL,
           name = NULL,
           status = 'offline',
           last_sync = NULL
       WHERE id = $1`,
      [dispenserId]
    );

    return res.status(200).json({ message: 'Dispensador removido/desassociado com sucesso.' });
  } catch (error) {
    console.error('Erro ao desassociar dispensador:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
