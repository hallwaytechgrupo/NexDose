# Documentação - NexDose

Bem-vindo à documentação técnica do projeto NexDose. Aqui você encontrará informações sobre a arquitetura, design e fluxos do sistema.

## 📋 Índice

### Diagramas Arquiteturais

- **[Diagrama de Classes](./diagrams/class-diagram.md)** 
  - Modelagem das entidades principais
  - Relações entre classes
  - Atributos e métodos

- **[Diagrama de Casos de Uso](./diagrams/use-case-diagram.md)**
  - Funcionalidades do sistema
  - Atores e seus papéis
  - Interações principais

- **[Diagrama de Sequência](./diagrams/sequence-diagram.md)**
  - Fluxo de registro de medicamento
  - Sistema de lembretes
  - Interações entre componentes

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend:**
- React Native + Expo
- TypeScript
- Componentes customizados

**Backend:**
- Node.js + TypeScript
- API REST

**Database:**
- Estruturada conforme diagrama de classes

### Componentes Principais

1. **Autenticação** - Login e registro de usuários
2. **Gestão de Medicamentos** - Registro e visualização de prescrições
3. **Sistema de Lembretes** - Notificações push para adesão
4. **Painel de Cuidador** - Gerenciamento de múltiplos pacientes
5. **Integração Farmácia** - Busca e disponibilidade de medicamentos

## 📱 Telas Principais

| Tela | Responsabilidade |
|------|------------------|
| LoginScreen | Autenticação do usuário |
| CreateAccount | Registro de novo usuário |
| HomeScreen | Dashboard principal do paciente |
| RegisterMedicationScreen | Registro de novo medicamento |
| HistoryScreen | Histórico de adesão |
| CaregiverScreen | Painel do cuidador |
| PharmacyScreen | Busca em farmácias |
| SettingsScreen | Configurações da conta |

## 🔄 Fluxos Principais

### Fluxo de Onboarding
1. Usuário acessa o app
2. Escolhe entre Login ou Criar Conta
3. Se novo, preenche dados pessoais
4. Completa o perfil

### Fluxo de Registro de Medicamento
1. Abre tela de registro
2. Preenche informações da prescrição
3. Configura lembretes
4. Sistema envia notificações nos horários

### Fluxo de Cuidador
1. Cuidador acessa painel
2. Visualiza lista de pacientes
3. Acompanha adesão ao tratamento
4. Recebe alertas de faltas

## 📂 Estrutura de Pastas

```
docs/
├── README.md (este arquivo)
└── diagrams/
    ├── class-diagram.md
    ├── use-case-diagram.md
    └── sequence-diagram.md
```

## 🤝 Contribuindo

Ao modificar a arquitetura ou adicionar novas funcionalidades:

1. Atualize os diagramas correspondentes
2. Documente os novos fluxos
3. Mantenha a consistência com as decisões arquiteturais

## 📚 Referências

- [Documentação React Native](https://reactnative.dev)
- [Documentação Expo](https://docs.expo.dev)
- [Notação Mermaid](https://mermaid.js.org)

---

*Última atualização: Maio 2026*
