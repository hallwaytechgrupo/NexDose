import { Router } from "express";
import * as authController from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { upload } from '../middlewares/upload';

const router = Router();

// Rotas Públicas (Não precisam de token)
router.post("/register", authController.register);
router.post("/login", authController.login);

// Rotas Privadas (Precisam do token via middleware)
router.put("/profile", authMiddleware, authController.updateProfile);

router.patch('/avatar', authMiddleware, upload.single('avatar'), authController.updateAvatar);
export default router;