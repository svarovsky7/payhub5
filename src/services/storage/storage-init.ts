import { supabase } from '../supabase'

/**
 * Инициализация Storage buckets
 */
export async function initializeStorageBuckets() {
  console.log('[StorageInit] Проверка и создание buckets...')
  
  try {
    // Получаем список существующих buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('[StorageInit] Ошибка получения списка buckets:', listError)
      return
    }
    
    console.log('[StorageInit] Существующие buckets:', buckets?.map(b => b.name))
    
    // Проверяем наличие bucket "documents"
    const documentsBucket = buckets?.find(b => b.name === 'documents')
    
    if (!documentsBucket) {
      console.log('[StorageInit] Bucket "documents" не найден в списке доступных buckets')
      console.log('[StorageInit] Попытка создания bucket может требовать административных прав')
      
      // Пробуем создать bucket только если это не production среда
      if (import.meta.env.DEV) {
        try {
          const { data, error } = await supabase.storage.createBucket('documents', {
            public: true, // Публичный доступ для чтения
            allowedMimeTypes: [
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/bmp',
              'text/plain',
              'text/html'
            ],
            fileSizeLimit: 10485760 // 10MB
          })
          
          if (error) {
            // Не показываем ошибку, если это проблема с правами
            if (error.message?.includes('row-level security') || 
                error.message?.includes('permission') || 
                error.message?.includes('denied')) {
              console.info('[StorageInit] Bucket "documents" вероятно уже существует на сервере, но не виден из-за политик безопасности')
            } else {
              console.error('[StorageInit] Ошибка создания bucket:', error)
            }
          } else {
            console.log('[StorageInit] Bucket "documents" успешно создан:', data)
          }
        } catch (err) {
          console.info('[StorageInit] Не удалось создать bucket, вероятно он уже существует')
        }
      }
    } else {
      console.log('[StorageInit] Bucket "documents" доступен:', {
        name: documentsBucket.name,
        public: documentsBucket.public,
        created_at: documentsBucket.created_at
      })
    }
    
    // Создаем тестовую папку для проверки доступа
    const testFileName = `test/init_${Date.now()}.txt`
    const testContent = new Blob(['Test storage access'], { type: 'text/plain' })
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('[StorageInit] Ошибка тестовой загрузки:', uploadError)
      console.warn('[StorageInit] Storage может быть недоступен или требует дополнительной настройки')
    } else {
      console.log('[StorageInit] Тестовая загрузка успешна:', uploadData)
      
      // Удаляем тестовый файл
      await supabase.storage
        .from('documents')
        .remove([testFileName])
        .catch(err => console.warn('[StorageInit] Не удалось удалить тестовый файл:', err))
    }
    
  } catch (error) {
    console.error('[StorageInit] Критическая ошибка инициализации Storage:', error)
  }
}

// Автоматически инициализируем при загрузке модуля
if (typeof window !== 'undefined') {
  initializeStorageBuckets().catch(console.error)
}