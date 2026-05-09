import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";

const router = Router();

// Chave secreta para assinar os tokens JWT. Em produção, deve vir de variáveis de ambiente.
const jwtSecret = process.env.JWT_SECRET || "seu_segredo_jwt";

// Define o formato do payload que será armazenado dentro do token JWT.
type AuthTokenPayload = {
    userId: number;
    role: "sponsor" | "caregiver";
};

/**
 * Função utilitária para decodificar o token JWT do cabeçalho de autorização.
 * @param authorizationHeader O cabeçalho 'Authorization' da requisição (ex: "Bearer seu_token_aqui").
 * @returns O ID do usuário se o token for válido, ou null caso contrário.
 */
function getAuthUserId(authorizationHeader?: string): number | null {
    if (!authorizationHeader?.startsWith("Bearer ")) {
        return null;
    }

    try {
        const token = authorizationHeader.slice("Bearer ".length);
        const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
        return decoded.userId;
    } catch {
        return null;
    }
}

/**
 * Rota para registrar um novo usuário.
 * @route POST /auth/register
 */
router.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;

    // Adaptação: Se vier 'responsavel' do frontend, salva como 'sponsor' no banco
    const dbRole = role === 'responsavel' ? 'sponsor' : role;

    if (!["sponsor", "caregiver"].includes(dbRole)) {
        return res
            .status(400)
            .json({ error: 'Papel invalido. Use "sponsor" ou "caregiver".' });
    }

    try {
        // Criptografa a senha antes de salvar no banco de dados.
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insere o novo usuário no banco.
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, dbRole]
        );

        // Devolve 'responsavel' pro frontend se for 'sponsor' no banco
        const userToReturn = { ...newUser.rows[0], role: newUser.rows[0].role === 'sponsor' ? 'responsavel' : newUser.rows[0].role };
        return res.status(201).json(userToReturn);
    } catch (error: any) {
        // Trata o erro de e-mail duplicado (código '23505' do PostgreSQL).
        if (error.code === "23505") {
            return res.status(409).json({ error: "Este e-mail ja esta em uso." });
        }

        console.error("ERRO DETALHADO:", error);
        return res
            .status(500)
            .json({ error: "Erro ao registrar usuario. Verifique o console do servidor." });
    }
});

/**
 * Rota para autenticar (logar) um usuário.
 * @route POST /auth/login
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Busca o usuário pelo e-mail.
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);

        // Se não encontrar, retorna erro de credenciais inválidas.
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais invalidas." });
        }

        const user = userResult.rows[0];
        // Compara a senha enviada com a senha criptografada no banco.
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Credenciais invalidas." });
        }

        // Se a senha estiver correta, gera um token JWT válido por 1 hora.
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            jwtSecret,
            { expiresIn: "1h" }
        );

        // Retorna o token e os dados básicos do usuário para o frontend.
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                // Adaptação: Se for 'sponsor' no banco, devolve 'responsavel' para o app
                role: user.role === 'sponsor' ? 'responsavel' : user.role,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
});

/**
 * Rota para atualizar o perfil de um usuário autenticado.
 * @route PUT /auth/profile
 */
router.put("/profile", async (req, res) => {
    // Extrai o ID do usuário a partir do token JWT enviado no cabeçalho.
    const userId = getAuthUserId(req.headers.authorization);
    const { name, email, password } = req.body;

    if (!userId) {
        return res.status(401).json({ error: "Token de autenticacao invalido." });
    }

    if (!name || !email) {
        return res.status(400).json({ error: "Nome e e-mail sao obrigatorios." });
    }

    try {
        // Confirma que o usuário do token realmente existe no banco.
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [userId]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: "Usuario nao encontrado." });
        }

        // Verifica se uma nova senha foi enviada.
        const normalizedPassword =
            typeof password === "string" && password.trim() ? password.trim() : null;

        // Monta a query de UPDATE: uma com a senha, outra sem.
        const updatedUser = normalizedPassword
            ? await pool.query(
                "UPDATE users SET name = $1, email = $2, password_hash = $3 WHERE id = $4 RETURNING id, name, email, role",
                [name, email, await bcrypt.hash(normalizedPassword, 10), userId]
            )
            : await pool.query(
                "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role",
                [name, email, userId]
            );

        const userToReturn = { ...updatedUser.rows[0], role: updatedUser.rows[0].role === 'sponsor' ? 'responsavel' : updatedUser.rows[0].role };

        return res.json({
            message: normalizedPassword
                ? "Perfil e senha atualizados com sucesso."
                : "Perfil atualizado com sucesso.",
            user: userToReturn,
        });
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ error: "Este e-mail ja esta em uso." });
        }

        console.error(error);
        return res.status(500).json({ error: "Erro ao atualizar perfil." });
    }
});

export default router;