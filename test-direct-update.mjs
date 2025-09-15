// Тестовый скрипт для прямого обновления счета
// Запускать через: node test-direct-update.mjs

import { createClient } from '@supabase/supabase-js';

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
        console.error('Детали ошибки:', JSON.stringify(error1, null, 2));
    } else {
        console.log('Успешно обновлено:', data1);
    }

    // 2. Проверим, что именно отправляется
    console.log('\n2. Отладка запроса:');
    // Создаем новый клиент с логированием
    const debugClient = createClient(supabaseUrl, supabaseKey, {
        global: {
            fetch: async (url, options) => {
                console.log('Запрос к:', url);
                console.log('Метод:', options.method);
                console.log('Заголовки:', options.headers);
                console.log('Тело запроса:', options.body);
                const response = await fetch(url, options);
                const text = await response.text();
                console.log('Ответ:', text);
                // Возвращаем новый Response с тем же текстом
                return new Response(text, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
        }
    });

    const { data: data2, error: error2 } = await debugClient
        .from('invoices')
        .update({ description: 'Debug test' })
        .eq('id', 72)
        .select();

    if (error2) {
        console.error('Ошибка с отладкой:', error2);
    } else {
        console.log('Успешно с отладкой:', data2);
    }

    console.log('\n========== КОНЕЦ ТЕСТА ==========');
}

// Запускаем тест
testDirectUpdate().catch(console.error);