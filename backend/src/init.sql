-- NexDose: Database Initialization (PostgreSQL)

-- 1. Extensões e Limpeza (Opcional, use apenas se quiser resetar o banco)
 -- DROP TABLE IF EXISTS medication_intake_history CASCADE;
-- DROP TABLE IF EXISTS medication_schedules CASCADE;
 --DROP TABLE IF EXISTS medications CASCADE;
 --DROP TABLE IF EXISTS device_access CASCADE;
 --DROP TABLE IF EXISTS dispensers CASCADE;
 --DROP TABLE IF EXISTS users CASCADE;

-- ---
-- Tabela de Usuários
-- ---
CREATE TABLE IF NOT EXISTS users (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
role VARCHAR(50) NOT NULL CHECK (role IN ('sponsor', 'caregiver')),
avatar_url TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Dispensadores (Dispositivos)
-- O 'sponsor_id' vincula o dono do dispositivo físico.
-- ---
CREATE TABLE IF NOT EXISTS dispensers (
id SERIAL PRIMARY KEY,
serial_number VARCHAR(255) UNIQUE NOT NULL,
sponsor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
name VARCHAR(255) DEFAULT 'Dispenser',
status VARCHAR(50) DEFAULT 'offline',
last_sync TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Acesso ao Dispositivo (Compartilhamento)
-- Substitui a antiga 'caregiver_sponsor_associations'.
-- ---
CREATE TABLE IF NOT EXISTS device_access (
id SERIAL PRIMARY KEY,
dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
can_edit_medications BOOLEAN DEFAULT false,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
UNIQUE(dispenser_id, user_id)
);

-- ---
-- Tabela de Medicamentos
-- Agora vinculada ao DISPENSER, não mais ao usuário diretamente.
-- ---
CREATE TABLE IF NOT EXISTS medications (
id SERIAL PRIMARY KEY,
dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
name VARCHAR(255) NOT NULL,
dosage VARCHAR(100),
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Agendamentos de Medicamentos
-- ---
CREATE TABLE IF NOT EXISTS medication_schedules (
id SERIAL PRIMARY KEY,
medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
dispenser_id INTEGER REFERENCES dispensers(id) ON DELETE CASCADE,
interval_hours INTEGER NOT NULL,
start_time TIME NOT NULL,
is_active BOOLEAN DEFAULT true,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Histórico de Ingestão
-- ---
CREATE TABLE IF NOT EXISTS medication_intake_history (
id SERIAL PRIMARY KEY,
schedule_id INTEGER NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
intake_time TIMESTAMP WITH TIME ZONE,
status VARCHAR(50) NOT NULL CHECK (status IN ('taken', 'missed', 'pending')),
notes TEXT
);

-- ---
-- Índices para Performance (Lookups rápidos no App)
-- ---
CREATE INDEX IF NOT EXISTS idx_dispensers_sponsor_id ON dispensers (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_device_access_user_id ON device_access (user_id);
CREATE INDEX IF NOT EXISTS idx_medications_dispenser_id ON medications (dispenser_id);
CREATE INDEX IF NOT EXISTS idx_med_schedules_medication_id ON medication_schedules (medication_id);


--incluir dispositivos
--INSERT INTO dispensers (serial_number, status) VALUES
--('NEX001', 'unpaired'),
--('NEX002', 'unpaired'),
--('NEX003', 'unpaired')