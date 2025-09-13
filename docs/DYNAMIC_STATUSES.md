# Система динамических статусов

## Обзор

В системе PayHub5 реализована поддержка динамических статусов, которые хранятся в базе данных и могут быть изменены через административную панель без изменения кода.

## Архитектура

### Таблица `statuses` в БД

```sql
CREATE TABLE statuses (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,  -- 'invoice', 'payment', 'project'
  code VARCHAR(50) NOT NULL,         -- Уникальный код статуса
  name VARCHAR(100) NOT NULL,        -- Отображаемое название
  description TEXT,                   -- Описание статуса
  color VARCHAR(50),                  -- Цвет для отображения
  is_final BOOLEAN DEFAULT FALSE,    -- Финальный статус
  is_active BOOLEAN DEFAULT TRUE,    -- Активность статуса
  order_index INTEGER,                -- Порядок отображения
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Текущие статусы в системе

#### Статусы счетов (invoice)
- `draft` - Черновик
- `pending` - В ожидании
- `partially_paid` - Частично оплачен
- `paid` - Полностью оплачен
- `cancelled` - Отменён

#### Статусы платежей (payment)
- `draft` - Черновик
- `pending` - На согласовании
- `approved` - Согласован
- `scheduled` - В графике на оплату
- `paid` - Оплачен
- `cancelled` - Отменён

## Файловая структура

```
src/
├── services/
│   ├── statuses/
│   │   ├── types.ts      # TypeScript типы
│   │   ├── crud.ts       # CRUD операции
│   │   └── queries.ts    # Оптимизированные запросы
│   ├── hooks/
│   │   └── useStatuses.ts # React Query хуки
│   └── dashboard/
│       ├── helpers.ts     # Хелперы для работы со статусами
│       └── optimized-stats.ts # Оптимизированная статистика
├── constants/
│   └── statuses.ts        # Константы кодов статусов
└── components/
    └── StatusTag.tsx      # Компонент отображения статуса
```

## Использование

### 1. Получение статусов в компоненте

```tsx
import { useStatusesList } from '@/services/hooks/useStatuses'

function MyComponent() {
  // Получить все статусы для счетов
  const { data: statuses, isLoading } = useStatusesList('invoice')

  if (isLoading) return <Spin />

  return (
    <Select>
      {statuses?.map(status => (
        <Option key={status.code} value={status.code}>
          {status.name}
        </Option>
      ))}
    </Select>
  )
}
```

### 2. Отображение статуса

```tsx
import { StatusTag } from '@/components/StatusTag'

function InvoiceRow({ invoice }) {
  return (
    <div>
      <StatusTag
        status={invoice.status}
        type="invoice"
      />
    </div>
  )
}
```

### 3. Использование в статистике

```tsx
import { useOptimizedDashboardStats } from '@/services/dashboard'

function Dashboard() {
  const { data: stats } = useOptimizedDashboardStats()

  // Статистика по статусам
  const draftCount = stats?.invoices.byStatus['draft'] || 0
  const paidCount = stats?.invoices.byStatus['paid'] || 0

  return (
    <div>
      <Statistic title="Черновики" value={draftCount} />
      <Statistic title="Оплаченные" value={paidCount} />
    </div>
  )
}
```

### 4. Использование констант

```tsx
import { INVOICE_STATUS, PAYMENT_STATUS } from '@/constants/statuses'

// Создание нового счета с дефолтным статусом
const newInvoice = {
  status: INVOICE_STATUS.DRAFT,
  // ...
}

// Проверка статуса
if (invoice.status === INVOICE_STATUS.PAID) {
  // Счет оплачен
}
```

## Кэширование

- Статусы кэшируются на клиенте на 5 минут через React Query
- Dashboard хелперы имеют отдельный кэш на 5 минут
- При необходимости кэш можно сбросить:

```tsx
import { clearStatusCache } from '@/services/dashboard/helpers'

// Сбросить кэш статусов
clearStatusCache()
```

## Добавление новых статусов

1. Добавить статус в БД через админ-панель или SQL:

```sql
INSERT INTO statuses (entity_type, code, name, color, order_index)
VALUES ('invoice', 'review', 'На проверке', 'orange', 3);
```

2. Обновить константы в `src/constants/statuses.ts`:

```tsx
export const INVOICE_STATUS = {
  // ...
  REVIEW: 'review',
}
```

3. Статус автоматически появится во всех компонентах

## Миграция старого кода

При обнаружении жёстко закодированных статусов:

```tsx
// Старый код
if (invoice.status === 'paid') { }

// Новый код
import { INVOICE_STATUS } from '@/constants/statuses'
if (invoice.status === INVOICE_STATUS.PAID) { }
```

## Преимущества системы

1. **Гибкость** - статусы можно менять без изменения кода
2. **Централизация** - единое место управления статусами
3. **Производительность** - кэширование на клиенте
4. **Типобезопасность** - TypeScript типы для всех статусов
5. **Обратная совместимость** - поддержка старых интерфейсов

## Отладка

Все операции со статусами логируются в консоль:

```
[StatusTag] Rendering status tag: {status: "paid", type: "invoice"}
[getStatusMappings] Fetching fresh status mappings from database
[useOptimizedDashboardStats] Statistics calculated: {...}
```

Для отключения логирования удалите `console.log` из соответствующих файлов.