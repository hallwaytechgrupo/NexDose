# Diagrama de Casos de Uso - NexDose

Funcionalidades do sistema por tipo de ator/usuário.

## 🎯 Visualização

![Diagrama de Casos de Uso](./images/use-case-diagram.png)

## 📝 Código Mermaid

```mermaid
graph TD
    subgraph Actors
        P[👤 Paciente]
        C[👥 Cuidador]
        F[💊 Farmacêutico]
        SYS[⚙️ Sistema]
    end
    
    subgraph Authentication
        LOGIN["🔐 Realizar Login"]
        SIGNUP["📝 Criar Conta"]
        LOGOUT["🚪 Realizar Logout"]
    end
    
    subgraph Medication Management
        REG["💉 Registrar Medicamento"]
        VIEW["👁️ Visualizar Medicamentos"]
        UPDATE["✏️ Atualizar Prescrição"]
        DELETE["🗑️ Remover Medicamento"]
    end
    
    subgraph Reminders
        SET["⏰ Configurar Lembrete"]
        SEND["📱 Enviar Notificação"]
        VIEW_REM["📋 Ver Histórico"]
    end
    
    subgraph Caregiver Features
        MANAGE["👁️ Gerenciar Pacientes"]
        TRACK["📊 Rastrear Adesão"]
    end
    
    subgraph Pharmacy Features
        SEARCH["🔍 Buscar Medicamento"]
        VIEW_PHARMA["📱 Consultar Disponibilidade"]
    end
    
    P --> LOGIN
    P --> SIGNUP
    P --> REG
    P --> VIEW
    P --> SET
    P --> VIEW_REM
    
    C --> LOGIN
    C --> MANAGE
    C --> TRACK
    C --> VIEW
    
    F --> LOGIN
    F --> SEARCH
    F --> VIEW_PHARMA
    
    SYS --> SEND
    SYS --> LOGOUT
    
    LOGIN --> LOGOUT
    REG --> SET
    SET --> SEND
    VIEW --> UPDATE
    UPDATE --> DELETE
```

## Funções por Ator

### 👤 Paciente
- Criar conta e fazer login
- Registrar medicamentos
- Visualizar seus medicamentos
- Configurar lembretes
- Ver histórico de adesão

### 👥 Cuidador
- Gerenciar múltiplos pacientes
- Rastrear adesão ao tratamento
- Visualizar medicamentos dos pacientes
- Receber notificações de atualizações

### 💊 Farmacêutico
- Buscar medicamentos no catálogo
- Consultar disponibilidade
- Atualizar informações de medicamentos

### ⚙️ Sistema
- Enviar notificações de lembretes
- Registrar histórico de adesão
- Autenticar usuários
