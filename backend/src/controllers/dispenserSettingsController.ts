import { Request, Response } from "express";
import pool from "../db";

async function assertOwner(userId: number, dispenserId: number) {
  const res = await pool.query(
    "SELECT id FROM dispensers WHERE id = $1 AND sponsor_id = $2",
    [dispenserId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getDispenserSettings(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const dispenserId = Number(req.params.dispenserId);

  if (!Number.isFinite(dispenserId)) {
    return res.status(400).json({ error: "dispenserId invalido." });
  }

  try {
    const isOwner = await assertOwner(userId, dispenserId);
    if (!isOwner) {
      return res.status(403).json({ error: "Sem permissao para ver as configuracoes deste dispenser." });
    }

    const result = await pool.query(
      "SELECT responsable_name, responsable_phone, responsable_email, preferences FROM dispenser_settings WHERE dispenser_id = $1",
      [dispenserId]
    );

    if (result.rowCount === 0) {
      return res.json({
        responsable_name: "",
        responsable_phone: "",
        responsable_email: "",
        preferences: {},
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao carregar settings:", error);
    return res.status(500).json({ error: "Erro interno ao carregar configuracoes." });
  }
}

export async function upsertDispenserSettings(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const dispenserId = Number(req.params.dispenserId);

  if (!Number.isFinite(dispenserId)) {
    return res.status(400).json({ error: "dispenserId invalido." });
  }

  const {
    responsable_name,
    responsable_phone,
    responsable_email,
    preferences,
  } = req.body as {
    responsable_name?: string;
    responsable_phone?: string;
    responsable_email?: string;
    preferences?: Record<string, boolean>;
  };

  try {
    const isOwner = await assertOwner(userId, dispenserId);
    if (!isOwner) {
      return res.status(403).json({ error: "Sem permissao para alterar as configuracoes deste dispenser." });
    }

    const prefs = preferences && typeof preferences === "object" ? preferences : {};

    const result = await pool.query(
      `INSERT INTO dispenser_settings (dispenser_id, responsable_name, responsable_phone, responsable_email, preferences)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (dispenser_id) DO UPDATE
       SET responsable_name = EXCLUDED.responsable_name,
           responsable_phone = EXCLUDED.responsable_phone,
           responsable_email = EXCLUDED.responsable_email,
           preferences = EXCLUDED.preferences,
           updated_at = NOW()
       RETURNING responsable_name, responsable_phone, responsable_email, preferences`,
      [
        dispenserId,
        responsable_name ?? "",
        responsable_phone ?? "",
        responsable_email ?? "",
        JSON.stringify(prefs),
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao salvar settings:", error);
    return res.status(500).json({ error: "Erro interno ao salvar configuracoes." });
  }
}

