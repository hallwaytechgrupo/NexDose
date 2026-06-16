import { Router, Request, Response } from "express";
import { upload } from "../config/multer";
import  pool  from "../db"; // Ajuste para o seu arquivo de conexão
import bcrypt from "bcrypt";
import { authMiddleware } from "../middlewares/authMiddleware";

const userRoutes = Router();

// Rota para atualizar o perfil do usuário
userRoutes.put("/api/users/profile", authMiddleware, upload.single("avatar"), async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password } = req.body;
        const file = req.file;

        // O ID do usuário vem do middleware de autenticação
        const userId = (req as any).userId;

        const avatarUrl = file ? `/uploads/${file.filename}` : null;

        let query = "UPDATE users SET name = $1, email = $2";
        const values: any[] = [name, email];
        let paramIndex = 3;

        if (avatarUrl) {
            query += `, avatar_url = $${paramIndex}`;
            values.push(avatarUrl);
            paramIndex++;
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            query += `, password_hash = $${paramIndex}`;
            values.push(hashedPassword);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING id, name, email, avatar_url;`;
        values.push(userId);

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        return res.status(200).json({
            message: "Perfil atualizado com sucesso! 🎉",
            user: result.rows[0]
        });

    } catch (error: any) {
        console.error("Erro crítico no banco/upload:", error);
        return res.status(500).json({ error: "Erro interno ao atualizar perfil." });
    }
});

// --- NOVA ROTA PARA ATUALIZAR O PUSH TOKEN ---
userRoutes.put("/api/users/me/push-token", authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "O 'token' é obrigatório e deve ser uma string." });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET push_token = $1, updated_at = NOW() WHERE id = $2",
            [token, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        console.log(`Push token atualizado para o usuário ${userId}`);
        return res.status(200).json({ message: "Token de notificação atualizado com sucesso." });

    } catch (error) {
        console.error(`Erro ao atualizar push token para o usuário ${userId}:`, error);
        return res.status(500).json({ error: "Erro interno ao salvar o token de notificação." });
    }
});


export default userRoutes;