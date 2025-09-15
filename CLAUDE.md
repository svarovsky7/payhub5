# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PayHub5 is a procurement and payment management system for construction companies built with React 18, TypeScript 5.8, and Vite 7. The application provides invoice management, payment processing, workflow automation, and reporting capabilities via Supabase backend.

## Development Commands

```bash
npm run dev          # Start development server (port 4000)
npm run build        # Production build (TypeScript check + Vite build)
npm run lint         # ESLint check with max 0 warnings
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier formatting
npm run type-check   # TypeScript check without emitting
npm run preview      # Preview production build
npm run knip         # Check for unused exports and dependencies
npm run knip:fix     # Auto-fix unused exports
npm run knip:production # Check production dependencies
npm run knip:watch   # Watch mode for dead code detection
```

**Important**: After completing any code changes, always run `npm run lint` and `npm run type-check` to ensure code quality.

## Architecture

### Three-Tier Service Pattern
1. **CRUD Layer** (`services/[domain]/crud.ts`) - Direct Supabase API calls
2. **Query Layer** (`services/[domain]/queries.ts` or `optimized-queries.ts`) - Error handling and data transformation
3. **Hook Layer** (`services/hooks/use[Domain].ts`) - TanStack Query hooks with caching and real-time updates

Components exclusively consume hooks, never calling services directly.

### Service Domains
Located in `src/services/`:
- `invoices/` - Invoice management with workflow support
- `payments/` - Payment processing and tracking
- `contractors/` - Contractor/supplier management
- `projects/` - Project tracking
- `admin/` - Administrative functions (users, roles, workflows)
- `hooks/` - React Query hooks for all domains

### State Management
- **Server State**: TanStack Query 5.0 with configurable stale time (default 30s)
- **Auth State**: Zustand 4.4 with immer middleware, persisted to localStorage (`models/auth.tsx`)

### Routing Strategy
- Lazy-loaded routes via `React.lazy()` in `app/router.tsx`
- Protected routes wrapped with `ProtectedRoute` component
- Authenticated pages use `MainLayout` wrapper
- Main routes: `/login`, `/invoices`, `/admin`, `/payments`, `/approvals`
- Invoice sub-routes: `/invoices/create`, `/invoices/:id/view`

### Database Integration

**⚠️ CRITICAL: Always query live database via MCP Supabase server**
- Server URL: `http://31.128.51.210:8002`
- Use `mcp__supabase-postgrest__postgrestRequest` for CRUD operations
- Use `mcp__supabase-postgrest__sqlToRest` for complex queries
- PostgREST API: `http://31.128.51.210:8002/rest/v1`

**Database Schema Reference**
- The file `supabase/schemas/prod.sql` contains the complete database schema export
- Use this file to understand table structures, relationships, constraints, indexes
- Includes all tables, views, functions, triggers, and enum types
- This is the authoritative source for database structure when MCP queries are unavailable

**Important Tables**:
- `invoices` - Main invoice records with workflow integration
- `payments` - Payment transactions linked to invoices
- `contractors` - Suppliers and payers (INN validation)
- `projects` - Project management with addresses and budgets
- `users` & `user_profiles` - Authentication and user management
- `workflows` & `workflow_steps` - Configurable approval processes
- `documents` - File attachments for invoices

### TypeScript Configuration
Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`:
- `@/` - src directory root
- `@/services`, `@/components`, `@/models`, `@/utils`, `@/pages`, `@/realtime`, `@/app`

Strict TypeScript checks enabled:
- `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`

### Authentication
- JWT tokens managed by Supabase Auth
- User profiles auto-created via database trigger
- Auth state managed in `models/auth.tsx` with Zustand
- Session persistence and auto-refresh handled


### Build Configuration
Vite configuration (`vite.config.ts`):
- Dev server runs on port 4000
- Manual chunking for optimization (vendor, antd, router, query)
- ES2022 target with Terser minification
- Source maps enabled for debugging

### Core Domain Services
- **Invoices**: Full CRUD, workflow management (`workflow.ts`), document attachments
- **Payments**: Transaction tracking, partial payments, bank reconciliation
- **Contractors**: Supplier/payer management with INN validation
- **Projects**: Project tracking with address and budget management
- **Admin**: User management, workflow configuration, role management

## MCP Servers

Configured MCP servers (`.mcp.json`):
- **supabase-postgrest**: Direct database access via PostgREST
- **context7**: Documentation retrieval for libraries
- **playwright**: Browser automation
- **sequential-thinking**: Problem-solving assistance

## Implementation Notes

- **Code Organization**: Maximum 600 lines per file
- **Excel Export**: Dynamic imports of `xlsx` library for performance
- **UI Language**: Russian for user-facing text, English for code comments
- **Component Library**: Ant Design Pro Components with custom theme
- **Form Validation**: Ant Design Form with async validation support
- **Date Handling**: Day.js with Russian locale
- **File Uploads**: Supabase Storage with 10MB limit per file

## Testing

**Note**: No test framework is currently configured. When implementing tests:
- Check package.json for any test-related scripts before adding a testing framework
- Consider using Vitest for compatibility with Vite configuration
- Place tests adjacent to source files using `.test.ts` or `.spec.ts` naming convention

## Performance Optimization

- **Code Splitting**: Manual chunks configured for vendor, antd, router, and query libraries
- **Lazy Loading**: All routes are lazy-loaded to reduce initial bundle size
- **Dynamic Imports**: xlsx library is dynamically imported for Excel export functionality
- **Optimized Dependencies**: Pre-bundled critical dependencies in vite config

## Development Guidelines

### Console Logging
**ВАЖНО**: При разработке и отладке функционала обязательно добавляйте детальное логирование в консоль браузера:

1. **Логирование основных действий**:
   - Начало и завершение операций CRUD
   - Загрузка данных из API
   - Обработка пользовательских действий (клики, отправка форм)
   - Изменение состояния компонентов

2. **Формат логирования**:
   ```javascript
   console.log('[ComponentName.methodName] Описание действия:', {
     параметр1: значение1,
     параметр2: значение2,
     // детальная информация для отладки
   });
   ```

3. **Обязательные места для логирования**:
   - API запросы и ответы
   - Обработка ошибок
   - Валидация форм
   - Загрузка и обработка файлов
   - Навигация и роутинг
   - Изменения в хранилищах состояния

4. **Пример логирования**:
   ```javascript
   // В хуках
   console.log('[useCreateInvoice] Создание счета:', data);

   // В компонентах
   console.log('[InvoiceCreate.handleSubmit] Отправка формы:', values);

   // При ошибках
   console.error('[InvoiceCreate.handleSubmit] Ошибка создания счета:', error);
   ```

Это упрощает отладку и помогает быстро находить проблемы в production среде.

## Knip Configuration

The project uses Knip for dead code detection (`knip.json`):
- Entry points: `src/main.tsx`, `src/App.tsx`, `src/app/router.tsx`
- Ignored patterns: optimized queries, test files, dashboard services
- Run `npm run knip` to detect unused code
- Run `npm run knip:fix` to auto-remove unused exports

## Environment Variables

```env
VITE_SUPABASE_URL=http://31.128.51.210:8002
VITE_SUPABASE_ANON_KEY=<jwt-token>
VITE_STORAGE_BUCKET=http://31.128.51.210:8002/storage/v1
VITE_APP_NAME=PayHub
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Система управления закупками и платежами
VITE_API_TIMEOUT=30000
VITE_API_RETRY_COUNT=3
VITE_ENABLE_REALTIME=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_EXCEL_EXPORT=true
VITE_DEV_MODE=false
VITE_SHOW_DEBUG_INFO=false
```

## Key Dependencies

- **React 18** + **TypeScript 5.8** - Core framework
- **Vite 7** - Build tool and dev server
- **Ant Design 5** + **Pro Components** - UI library
- **TanStack Query 5** - Server state management
- **Zustand 4.4** - Client state management
- **React Router 6** - Routing
- **Supabase JS** - Backend integration
- **Day.js** - Date handling
- **xlsx** - Excel export functionality

## Business Logic

The system handles procurement and payment workflows with the following status models:

### Invoice Statuses
- `draft` - Initial state
- `pending` - Under approval
- `approved` - Approved for payment
- `paid` - Payment completed
- `rejected` - Rejected
- `cancelled` - Cancelled

### Payment Statuses
- `pending` - Awaiting processing
- `processing` - Being processed
- `completed` - Successfully completed
- `failed` - Failed
- `cancelled` - Cancelled

### Workflow System
- Configurable approval routes with multiple steps
- Quorum-based approval for critical decisions
- Automatic notifications on status changes
- Escalation mechanisms for delayed approvals