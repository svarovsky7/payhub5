import { supabase } from '../supabase'

/**
 * Статус работы Storage
 */
export const storageStatus = {
  initialized: false,
  bucketAvailable: false,
  uploadEnabled: false,
  lastError: null as any,
  checkedAt: null as Date | null
}

/**
 * Инициализация Storage buckets
 */
export async function initializeStorageBuckets() {
  console.log('[StorageInit] ============================================')
  console.log('[StorageInit] Начало инициализации Storage...')
  console.log('[StorageInit] ============================================')

  storageStatus.checkedAt = new Date()

  try {
    // Шаг 1: Проверяем доступность Storage API
    console.log('[StorageInit] Шаг 1: Проверка доступности Storage API...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('[StorageInit] ❌ Storage API недоступен:', listError)
      storageStatus.lastError = listError

      // Пробуем альтернативный метод - прямой доступ к bucket
      console.log('[StorageInit] Пробуем прямой доступ к bucket "documents"...')
      const { error: directError } = await supabase.storage.from('documents').list('test', { limit: 1 })

      if (!directError) {
        console.log('[StorageInit] ✅ Bucket "documents" доступен через прямой доступ')
        storageStatus.bucketAvailable = true
      } else {
        console.error('[StorageInit] ❌ Прямой доступ к bucket также недоступен:', directError)
      }
    } else {
      console.log('[StorageInit] ✅ Storage API доступен')
      console.log('[StorageInit] Найдено buckets:', buckets?.map(b => b.name) || [])

      // Шаг 2: Проверяем наличие bucket "documents"
      const documentsBucket = buckets?.find(b => b.name === 'documents')

      if (!documentsBucket) {
        console.log('[StorageInit] ⚠️ Bucket "documents" не найден в списке')
        console.log('[StorageInit] Возможные причины:')
        console.log('[StorageInit] 1. Bucket не создан в Supabase Dashboard')
        console.log('[StorageInit] 2. RLS политики скрывают bucket')
        console.log('[StorageInit] 3. Недостаточно прав для просмотра')

        // Пробуем создать bucket
        console.log('[StorageInit] Попытка создания bucket "documents"...')
        const { data, error } = await supabase.storage.createBucket('documents', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: undefined // Разрешаем все типы файлов
        })

        if (error) {
          if (error.message?.includes('already exists')) {
            console.log('[StorageInit] ℹ️ Bucket уже существует (скрыт RLS)')
            storageStatus.bucketAvailable = true
          } else if (error.message?.includes('row-level security') ||
                     error.message?.includes('policy')) {
            console.log('[StorageInit] ⚠️ RLS блокирует создание bucket')
            console.log('[StorageInit] Bucket вероятно существует, но требует настройки политик')
            storageStatus.bucketAvailable = true // Предполагаем что bucket есть
          } else {
            console.error('[StorageInit] ❌ Не удалось создать bucket:', error)
            storageStatus.lastError = error
          }
        } else {
          console.log('[StorageInit] ✅ Bucket "documents" успешно создан:', data)
          storageStatus.bucketAvailable = true
        }
      } else {
        console.log('[StorageInit] ✅ Bucket "documents" найден:', {
          name: documentsBucket.name,
          public: documentsBucket.public,
          created_at: documentsBucket.created_at
        })
        storageStatus.bucketAvailable = true
      }
    }

    // Шаг 3: Тестируем возможность загрузки
    if (storageStatus.bucketAvailable) {
      console.log('[StorageInit] Шаг 3: Тестирование загрузки файлов...')

      const testFileName = `_test/storage_test_${Date.now()}.txt`
      const testContent = new Blob(['Storage test at ' + new Date().toISOString()], { type: 'text/plain' })

      console.log('[StorageInit] Загружаем тестовый файл:', testFileName)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(testFileName, testContent, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('[StorageInit] ❌ Тестовая загрузка не удалась:', uploadError)
        storageStatus.lastError = uploadError

        if (uploadError.message?.includes('row-level security') ||
            uploadError.message?.includes('policy')) {
          console.log('[StorageInit] ============================================')
          console.log('[StorageInit] ⚠️ ТРЕБУЕТСЯ НАСТРОЙКА RLS ПОЛИТИК')
          console.log('[StorageInit] ============================================')
          console.log('[StorageInit] Выполните следующие действия:')
          console.log('[StorageInit] 1. Откройте Supabase Dashboard')
          console.log('[StorageInit] 2. Перейдите в SQL Editor')
          console.log('[StorageInit] 3. Выполните SQL из файла:')
          console.log('[StorageInit]    supabase/fix-storage-policies.sql')
          console.log('[StorageInit] ============================================')
        }

        storageStatus.uploadEnabled = false
      } else {
        console.log('[StorageInit] ✅ Тестовая загрузка успешна:', uploadData)
        storageStatus.uploadEnabled = true

        // Очищаем тестовый файл
        console.log('[StorageInit] Удаляем тестовый файл...')
        const { error: removeError } = await supabase.storage
          .from('documents')
          .remove([testFileName])

        if (removeError) {
          console.warn('[StorageInit] ⚠️ Не удалось удалить тестовый файл:', removeError)
        } else {
          console.log('[StorageInit] ✅ Тестовый файл удален')
        }
      }
    }

    storageStatus.initialized = true

    // Итоговый статус
    console.log('[StorageInit] ============================================')
    console.log('[StorageInit] ИТОГОВЫЙ СТАТУС:')
    console.log('[StorageInit] - Инициализирован:', storageStatus.initialized)
    console.log('[StorageInit] - Bucket доступен:', storageStatus.bucketAvailable)
    console.log('[StorageInit] - Загрузка работает:', storageStatus.uploadEnabled)
    if (storageStatus.lastError) {
      console.log('[StorageInit] - Последняя ошибка:', storageStatus.lastError.message)
    }
    console.log('[StorageInit] ============================================')

  } catch (error) {
    console.error('[StorageInit] ❌ Критическая ошибка инициализации:', error)
    storageStatus.lastError = error
    storageStatus.initialized = true // Помечаем как инициализированный, но с ошибкой
  }

  return storageStatus
}

// Экспортируем для использования в других модулях
export function getStorageStatus() {
  return { ...storageStatus }
}

// Автоматически инициализируем при загрузке модуля
if (typeof window !== 'undefined') {
  // Задержка для того чтобы дать приложению загрузиться
  setTimeout(() => {
    initializeStorageBuckets().catch(console.error)
  }, 1000)
}