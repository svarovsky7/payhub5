// Тестовый скрипт для прямого обновления счета
// Запускать через: node test-direct-update.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://31.128.51.210:8002';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectUpdate() {
    console.log('========== ТЕСТ ПРЯМОГО ОБНОВЛЕНИЯ ==========');

    // 1. Пробуем минимальное обновление
    console.log('\n1. Минимальное обновление (только description):');
    const { data: data1, error: error1 } = await supabase
        .from('invoices')
        .update({ description: 'Test direct update' })
        .eq('id', 72)
        .select();

    if (error1) {
        console.error('Ошибка:', error1);
    } else {
        console.log('Успешно обновлено:', data1);
    }

    // 2. Пробуем обновление с несколькими полями
    console.log('\n2. Обновление нескольких полей:');
    const { data: data2, error: error2 } = await supabase
        .from('invoices')
        .update({
            description: 'Test multiple fields',
            priority: 'high'
        })
        .eq('id', 72)
        .select();

    if (error2) {
        console.error('Ошибка:', error2);
    } else {
        console.log('Успешно обновлено:', data2);
    }

    // 3. Пробуем обновление через RPC
    console.log('\n3. Попытка обновления через RPC:');
    const { data: data3, error: error3 } = await supabase
        .rpc('update_invoice_description', {
            invoice_id: 72,
            new_description: 'Updated via RPC'
        });

    if (error3) {
        console.error('Ошибка RPC (ожидаемо, если функция не существует):', error3);
    } else {
        console.log('Успешно через RPC:', data3);
    }

    console.log('\n========== КОНЕЦ ТЕСТА ==========');
}

// Запускаем тест
testDirectUpdate().catch(console.error);