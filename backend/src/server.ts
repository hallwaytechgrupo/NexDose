import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import pool from './db';
import authRoutes from './routes/authRoutes';
import medicationRoutes from './routes/medicationRoutes';
import dispenserMedicationRoutes from './routes/dispenserMedicationRoutes';
import caregiverRoutes from './routes/caregiverRoutes';
import dispenserRoutes from './routes/dispenserRoutes';
import pharmacyRoutes from './routes/pharmacyRoutes';
import userRoutes from './routes/userRoute';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Fail fast for secrets: do not allow implicit insecure defaults.
requireEnv('JWT_SECRET');

const app = express();

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors());
app.use(express.json());

// Static uploads (use a Docker volume, e.g. /data/uploads).
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/files', express.static(uploadsDir));

// Routes
app.use('/auth', authRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/dispensers/:dispenserId/medications', dispenserMedicationRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/dispensers', dispenserRoutes);
app.use('/api/farmacias', pharmacyRoutes);
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.use(userRoutes);

app.listen(3000, () => console.log("🚀 Backend rodando na porta 3000"));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const startServer = async () => {
  try {
    const dbClient = await pool.connect();
    console.log('DB connection OK');
    dbClient.release();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Fatal: failed to connect to DB.');
    console.error(error);
    process.exit(1);
  }
};

startServer();
