# Diagrama de Classes - NexDose

Representação das entidades principais do sistema e suas relações.

## 📊 Visualização

![Diagrama de Classes](./images/class-diagram.png)

## 📝 Código Mermaid

```mermaid
classDiagram
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
    Pharmacy "1" -- "*" Medication
```

## Descrição das Classes

| Classe | Responsabilidade |
|--------|------------------|
| **User** | Entidade base com autenticação e perfil |
| **Patient** | Paciente com histórico médico |
| **Caregiver** | Cuidador que gerencia pacientes |
| **Medication** | Medicamento com informações |
| **Prescription** | Prescrição vinculada a paciente e medicamento |
| **Reminder** | Lembrete de horários de medicação |
| **Pharmacy** | Farmácia com catálogo de medicamentos |
