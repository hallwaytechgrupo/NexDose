/**
 * @file test-scheduling.ts
 * @description Testes dos endpoints de agendamento de medicações
 * @usage: npx ts-node test-scheduling.ts (ou npm run test após adicionar script)
 */

import axios, { AxiosError } from 'axios';

const API_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 'test-user-' + Date.now();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

// Função helper para fazer requisições
async function request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      data,
      timeout: 5000,
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const axiosError = error as AxiosError;
    return { success: false, error: axiosError.message, status: axiosError.response?.status };
  }
}

// Testes
async function runTests() {
  console.log('🧪 Iniciando testes da API de Agendamento');
  console.log(`📝 User ID: ${TEST_USER_ID}\n`);

  let medicationId: string;

  // ============ TEST 1: Criar medicação ============
  {
    console.log('1️⃣ Criando medicação...');
    const response = await request('POST', '/agendamentos', {
      userId: TEST_USER_ID,
      name: 'Dipirona 500mg',
      dosage: '500mg',
      type: 'tablet',
      interval: 8,
      startTime: '08:00',
    });

    if (response.success && response.status === 201) {
      medicationId = response.data.id;
      results.push({
        name: 'Criar medicação',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Medicação criada! ID: ${medicationId}\n`);
    } else {
      results.push({
        name: 'Criar medicação',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao criar medicação: ${response.error}\n`);
      return;
    }
  }

  // ============ TEST 2: Listar medicações ============
  {
    console.log('2️⃣ Listando medicações do usuário...');
    const response = await request('GET', `/agendamentos/${TEST_USER_ID}`);

    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      results.push({
        name: 'Listar medicações',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ ${response.data.length} medicação(ões) encontrada(s)\n`);
    } else {
      results.push({
        name: 'Listar medicações',
        status: 'FAIL',
        message: 'Nenhuma medicação encontrada',
      });
      console.log(`❌ Erro ao listar medicações\n`);
    }
  }

  // ============ TEST 3: Obter próxima dose ============
  {
    console.log('3️⃣ Obtendo próxima dose...');
    const response = await request('GET', `/agendamentos/${TEST_USER_ID}/proxima-dose`);

    if (response.success && response.data.proximaDose) {
      results.push({
        name: 'Próxima dose',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Próxima dose: ${response.data.proximaDose.proximaDose} (${response.data.proximaDose.proximaEm})\n`);
    } else {
      results.push({
        name: 'Próxima dose',
        status: 'FAIL',
        message: 'Nenhuma próxima dose disponível',
      });
      console.log(`⚠️ Nenhuma próxima dose disponível\n`);
    }
  }

  // ============ TEST 4: Marcar dose como tomada ============
  {
    console.log('4️⃣ Marcando dose como tomada...');
    const response = await request('POST', `/agendamentos/${medicationId}/marcar-como-tomado`, {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
    });

    if (response.success && response.data.medication) {
      results.push({
        name: 'Marcar como tomado',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Dose registrada às ${response.data.medication.doseHistory[0]?.time}\n`);
    } else {
      results.push({
        name: 'Marcar como tomado',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao registrar dose: ${response.error}\n`);
    }
  }

  // ============ TEST 5: Calcular aderência ============
  {
    console.log('5️⃣ Calculando aderência...');
    const response = await request('GET', `/agendamentos/${TEST_USER_ID}/aderencia`);

    if (response.success && response.data.hasOwnProperty('aderencia')) {
      results.push({
        name: 'Aderência',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Aderência: ${response.data.aderencia}% (${response.data.tomadas}/${response.data.total})\n`);
    } else {
      results.push({
        name: 'Aderência',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao calcular aderência: ${response.error}\n`);
    }
  }

  // ============ TEST 6: Atualizar medicação ============
  {
    console.log('6️⃣ Atualizando medicação...');
    const response = await request('PUT', `/agendamentos/${medicationId}`, {
      interval: 12,
      active: true,
    });

    if (response.success && response.data.interval === 12) {
      results.push({
        name: 'Atualizar medicação',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Medicação atualizada: intervalo agora é ${response.data.interval}h\n`);
    } else {
      results.push({
        name: 'Atualizar medicação',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao atualizar medicação: ${response.error}\n`);
    }
  }

  // ============ TEST 7: Criar segunda medicação ============
  {
    console.log('7️⃣ Criando segunda medicação...');
    const response = await request('POST', '/agendamentos', {
      userId: TEST_USER_ID,
      name: 'Hipertensão 10mg',
      dosage: '10mg',
      type: 'capsule',
      interval: 24,
      startTime: '20:00',
    });

    if (response.success) {
      results.push({
        name: 'Criar segunda medicação',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Segunda medicação criada\n`);
    } else {
      results.push({
        name: 'Criar segunda medicação',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao criar segunda medicação: ${response.error}\n`);
    }
  }

  // ============ TEST 8: Deletar medicação ============
  {
    console.log('8️⃣ Deletando medicação...');
    const response = await request('DELETE', `/agendamentos/${medicationId}`);

    if (response.success && response.data.message === 'Medicação deletada') {
      results.push({
        name: 'Deletar medicação',
        status: 'PASS',
        data: response.data,
      });
      console.log(`✅ Medicação deletada\n`);
    } else {
      results.push({
        name: 'Deletar medicação',
        status: 'FAIL',
        message: response.error,
      });
      console.log(`❌ Erro ao deletar medicação: ${response.error}\n`);
    }
  }

  // ============ TEST 9: Erro - Medicação não encontrada ============
  {
    console.log('9️⃣ Testando erro (medicação inexistente)...');
    const response = await request('GET', '/agendamentos/medicacao-inexistente');

    if (!response.success || response.status === 404) {
      results.push({
        name: 'Erro - Medicação não encontrada',
        status: 'PASS',
      });
      console.log(`✅ Erro tratado corretamente\n`);
    } else {
      results.push({
        name: 'Erro - Medicação não encontrada',
        status: 'FAIL',
      });
      console.log(`❌ Erro não foi tratado\n`);
    }
  }

  // ============ RESUMO ============
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((r, i) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${r.name}`);
    if (r.message) console.log(`   └─ ${r.message}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Testes PASSOU: ${passed}`);
  console.log(`❌ Testes FALHARAM: ${failed}`);
  console.log(`📊 Taxa de sucesso: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! A API está funcionando corretamente.\n');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique a conexão com a API.\n');
  }
}

// Executar testes
runTests().catch((err) => {
  console.error('❌ Erro ao executar testes:', err.message);
  console.log('\n📝 Certifique-se que o servidor está rodando: npm run dev');
});
