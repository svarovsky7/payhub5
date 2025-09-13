import type {MenuDataItem} from '@ant-design/pro-components';

// Определение маршрутов и пунктов меню
export const routes: MenuDataItem[] = [
    {
        path: '/',
        redirect: '/invoices',
    },
    {
        path: '/invoices',
        name: 'Счета',
        icon: 'FileTextOutlined',
        component: './pages/Invoices',
    },
    {
        path: '/payments',
        name: 'Платежи',
        icon: 'DollarCircleOutlined',
        component: './pages/Payments',
    },
    {
        path: '/approvals',
        name: 'Согласование',
        icon: 'CheckCircleOutlined',
        component: './pages/Approvals/ApprovalsPage',
    },
    {
        path: '/admin',
        name: 'Администрирование',
        icon: 'SettingOutlined',
        component: './pages/Admin',
    },
    {
        path: '/profile',
        name: 'Профиль',
        icon: 'UserOutlined',
        component: './pages/Profile',
        hideInMenu: true,
    },
];

// Функция для получения плоского списка маршрутов
export function getFlatRoutes(menuData: MenuDataItem[] = routes): MenuDataItem[] {
    let flatRoutes: MenuDataItem[] = [];

    menuData.forEach(item => {
        if (item.path) {
            flatRoutes.push(item);
        }
        if (item.routes) {
            flatRoutes = flatRoutes.concat(getFlatRoutes(item.routes));
        }
    });

    return flatRoutes;
}


// Хлебные крошки
function getBreadcrumbNameMap(): Record<string, string> {
    const breadcrumbNameMap: Record<string, string> = {};

    const loop = (menuData: MenuDataItem[], parentPath = '') => {
        menuData.forEach(item => {
            const path = item.path || '';
            const fullPath = parentPath ? `${parentPath}${path}` : path;

            if (item.name) {
                breadcrumbNameMap[fullPath] = item.name;
            }

            if (item.routes) {
                loop(item.routes, fullPath);
            }
        });
    };

    loop(routes);
    return breadcrumbNameMap;
}

export default routes;