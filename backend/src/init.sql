-- Arquivo de inicialização para o banco de dados NexDose no PostgreSQL

-- ---
-- Tabela de Usuários
-- Armazena informações sobre todos os usuários, sejam eles 'responsavel' ou 'caregiver'.
-- A coluna 'role' é essencial para o controle de permissões na aplicação.
-- ---
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('sponsor', 'caregiver')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Associação Cuidador-Responsável
-- Mapeia a relação entre cuidadores e os responsáveis que eles auxiliam.
-- Esta tabela define quais cuidadores podem visualizar os dados de quais responsáveis.
-- ---
CREATE TABLE caregiver_sponsor_associations (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sponsor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(caregiver_id, sponsor_id)
);

-- ---
-- Tabela de Dispensadores (Dispositivos)
-- Permite que um 'responsavel' cadastre múltiplos dispositivos.
-- Cada dispensador é vinculado a um único responsável.
-- ---
CREATE TABLE dispensers (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    responsavel_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Medicamentos
-- Armazena os medicamentos, vinculados diretamente a um 'responsavel'.
-- A permissão para adicionar/editar medicamentos é controlada pela API,
-- que deve verificar se o usuário tem a role 'responsavel'.
-- ---
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Agendamentos de Medicamentos
-- Define a frequência e os horários em que um medicamento deve ser tomado.
-- ---
CREATE TABLE medication_schedules (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    dispenser_id INTEGER REFERENCES dispensers(id),
    interval_hours INTEGER NOT NULL,
    start_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---
-- Tabela de Histórico de Ingestão
-- Registra cada vez que um medicamento foi 'tomado', 'perdido' ou está 'pendente'.
-- Essencial para o monitoramento da adesão ao tratamento.
-- ---
CREATE TABLE medication_intake_history (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    intake_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('taken', 'missed', 'pending')),
    notes TEXT
);



