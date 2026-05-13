import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET nao configurado no servidor");
}

export const register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    const dbRole = role === 'responsavel' ? 'sponsor' : role;

    if (!["sponsor", "caregiver"].includes(dbRole)) {
        return res.status(400).json({ error: 'Papel inválido. Use "responsavel" ou "caregiver".' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, dbRole]
        );

        const userToReturn = {
            ...newUser.rows[0],
            role: newUser.rows[0].role === 'sponsor' ? 'responsavel' : newUser.rows[0].role
        };
        return res.status(201).json(userToReturn);
    } catch (error: any) {
        console.error("ERRO COMPLETO NO REGISTRO:", error); // Adicione isso aqui!
        if (error.code === "23505") {
            return res.status(409).json({ error: "Este e-mail já está em uso." });
        }
        return res.status(500).json({
            error: "Erro ao registrar usuário.",
            details: error.message // Isso ajudará a debugar no Postman/App
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
            { expiresIn: "7d" } // Aumentado para 7 dias para melhor UX no app NexDose
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role === 'sponsor' ? 'responsavel' : user.role,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).userId; // Injetado pelo authMiddleware
    const { name, email, password } = req.body;

    try {
        const normalizedPassword = typeof password === "string" && password.trim() ? password.trim() : null;

        const updatedUser = normalizedPassword
            ? await pool.query(
                "UPDATE users SET name = $1, email = $2, password_hash = $3 WHERE id = $4 RETURNING id, name, email, role",
                [name, email, await bcrypt.hash(normalizedPassword, 10), userId]
            )
            : await pool.query(
                "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role",
                [name, email, userId]
            );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const userToReturn = {
            ...updatedUser.rows[0],
            role: updatedUser.rows[0].role === 'sponsor' ? 'responsavel' : updatedUser.rows[0].role
        };

        return res.json({ message: "Perfil atualizado com sucesso.", user: userToReturn });
    } catch (error: any) {
        return res.status(500).json({ error: "Erro ao atualizar perfil." });
    }

};

export const updateAvatar = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const avatar_url = req.file?.filename;

    if (!avatar_url) {
        return res.status(400).json({ error: 'Arquivo não enviado.' });
    }

    try {
        // Opcional: Aqui você pode buscar a foto antiga e deletar do disco antes de atualizar
        await pool.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2',
            [avatar_url, userId]
        );

        return res.json({ message: 'Foto atualizada!', avatar_url });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao salvar foto no banco.' });
    }
};
