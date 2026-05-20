import { Router, Request, Response } from "express";
import { upload } from "../config/multer";
import  pool  from "../db"; // Ajuste para o seu arquivo de conexão
import bcrypt from "bcrypt";
import { authMiddleware } from "../middlewares/authMiddleware";

const userRoutes = Router();

userRoutes.put("/api/users/profile", authMiddleware, upload.single("avatar"), async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password } = req.body;
        const file = req.file;

        // O ID do usuário deve vir do seu middleware de autenticação JWT
        const userId = (req as any).userId;

        // Define a URL pública se houver arquivo
        const avatarUrl = file ? `/uploads/${file.filename}` : null;

        // --- MONTAGEM DA QUERY ---
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

        // Executa no PostgreSQL
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

export default userRoutes;
