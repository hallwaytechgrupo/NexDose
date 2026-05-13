import { Request, Response } from 'express';
import pool from '../db';

interface CreateMedicationRequest {
  name: string;
  dosage: string;
  startDate: string;
  intervalHours: number;
}

interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  startDate?: string;
  intervalHours?: number;
}

export const getMedications = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    // Busca medicamentos juntando a tabela medications com medication_schedules
    const result = await pool.query(
      `SELECT 
        m.id, 
        m.name, 
        m.dosage,
        s.interval_hours,
        s.start_time
       FROM medications m
       LEFT JOIN medication_schedules s ON m.id = s.medication_id
       WHERE m.sponsor_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar medicamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar medicamentos.' });
  }
};

export const createMedication = async (req: Request<{}, {}, CreateMedicationRequest>, res: Response) => {
  const { name, dosage, startDate, intervalHours } = req.body;
  const userId = (req as any).userId;

  // Validação básica
  if (!name || !dosage || !startDate || !intervalHours || !userId) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  // Converte startDate string para objeto Date e extrai a hora
  const parsedStartDate = new Date(startDate);
  const startTime = parsedStartDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Inserir na tabela 'medications'
    const medicationResult = await client.query(
      `INSERT INTO medications (sponsor_id, name, dosage)
       VALUES ($1, $2, $3)
       RETURNING id, name, dosage, created_at`,
      [userId, name, dosage]
    );
    const newMedication = medicationResult.rows[0];

    // 2. Inserir na tabela 'medication_schedules'
    const scheduleResult = await client.query(
      `INSERT INTO medication_schedules (medication_id, interval_hours, start_time)
       VALUES ($1, $2, $3)
       RETURNING id, interval_hours, start_time, is_active, created_at`,
      [newMedication.id, intervalHours, startTime]
    );
    const newSchedule = scheduleResult.rows[0];

    await client.query('COMMIT');

    // Retorna o medicamento e seu agendamento
    res.status(201).json({
      message: 'Medicamento registrado com sucesso!',
      medication: {
        ...newMedication,
        schedule: newSchedule,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar medicamento.' });
  } finally {
    client.release();
  }
};

export const updateMedication = async (req: Request<{ id: string }, {}, UpdateMedicationRequest>, res: Response) => {
  const { id } = req.params;
  const { name, dosage, startDate, intervalHours } = req.body;
  const userId = (req as any).userId;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Verifica se o medicamento pertence ao usuário
    const authCheck = await client.query(
      'SELECT id FROM medications WHERE id = $1 AND sponsor_id = $2',
      [id, userId]
    );

    if (authCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medicamento não encontrado ou não pertence a este usuário.' });
    }

    // 2. Atualiza a tabela medications se os dados foram enviados
    if (name !== undefined || dosage !== undefined) {
      const updateMedicationQuery = [];
      const updateMedicationValues = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateMedicationQuery.push(`name = $${paramCount}`);
        updateMedicationValues.push(name);
        paramCount++;
      }
      if (dosage !== undefined) {
        updateMedicationQuery.push(`dosage = $${paramCount}`);
        updateMedicationValues.push(dosage);
        paramCount++;
      }

      updateMedicationValues.push(id); // ID é sempre o último parâmetro
      
      const queryStr = `UPDATE medications SET ${updateMedicationQuery.join(', ')} WHERE id = $${paramCount}`;
      await client.query(queryStr, updateMedicationValues);
    }

    // 3. Atualiza a tabela medication_schedules se os dados foram enviados
    if (startDate !== undefined || intervalHours !== undefined) {
      const updateScheduleQuery = [];
      const updateScheduleValues = [];
      let paramCount = 1;

      if (intervalHours !== undefined) {
        updateScheduleQuery.push(`interval_hours = $${paramCount}`);
        updateScheduleValues.push(intervalHours);
        paramCount++;
      }
      if (startDate !== undefined) {
        const parsedStartDate = new Date(startDate);
        const startTime = parsedStartDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        
        updateScheduleQuery.push(`start_time = $${paramCount}`);
        updateScheduleValues.push(startTime);
        paramCount++;
      }

      updateScheduleValues.push(id);
      
      const queryStr = `UPDATE medication_schedules SET ${updateScheduleQuery.join(', ')} WHERE medication_id = $${paramCount}`;
      await client.query(queryStr, updateScheduleValues);
    }

    await client.query('COMMIT');
    
    res.status(200).json({ message: 'Medicamento atualizado com sucesso!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao atualizar medicamento.' });
  } finally {
    client.release();
  }
};

export const deleteMedication = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;

  try {
    // Tenta deletar o medicamento, garantindo que ele pertence ao usuário
    // Graças ao ON DELETE CASCADE no banco de dados (init.sql), 
    // os agendamentos (medication_schedules) serão apagados automaticamente!
    const result = await pool.query(
      'DELETE FROM medications WHERE id = $1 AND sponsor_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicamento não encontrado ou você não tem permissão para deletá-lo.' });
    }

    res.status(200).json({ message: 'Medicamento deletado com sucesso!' });

  } catch (error) {
    console.error('Erro ao deletar medicamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao deletar medicamento.' });
  }
};
