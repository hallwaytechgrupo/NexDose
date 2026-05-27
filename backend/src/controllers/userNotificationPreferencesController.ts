import { Request, Response } from "express";
import pool from "../db";

async function assertHasAccess(userId: number, dispenserId: number): Promise<boolean> {
  // Owner access
  const owner = await pool.query("SELECT 1 FROM dispensers WHERE id = $1 AND sponsor_id = $2", [
    dispenserId,
    userId,
  ]);
  if ((owner.rowCount ?? 0) > 0) return true;

  // Shared access (caregiver)
  const shared = await pool.query(
    "SELECT 1 FROM device_access WHERE dispenser_id = $1 AND user_id = $2",
    [dispenserId, userId]
  );
  return (shared.rowCount ?? 0) > 0;
}

export async function getMyNotificationPreferences(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const dispenserId = Number(req.params.dispenserId);

  if (!Number.isFinite(dispenserId)) {
    return res.status(400).json({ error: "dispenserId invalido." });
  }

  try {
    const canAccess = await assertHasAccess(userId, dispenserId);
    if (!canAccess) {
      return res.status(403).json({ error: "Sem permissao para acessar este dispenser." });
    }

    const result = await pool.query(
      "SELECT preferences FROM user_dispenser_notification_prefs WHERE user_id = $1 AND dispenser_id = $2",
      [userId, dispenserId]
    );

    if (result.rowCount === 0) {
      return res.json({ preferences: {} });
    }

    return res.json({ preferences: result.rows[0].preferences ?? {} });
  } catch (error) {
    console.error("Erro ao carregar notification prefs:", error);
    return res.status(500).json({ error: "Erro interno ao carregar preferencias." });
  }
}

export async function upsertMyNotificationPreferences(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const dispenserId = Number(req.params.dispenserId);

  if (!Number.isFinite(dispenserId)) {
    return res.status(400).json({ error: "dispenserId invalido." });
  }

  const { preferences } = req.body as { preferences?: Record<string, boolean> };

  try {
    const canAccess = await assertHasAccess(userId, dispenserId);
    if (!canAccess) {
      return res.status(403).json({ error: "Sem permissao para acessar este dispenser." });
    }

    const prefs = preferences && typeof preferences === "object" ? preferences : {};

    const result = await pool.query(
      `INSERT INTO user_dispenser_notification_prefs (user_id, dispenser_id, preferences)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, dispenser_id) DO UPDATE
       SET preferences = EXCLUDED.preferences,
           updated_at = NOW()
       RETURNING preferences`,
      [userId, dispenserId, JSON.stringify(prefs)]
    );

    return res.json({ preferences: result.rows[0].preferences ?? {} });
  } catch (error) {
    console.error("Erro ao salvar notification prefs:", error);
    return res.status(500).json({ error: "Erro interno ao salvar preferencias." });
  }
}

