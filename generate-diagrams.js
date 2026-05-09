#!/usr/bin/env node

/**
 * Script para gerar imagens PNG dos diagramas Mermaid
 * Usa a API do mermaid.ink
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MERMAID_INK_API = 'https://mermaid.ink/img/';

// Diagramas a gerar
const diagrams = [
  {
    name: 'Diagrama de Classes',
    file: 'docs/diagrams/class-diagram.md',
    outputImage: 'docs/diagrams/class-diagram.png',
    mermaid: `classDiagram
    class User {
        +id: string
        +name: string
        +email: string
        +password: string
        +role: string
        +createdAt: Date
        +login()
        +logout()
        +updateProfile()
    }
    
    class Patient {
        +id: string
        +userId: string
        +dateOfBirth: Date
        +medicalHistory: string
        +allergies: string[]
        +getMedications()
        +addMedication()
    }
    
    class Caregiver {
        +id: string
        +userId: string
        +relationship: string
        +patientsManaged: string[]
        +managedPatients()
    }
    
    class Medication {
        +id: string
        +name: string
        +dosage: string
        +description: string
        +sideEffects: string[]
        +validate()
    }
    
    class Prescription {
        +id: string
        +patientId: string
        +medicationId: string
        +dosage: string
        +frequency: string
        +startDate: Date
        +endDate: Date
        +instructions: string
        +isActive: boolean
        +createReminder()
        +updatePrescription()
    }
    
    class Reminder {
        +id: string
        +prescriptionId: string
        +time: string
        +frequency: string
        +isActive: boolean
        +sent: boolean
        +sendNotification()
    }
    
    class Pharmacy {
        +id: string
        +name: string
        +location: string
        +phone: string
        +medications: Medication[]
        +findMedication()
    }
    
    User <|-- Patient
    User <|-- Caregiver
    Patient "1" -- "*" Prescription
    Medication "1" -- "*" Prescription
    Prescription "1" -- "*" Reminder
    Pharmacy "1" -- "*" Medication`
  },
  {
    name: 'Diagrama de Casos de Uso',
    file: 'docs/diagrams/use-case-diagram.md',
    outputImage: 'docs/diagrams/use-case-diagram.png',
    mermaid: `graph TD
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
    UPDATE --> DELETE`
  },
  {
    name: 'Diagrama de Sequência',
    file: 'docs/diagrams/sequence-diagram.md',
    outputImage: 'docs/diagrams/sequence-diagram.png',
    mermaid: `sequenceDiagram
    participant Patient as 👤 Paciente
    participant App as 📱 App NexDose
    participant Backend as 🖥️ Backend
    participant DB as 💾 Database
    participant Notif as 📬 Notification Service
    
    Patient->>App: Abre tela de registro
    Patient->>App: Preenche dados do medicamento
    Patient->>App: Clica em "Registrar"
    
    App->>App: Valida dados
    
    alt Validação falha
        App->>Patient: Exibe erro
    else Validação passa
        App->>Backend: POST /medications (dados)
        Backend->>DB: Insere medicamento
        DB-->>Backend: ID do medicamento
        Backend->>DB: Cria prescrição
        DB-->>Backend: ID da prescrição
        
        Backend->>Backend: Calcula próximos horários
        Backend->>Notif: Registra lembretes
        Notif-->>Backend: Confirmação
        
        Backend-->>App: {success: true, medicationId}
        App->>Patient: ✅ Medicamento registrado!
        
        App->>App: Agenda notificações locais
        
        note over Patient,Notif: Sistema aguarda próximo horário
        
        Notif->>Notif: Horário de lembrete chegou
        Notif->>Patient: 🔔 Notificação push
        Patient->>App: Clica na notificação
        
        App->>Backend: PUT /medications/{id}/taken
        Backend->>DB: Registra dose tomada
        DB-->>Backend: Confirmação
        Backend-->>App: {success: true}
        App->>Patient: ✅ Dose registrada!
    end`
  }
];

function encodeBase64(str) {
  return Buffer.from(str).toString('base64');
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath);
      reject(err);
    });
  });
}

async function generateDiagrams() {
  console.log('🎨 Gerando imagens dos diagramas...\n');

  for (const diagram of diagrams) {
    try {
      console.log(`⏳ Gerando: ${diagram.name}...`);
      
      const encoded = encodeBase64(diagram.mermaid);
      const imageUrl = MERMAID_INK_API + encoded;
      const fullPath = path.join(__dirname, diagram.outputImage);
      
      await downloadImage(imageUrl, fullPath);
      console.log(`✅ ${diagram.name} gerada em: ${diagram.outputImage}\n`);
    } catch (error) {
      console.error(`❌ Erro ao gerar ${diagram.name}:`, error.message);
    }
  }

  console.log('🎉 Processo concluído!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Verificar as imagens em docs/diagrams/');
  console.log('2. Commitar as imagens ao git');
  console.log('3. Os arquivos .md já referenciam as imagens');
}

generateDiagrams().catch(console.error);
