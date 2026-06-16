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
import iotRoutes from './routes/iotRoutes';
import { startMqttIntegration, setSchedulerTicker, stopMqttIntegration } from './services/mqttClient';
import { startScheduler } from './services/schedulerService'; // CORRIGIDO

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
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const corsOrigin = process.env.CORS_ORIGIN;

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map((origin) => origin.trim()) } : undefined));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (_error) {
    res.status(503).json({
      status: 'error',
      database: 'unavailable',
    });
  }
});

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
app.use('/api/iot', iotRoutes);
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.use(userRoutes);

const startServer = async () => {
  try {
    const dbClient = await pool.connect();
    console.log('[db] connection OK');
    dbClient.release();

    await startMqttIntegration();
    const schedulerTask = startScheduler();
    
    // A função setSchedulerTicker parece ser projetada para gerenciar o timer do scheduler
    // para um desligamento gracioso.
    setSchedulerTicker(schedulerTask);

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[http] backend listening on 0.0.0.0:${PORT}`);
      });
    }
  } catch (error) {
    console.error('[db] fatal: failed to connect to database during startup.');
    console.error(error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  void stopMqttIntegration().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  void stopMqttIntegration().finally(() => process.exit(0));
});

if (require.main === module) {
  startServer();
}

export { app };
