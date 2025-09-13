# Настройка Supabase Storage для PayHub5

## Проблема
При попытке загрузки файлов возникает ошибка:
```
new row violates row-level security policy
```

Это происходит потому, что:
1. Bucket "documents" не существует в Supabase Storage
2. У пользователей нет прав на создание buckets
3. RLS политики блокируют операции с Storage

## Решение

### Шаг 1: Выполните SQL скрипт

1. Откройте Supabase Studio: http://31.128.51.210:8002
2. Войдите с правами администратора
3. Перейдите в SQL Editor
4. Скопируйте и выполните содержимое файла `supabase/storage-setup.sql`

### Шаг 2: Проверьте результат

После выполнения скрипта выполните проверочный запрос:

```sql
SELECT public.test_storage_upload();
```

Должен вернуться результат:
```json
{
  "user_id": "ваш-user-id",
  "is_authenticated": true,
  "can_access_storage": true,
  "bucket_exists": true,
  "policies_count": 4
}
```

### Шаг 3: Проверьте bucket

```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

Должна вернуться запись с bucket "documents".

## Что делает скрипт

1. **Создает bucket "documents"** с публичным доступом для чтения
2. **Настраивает RLS политики** для Storage:
   - Публичное чтение файлов
   - Загрузка только для аутентифицированных пользователей
   - Обновление и удаление только для владельцев файлов
3. **Выдает права** на таблицы storage.buckets и storage.objects
4. **Создает вспомогательную функцию** для проверки доступа
5. **Настраивает RLS для таблиц** attachments и invoice_documents

## Альтернативное решение (если нет доступа к SQL)

Если у вас нет прав администратора для выполнения SQL:

1. Обратитесь к администратору базы данных
2. Попросите выполнить скрипт `supabase/storage-setup.sql`
3. Или попросите создать bucket "documents" через интерфейс Supabase Studio

## Проверка работы

После настройки:

1. Перезагрузите страницу приложения
2. Попробуйте загрузить файл к счету
3. Проверьте консоль браузера - не должно быть ошибок RLS
4. Файл должен появиться в Storage по адресу:
   http://31.128.51.210:8002/project/default/storage/buckets/documents

## Структура хранения файлов

```
documents/
├── invoices/
│   ├── {invoice_id}/
│   │   ├── {timestamp}_{unique_id}_{filename}.pdf
│   │   ├── {timestamp}_{unique_id}_{filename}.doc
│   │   └── ...
```

## Troubleshooting

### Ошибка "bucket does not exist"
- Выполните скрипт создания bucket из `storage-setup.sql`

### Ошибка "permission denied" 
- Проверьте, что пользователь аутентифицирован
- Убедитесь, что выполнены все RLS политики из скрипта

### Файлы не отображаются в интерфейсе
- Проверьте, что bucket имеет public = true
- Убедитесь, что политика "Public read access for documents" создана

## Контакты для помощи

Если проблема не решается:
1. Проверьте логи в консоли браузера
2. Обратитесь к администратору БД
3. Создайте issue в репозитории проекта