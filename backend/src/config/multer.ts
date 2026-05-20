import multer from "multer";
import path from "path";
import crypto from "crypto";

// Configuração de armazenamento em disco
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Aponta para a pasta uploads na raiz do backend
        cb(null, path.resolve(__dirname, "..", "..", "uploads"));
    },
    filename: (req, file, cb) => {
        // Cria um hash aleatório para garantir que o nome do arquivo seja único
        const fileHash = crypto.randomBytes(10).toString("hex");
        const fileName = `${fileHash}-${Date.now()}${path.extname(file.originalname)}`;

        cb(null, fileName);
    }
});

// Filtro para garantir que o usuário só envie imagens
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedMimes = ["image/jpeg", "image/pjpeg", "image/png", "image/webp"];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Formato de imagem inválido. Use PNG, JPG ou WebP."));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // Limite de 2MB por foto
    }
});