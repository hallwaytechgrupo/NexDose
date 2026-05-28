import { Request, Response } from 'express';
import db from "../db";

export async function getWeeklyAdherence(req: Request, res: Response): Promise<void> {
    const { dispenserId } = req.params;

    if (!dispenserId) {
        res.status(400).json({ error: 'ID do dispensador é obrigatório.' });
        return;
    }

    try {
        // Consulta SQL que gera os últimos 7 dias e cruza com o histórico do dispenser
        const query = `
      SELECT 
        g.day::date as date,
        EXTRACT(DOW FROM g.day) as dow,
        COUNT(h.id) as total_scheduled,
        COUNT(CASE WHEN h.status = 'taken' THEN 1 END) as total_taken
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS g(day)
      LEFT JOIN medication_intake_history h ON h.scheduled_time::date = g.day::date
      LEFT JOIN medications m ON h.medication_id = m.id AND m.dispenser_id = $1
      GROUP BY g.day
      ORDER BY g.day ASC;
    `;

        const { rows } = await db.query(query, [dispenserId]);

        // Mapeamento dos dias da semana para o padrão de letras que o front espera
        const weekdaysMap: { [key: number]: string } = {
            0: 'D', // Domingo
            1: 'S', // Segunda
            2: 'T', // Terça
            3: 'Q', // Quarta
            4: 'Q', // Quinta
            5: 'S', // Sexta
            6: 'S'  // Sábado
        };

        // Formata o resultado para o frontend
        const formattedAdherence = rows.map((row: any) => {
            const total = parseInt(row.total_scheduled, 10);
            const taken = parseInt(row.total_taken, 10);

            // Se não houver remédios agendados para o dia, a adesão é 0% por padrão.
            // Caso contrário, calcula a regra de três simples.
            const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
            const dayIndex = parseInt(row.dow, 10);

            return {
                day: weekdaysMap[dayIndex],
                percentage: percentage,
                date: row.date // Útil caso queira debugar ou mostrar a data no front
            };
        });

        res.json(formattedAdherence);
    } catch (error: any) {
        console.error('Erro ao calcular aderência semanal:', error);
        res.status(500).json({ error: 'Erro interno ao processar histórico.' });
    }
}