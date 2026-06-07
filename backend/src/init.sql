-- NexDose: Database Initialization (PostgreSQL) - Versão Sincronizada

-- 1. Limpeza (Opcional, use apenas se quiser resetar o banco de desenvolvimento)
 --DROP TABLE IF EXISTS medication_intake_history CASCADE;
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
    -- ✅ ALTERAÇÃO: Adicionado 'pending' para suportar o fluxo de convites do backend
                                     role VARCHAR(50) NOT NULL CHECK (role IN ('sponsor', 'caregiver', 'pending')),
                                     phone VARCHAR(50), -- ✅ ALTERAÇÃO: Campo adicionado (usado como 'Tel' no front)
                                     avatar_url TEXT,
                                     push_token TEXT,
                                     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Dispensadores (Dispositivos)
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
-- Tabela de Configuracoes do Dispenser (Preferencias/Responsavel)
-- ---
CREATE TABLE IF NOT EXISTS dispenser_settings (
                                                  id SERIAL PRIMARY KEY,
                                                  dispenser_id INTEGER NOT NULL UNIQUE REFERENCES dispensers(id) ON DELETE CASCADE,
                                                  responsable_name VARCHAR(255) DEFAULT '',
                                                  responsable_phone VARCHAR(50) DEFAULT '',
                                                  responsable_email VARCHAR(255) DEFAULT '',
                                                  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
                                                  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Preferencias de notificacao por usuario e por dispositivo
-- Cada usuario decide o que quer receber para cada dispenser.
-- ---
CREATE TABLE IF NOT EXISTS user_dispenser_notification_prefs (
                                                                 id SERIAL PRIMARY KEY,
                                                                 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                                                 dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
                                                                 preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
                                                                 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                                                 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                                                 UNIQUE (user_id, dispenser_id)
);

-- ---
-- Tabela de Acesso ao Dispositivo (Compartilhamento com Cuidadores)
-- ---
CREATE TABLE IF NOT EXISTS device_access (
                                             id SERIAL PRIMARY KEY,
                                             dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
                                             user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                             can_edit_medications BOOLEAN DEFAULT false,
                                             created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                             UNIQUE(dispenser_id, user_id) -- Essencial para o ON CONFLICT funcionar
);

-- ---
-- Tabela de Medicamentos
-- ✅ UNIFICADA: Agora contém os dados de agendamento diretamente nela
-- ---
CREATE TABLE IF NOT EXISTS medications (
                             id SERIAL PRIMARY KEY,
                             dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
                             name VARCHAR(255) NOT NULL,
                             dosage VARCHAR(100),
                             start_time VARCHAR(50) NOT NULL, -- Guarda o texto do horário (ex: "15:00:00")
                             schedule_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
                             end_date TIMESTAMP WITH TIME ZONE,
                             is_continuous BOOLEAN DEFAULT false,
                             interval_hours INTEGER NOT NULL,
                             created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de histórico/agenda de doses e execução de comandos MQTT.
CREATE TABLE IF NOT EXISTS medication_intake_history (
                                           id SERIAL PRIMARY KEY,
                                           dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
                                           medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
                                           scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                           intake_time TIMESTAMP WITH TIME ZONE,
                                           status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'taken', 'missed', 'failed')),
                                           command_id UUID UNIQUE,
                                           command_topic TEXT,
                                           command_payload JSONB,
                                           sent_at TIMESTAMP WITH TIME ZONE,
                                           acknowledged_at TIMESTAMP WITH TIME ZONE,
                                           attempts INTEGER NOT NULL DEFAULT 0,
                                           last_error TEXT,
                                           notes TEXT,
                                           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                           updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_events (
                                             id SERIAL PRIMARY KEY,
                                             topic TEXT NOT NULL,
                                             event_type VARCHAR(100) NOT NULL,
                                             dispenser_id INTEGER REFERENCES dispensers(id) ON DELETE SET NULL,
                                             medication_id INTEGER REFERENCES medications(id) ON DELETE SET NULL,
                                             payload JSONB NOT NULL,
                                             processed BOOLEAN NOT NULL DEFAULT false,
                                             processed_at TIMESTAMP WITH TIME ZONE,
                                             created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Índices para Performance (Buscas rápidas no App)
-- ---
CREATE INDEX IF NOT EXISTS idx_dispensers_sponsor_id ON dispensers (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_device_access_user_id ON device_access (user_id);
CREATE INDEX IF NOT EXISTS idx_medications_dispenser_id ON medications (dispenser_id);
CREATE INDEX IF NOT EXISTS idx_history_medication_id ON medication_intake_history (medication_id);
CREATE INDEX IF NOT EXISTS idx_history_dispenser_id ON medication_intake_history (dispenser_id);
CREATE INDEX IF NOT EXISTS idx_history_status_scheduled ON medication_intake_history (status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_device_events_dispenser_id ON device_events (dispenser_id);


-- =========================================================================
-- CARGA DE DADOS INICIAL (Dispositivos de Fábrica)
-- =========================================================================
INSERT INTO dispensers (serial_number, name, sponsor_id, status)
VALUES
    ('NEX-001-ALPHA', 'Dispenser Alfa', NULL, 'offline'),
    ('NEX-002-BETA',  'Dispenser Beta', NULL, 'offline'),
    ('NEX-003-GAMMA', 'Dispenser Gama', NULL, 'offline')
ON CONFLICT (serial_number) DO NOTHING;
