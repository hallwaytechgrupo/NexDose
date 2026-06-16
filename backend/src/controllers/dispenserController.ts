import { Request, Response } from 'express';
import pool from '../db';
import { mqttClient } from '../services/mqttClient';

type ClaimDispenserBody = {
  serialNumber?: string;
  name?: string;
};

function toInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

export const getDispensers = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    // ✅ CORREÇÃO 1: Adicionado d.sponsor_id e da.can_edit_medications no SELECT para o Front-end conseguir ler!
    const result = await pool.query(
        `SELECT DISTINCT
           d.id,
           d.serial_number,
           d.name,
           d.status,
           d.last_sync,
           d.created_at,
           d.sponsor_id,
           da.can_edit_medications
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

    // ✅ CORREÇÃO 2: Adicionado sponsor_id no RETURNING para atualizar o front-end na hora que vincula
    const updated = await pool.query(
        `UPDATE dispensers
         SET sponsor_id = $1,
             name = COALESCE($2, name)
         WHERE id = $3
         RETURNING id, serial_number, name, status, last_sync, created_at, sponsor_id`,
        [userId, name && typeof name === 'string' ? name.trim() : null, dispenser.id]
    );

    return res.status(200).json({
      message: 'Dispensador associador com sucesso!',
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
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const releaseMedication = async (req: Request, res: Response) => {
  const { id } = req.params; // ID do dispenser (nd001)
  const { medicationId, medicationName, doseIndex } = req.body;

  // Validação básica
  if (!medicationId || doseIndex === undefined) {
    return res.status(400).json({ error: "Dados incompletos para o disparo" });
  }

  // Obter o compartimento (disco) correto e nome do medicamento cadastrado
  let compartment = 1;
  let finalMedicationName = medicationName;

  try {
    const medResult = await pool.query(
      'SELECT name, compartment FROM medications WHERE id = $1',
      [medicationId]
    );
    if (medResult.rows.length > 0) {
      compartment = Number(medResult.rows[0].compartment) || 1;
      finalMedicationName = medResult.rows[0].name || medicationName;
    }
  } catch (dbErr) {
    console.warn('Erro ao consultar compartimento do medicamento no banco:', dbErr);
  }

  // Obter o serial_number do dispenser a partir do id do banco
  let serialNumber = id;
  const numericId = Number(id);
  if (Number.isFinite(numericId)) {
    try {
      const dispResult = await pool.query(
        'SELECT serial_number FROM dispensers WHERE id = $1',
        [numericId]
      );
      if (dispResult.rows.length > 0) {
        serialNumber = dispResult.rows[0].serial_number;
      }
    } catch (dbErr) {
      console.warn('Erro ao consultar serial_number do dispenser:', dbErr);
    }
  }

  // Payload formatado para o ESP32
  const payload = JSON.stringify({
    eventType: "release_dose",
    commandId: `cmd-${Date.now()}`,
    data: {
      medicationId,
      medicationName: finalMedicationName,
      disco: compartment,
      doseIndex
    }
  });

  const topic = `nexdose/dispenser/${serialNumber}/command`;

  if (!mqttClient) {
    return res.status(500).json({ error: "MQTT client not initialized." });
  }

  // Publica no HiveMQ
  mqttClient.publish(topic, payload, { qos: 1 }, (err?: Error) => {
    if (err) {
      console.error('Erro ao publicar no MQTT:', err);
      return res.status(500).json({ error: "Falha ao enviar comando ao hardware" });
    }
    
    console.log(`Comando enviado para ${topic}: ${payload}`);
    res.status(200).json({ 
      message: "Comando enviado com sucesso", 
      commandId: Date.now() 
    });
  });
};