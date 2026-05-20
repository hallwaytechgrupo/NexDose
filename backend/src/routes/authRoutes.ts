import { Router } from "express";
import * as authController from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { upload } from '../middlewares/upload';

const router = Router();

// Rotas Públicas (Não precisam de token)
router.post("/register", authController.register);
router.post("/login", authController.login);

// Rotas Privadas (Precisam do token via middleware)
// 👇 Aqui está a mágica! Adicionamos o upload.single('avatar') antes do controller
router.put("/profile", authMiddleware, upload.single('avatar'), authController.updateProfile);

// A rota patch pode continuar aí sem problemas, caso precise dela no futuro
router.patch('/avatar', authMiddleware, upload.single('avatar'), authController.updateAvatar);

router.post("/push-token", authMiddleware, authController.savePushToken);

export default router;
