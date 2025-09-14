import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PageContainer, ProLayout } from '@ant-design/pro-components';
import { ConfigProvider, Dropdown, message, Select, Spin, Tag } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import * as Icons from '@ant-design/icons';
import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';

// Настройка dayjs
import updateLocale from 'dayjs/plugin/updateLocale';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Компоненты и хуки
import { AuthProvider, useAuthStore } from './models/auth';
import { routes } from './config/routes';
import { useRolesList } from './services/hooks/useRoles';

// Страницы (ленивая загрузка)
import Login from './pages/Login';
import Register from './pages/Register';

const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const InvoiceCreate = lazy(() => import('./pages/InvoiceCreate'));
const Payments = lazy(() => import('./pages/Payments').catch(() => ({ default: () => <div>Страница платежей в разработке</div> })));
const PaymentsPending = lazy(() => import('./pages/PaymentsPending').catch(() => ({ default: () => <div>Страница ожидающих платежей в разработке</div> })));
const Contractors = lazy(() => import('./pages/Contractors').catch(() => ({ default: () => <div>Страница контрагентов в разработке</div> })));
const Suppliers = lazy(() => import('./pages/Suppliers').catch(() => ({ default: () => <div>Страница поставщиков в разработке</div> })));
const Payers = lazy(() => import('./pages/Payers').catch(() => ({ default: () => <div>Страница плательщиков в разработке</div> })));
const Admin = lazy(() => import('./pages/Admin/index'));
const Profile = lazy(() => import('./pages/Profile'));
const Approvals = lazy(() => import('./pages/Approvals/ApprovalsPage'));

// Стили
import './styles/global.css';

// Настройка dayjs
dayjs.extend(updateLocale);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.locale('ru');

// Настройка TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      gcTime: 1000 * 60 * 10, // 10 минут
      retry: 3,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
      },
    },
    mutations: {
      onError: (error: any) => {
        message.error(error.message || 'Произошла ошибка');
      },
    },
  },
});


// Защищенный роут
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Компонент загрузки
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '400px' 
  }}>
    <Spin size="large" />
  </div>
);

// Основной лейаут
const MainLayout: React.FC = () => {
  const { user, signOut, setTestRole, testRole } = useAuthStore();
  const { data: roles, isLoading: rolesLoading } = useRolesList();
  const location = useLocation();
  const filteredRoutes = routes;

  useEffect(() => {
  }, [location, user]);

  // Преобразуем иконки из строк в компоненты
  const transformRoutes = (routes: any[]): any[] => {
    return routes.map(route => {
      const transformed: any = { ...route };
      
      // Преобразуем строковые иконки в JSX
      if (typeof route.icon === 'string' && (Icons as any)[route.icon]) {
        const IconComponent = (Icons as any)[route.icon];
        transformed.icon = <IconComponent />;
      }
      
      // Рекурсивно обрабатываем вложенные маршруты
      if (route.routes) {
        transformed.routes = transformRoutes(route.routes);
      }
      
      return transformed;
    });
  };

  const transformedRoutes = transformRoutes(filteredRoutes);

  return (
    <ProLayout
      title="PayHub"
      logo="/payhub-logo.svg"
      fixSiderbar
      fixedHeader
      layout="mix"
      splitMenus={false}
      contentWidth="Fluid"
      navTheme="light"
      primaryColor="#1890ff"
      route={{
        path: '/',
        routes: transformedRoutes,
      }}
      location={{
        pathname: location.pathname,
      }}
      menu={{
        locale: false,
        defaultOpenAll: false,
        autoClose: false,
      }}
      avatarProps={{
        src: user?.avatar_url,
        title: user?.full_name || user?.email,
        size: 'small',
        render: (props, dom) => {
          return (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile-info',
                    label: (
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {user?.full_name || 'Пользователь'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Роль: {testRole || user?.role || 'user'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {user?.email}
                        </div>
                      </div>
                    ),
                    disabled: true,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'profile',
                    label: 'Профиль',
                    icon: <UserOutlined />,
                    onClick: () => {
                      window.location.href = '/profile';
                    },
                  },
                  {
                    key: 'settings',
                    label: 'Настройки',
                    icon: <SettingOutlined />,
                    onClick: () => {
                      window.location.href = '/settings';
                    },
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    label: 'Выйти',
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: async () => {
                      await signOut();
                      window.location.href = '/login';
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              {dom}
            </Dropdown>
          );
        },
      }}
      actionsRender={() => [
        // Переключатель ролей для тестирования
        <div key="role-switcher" style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
          <span style={{ marginRight: 8, color: '#666' }}>Тестовая роль:</span>
          <Select
            value={testRole || 'user'}
            onChange={async (value) => {
              const hide = message.loading('Изменение роли...', 0);
              try {
                const result = await setTestRole(value);
                hide();
                if (result) {
                  message.success(`Роль изменена на: ${value}`);
                  // Ожидаем немного и перезагружаем страницу для полного применения роли
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                } else {
                  message.error('Не удалось изменить роль');
                }
              } catch (error) {
                hide();
                message.error('Ошибка при изменении роли');
              }
            }}
            style={{ width: 250 }}
            loading={rolesLoading}
            placeholder="Выберите роль"
            options={
              roles?.map(role => ({
                value: role.code,
                label: (
                  <>
                    <Tag color={role.is_active ? 'blue' : 'default'}>
                      {role.code}
                    </Tag>
                    {role.name}
                  </>
                ),
                disabled: !role.is_active
              })) || []
            }
          />
        </div>
      ]}
      menuFooterRender={(props) => {
        if (props?.collapsed) {return undefined;}
        return (
          <div
            style={{
              textAlign: 'center',
              paddingBlockStart: 12,
            }}
          >
            <div>© 2025 PayHub</div>
            <div>Версия 1.0.0</div>
          </div>
        );
      }}
      onMenuHeaderClick={() => {
        window.location.href = '/';
      }}
      menuItemRender={(item, dom) => (
        <a
          onClick={() => {
            if (item.path) {
              window.location.href = item.path;
            }
          }}
        >
          {dom}
        </a>
      )}
      breadcrumbRender={(routers = []) => [
        {
          path: '/',
          breadcrumbName: 'Главная',
        },
        ...routers,
      ]}
    >
      <PageContainer>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/invoices" replace />} />
            <Route path="/invoices" element={<Navigate to="/invoices/list" replace />} />
            <Route path="/invoices/list" element={<Invoices />} />
            <Route path="/invoices/create" element={<InvoiceCreate />} />
            <Route path="/invoices/:id" element={<InvoiceView />} />
            <Route path="/payments" element={<Navigate to="/payments/list" replace />} />
            <Route path="/payments/list" element={<Payments />} />
            <Route path="/payments/pending" element={<PaymentsPending />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/contractors" element={<Navigate to="/contractors/all" replace />} />
            <Route path="/contractors/all" element={<Contractors />} />
            <Route path="/contractors/suppliers" element={<Suppliers />} />
            <Route path="/contractors/payers" element={<Payers />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<div style={{ padding: 24, textAlign: 'center' }}>
              <h1>404 - Страница не найдена</h1>
              <p>Запрашиваемая страница не существует или находится в разработке</p>
              <a href="/invoices">Вернуться на главную</a>
            </div>} />
          </Routes>
        </Suspense>
      </PageContainer>
    </ProLayout>
  );
};

// Компонент для управления загрузкой после AuthProvider
const AppContent: React.FC = () => {
  const initialized = useAuthStore((state) => state.isInitialized);
  const loading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
  }, [initialized, loading]);

  if (!initialized || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

// Главный компонент приложения
function App() {
  useEffect(() => {
    
    // Логгирование ошибок консоли (отключено из-за рекурсии)
    // const originalError = console.error;
    // console.error = (...args) => {
    //   originalError.apply(console, args);
    // };

    return () => {
      // console.error = originalError;
    };
  }, []);

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;