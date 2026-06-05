import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET nao configurado no servidor");
}

export const register = async (req: Request, res: Response) => {
    const { name, email, phone, password, role } = req.body;

    // ✅ CORREÇÃO 1: Validação direta usando a role vinda da requisição
    if (!role || !["sponsor", "caregiver"].includes(role.toLowerCase())) {
        return res.status(400).json({ error: 'Papel inválido. Use "sponsor" ou "caregiver".' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ CORREÇÃO 2: Adicionado RETURNING para capturar e retornar o usuário criado sem travar
        const newUser = await pool.query(
            "INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role",
            [name, email, phone, hashedPassword, role.toLowerCase()]
        );

        // ✅ REMOVIDO: Toda a lógica de tradução artificial. Retorna direto o dado limpo do banco.
        return res.status(201).json(newUser.rows[0]);
    } catch (error: any) {
        console.error("ERRO COMPLETO NO REGISTRO:", error);
        if (error.code === "23505") {
            return res.status(409).json({ error: "Este e-mail já está em uso." });
        }
        return res.status(500).json({
            error: "Erro ao registrar usuário.",
            details: error.message
        });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const user = userResult.rows[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            jwtSecret,
            { expiresIn: "7d" } // 7 dias de UX estável para o NexDose
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role, // 'sponsor' ou 'caregiver'
                avatar_url: user.avatar_url ?? null,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { name, email, password } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const normalizedPassword = typeof password === "string" && password.trim() ? password.trim() : null;

        // Monta query dinamicamente para incluir avatar e/ou senha quando vierem na request.
        let query = "UPDATE users SET name = $1, email = $2";
        const values: any[] = [name, email];
        let paramIndex = 3;

        if (avatarUrl) {
            query += `, avatar_url = $${paramIndex}`;
            values.push(avatarUrl);
            paramIndex++;
        }

        if (normalizedPassword) {
            query += `, password_hash = $${paramIndex}`;
            values.push(await bcrypt.hash(normalizedPassword, 10));
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, avatar_url`;
        values.push(userId);

        const updatedUser = await pool.query(query, values);

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // ✅ REMOVIDO: Retorna diretamente o objeto limpo do banco sem conversões desnecessárias
        return res.json({ message: "Perfil atualizado com sucesso.", user: updatedUser.rows[0] });
    } catch (error: any) {
        return res.status(500).json({ error: "Erro ao atualizar perfil." });
    }
};

export const updateAvatar = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!avatar_url) {
        return res.status(400).json({ error: 'Arquivo não enviado.' });
    }

    try {
        await pool.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2',
            [avatar_url, userId]
        );

        return res.json({ message: 'Foto updated!', avatar_url });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao salvar foto no banco.' });
    }


};

export const savePushToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { pushToken } = req.body;

        if (typeof pushToken !== "string" || !pushToken.trim()) {
            return res.status(400).json({ error: "Token de notificacao invalido." });
        }

        await pool.query(
            "UPDATE users SET push_token = $1 WHERE id = $2",
            [pushToken.trim(), userId]
        );

        return res.status(200).json({ message: "Token salvo!" });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno." });
    }
};
