import { Request, Response } from 'express';
import pool from '../db';

/**
 * Controller para gerenciar a associação entre Cuidadores e Responsáveis.
 * Baseado na tabela 'caregiver_sponsor_associations'.
 */

// 1. Adicionar um Cuidador a um Responsável
export const addCaregiver = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId; // O ID do Responsável vem do token logado
  const { caregiverEmail } = req.body;

  if (!caregiverEmail) {
    return res.status(400).json({ error: 'O email do cuidador é obrigatório.' });
  }

  const client = await pool.connect();
  try {
    // a. Buscar o cuidador pelo email
    const caregiverResult = await client.query(
      "SELECT id, role FROM users WHERE email = $1",
      [caregiverEmail]
    );

    if (caregiverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado com este email.' });
    }

    const caregiver = caregiverResult.rows[0];

    // Verifica se o usuário que tentamos adicionar realmente tem a role de 'caregiver'
    if (caregiver.role !== 'caregiver') {
      return res.status(400).json({ error: 'O usuário informado não possui um perfil de cuidador.' });
    }

    // b. Criar a associação
    await client.query(
      "INSERT INTO caregiver_sponsor_associations (caregiver_id, sponsor_id) VALUES ($1, $2)",
      [caregiver.id, sponsorId]
    );

    res.status(201).json({ message: 'Cuidador associado com sucesso!' });
  } catch (error: any) {
    // Trata o erro 23505: violação de constraint UNIQUE (Cuidador já associado a este responsável)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Este cuidador já está associado a você.' });
    }
    console.error('Erro ao adicionar cuidador:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao adicionar cuidador.' });
  } finally {
    client.release();
  }
};

// 2. Listar todos os Cuidadores associados a um Responsável
export const getMyCaregivers = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId; // O ID do Responsável vem do token

  try {
    const result = await pool.query(
      `SELECT 
         u.id, 
         u.name, 
         u.email, 
         a.created_at as associated_at
       FROM caregiver_sponsor_associations a
       JOIN users u ON a.caregiver_id = u.id
       WHERE a.sponsor_id = $1
       ORDER BY a.created_at DESC`,
      [sponsorId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar cuidadores:', error);
    res.status(500).json({ error: 'Erro interno ao buscar cuidadores.' });
  }
};

// 3. Remover um Cuidador (Desfazer Associação)
export const removeCaregiver = async (req: Request, res: Response) => {
  const sponsorId = (req as any).userId; // O ID do Responsável vem do token
  const { caregiverId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM caregiver_sponsor_associations WHERE caregiver_id = $1 AND sponsor_id = $2 RETURNING id",
      [caregiverId, sponsorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Associação não encontrada.' });
    }

    res.status(200).json({ message: 'Cuidador removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover cuidador:', error);
    res.status(500).json({ error: 'Erro interno ao remover cuidador.' });
  }
};
