import React, { useState } from 'react'
import { MenuDataItem, ProLayout } from '@ant-design/pro-layout'
import {
  BellOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Dropdown, Space, theme } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/models/auth'
import { createInitials } from '@/utils/format'

const menuData: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: 'Главная',
    icon: <DashboardOutlined />,
  },
  {
    path: '/invoices',
    name: 'Счета',
    icon: <ShoppingCartOutlined />,
  },
  {
    path: '/payments',
    name: 'Платежи',
    icon: <CreditCardOutlined />,
  },
  {
    path: '/approvals',
    name: 'Согласование',
    icon: <CheckCircleOutlined />,
  },
  {
    path: '/admin',
    name: 'Администрирование',
    icon: <SettingOutlined />,
  },
]

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const { token } = theme.useToken()
  
  const [collapsed, setCollapsed] = useState(false)

  // Используем меню без фильтрации
  const filterMenuByPermissions = (menuItems: MenuDataItem[]): MenuDataItem[] => {
    return menuItems
      .map(item => {
        // Рекурсивно обрабатываем дочерние элементы
        const filteredChildren = item.children 
          ? filterMenuByPermissions(item.children)
          : undefined
        
        return {
          ...item,
          children: filteredChildren?.length ? filteredChildren : undefined,
        }
      })
      .filter(Boolean) as MenuDataItem[]
  }

  const filteredMenuData = filterMenuByPermissions(menuData)

  const handleMenuClick = (path: string) => {
    navigate(path)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Ошибка выхода:', error)
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <SettingOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      onClick: handleSignOut,
    },
  ]

  return (
    <ProLayout
      title="PayHub"
      logo={<div style={{ 
        width: 32, 
        height: 32, 
        background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>PH</div>}
      layout="mix"
      splitMenus={false}
      navTheme="light"
      headerTheme="light"
      primaryColor="#1890ff"
      fixSiderbar
      fixedHeader
      collapsed={collapsed}
      onCollapse={setCollapsed}
      collapsedButtonRender={false}
      location={{ pathname: location.pathname }}
      menuDataRender={() => filteredMenuData}
      menuItemRender={(item, defaultDom) => {
        if (!item.path) {return defaultDom}
        
        const isActive = location.pathname === item.path || 
                        (item.path !== '/' && location.pathname.startsWith(item.path))
        
        return (
          <div 
            onClick={() => handleMenuClick(item.path!)}
            style={{
              borderRadius: '6px',
              margin: '2px 8px',
              background: isActive ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(24, 144, 255, 0.3)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
            className={isActive ? 'ant-menu-item-selected' : ''}
          >
            {defaultDom}
          </div>
        )
      }}
      headerContentRender={() => (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Space size="middle">
            <Badge count={5}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ border: 'none' }}
              />
            </Badge>
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: token.borderRadius,
                transition: 'background-color 0.2s',
              }}>
                <Avatar 
                  size="small" 
                  style={{ 
                    backgroundColor: token.colorPrimary,
                    marginRight: 8,
                  }}
                >
                  {createInitials(profile?.firstName, profile?.lastName)}
                </Avatar>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 500,
                    color: token.colorText,
                  }}>
                    {profile?.firstName} {profile?.lastName}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: token.colorTextSecondary,
                  }}>
                    {profile?.position || 'Сотрудник'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </div>
      )}
      footerRender={() => (
        <div style={{ 
          textAlign: 'center', 
          color: token.colorTextSecondary,
          fontSize: '12px',
          padding: '16px',
          background: 'linear-gradient(90deg, rgba(24,144,255,0.03) 0%, rgba(64,169,255,0.03) 100%)',
          borderTop: '1px solid rgba(24,144,255,0.1)',
        }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            PayHub © 2025
          </div>
          <div>
            Система управления процессом закупок и платежей
          </div>
        </div>
      )}
      contentStyle={{
        backgroundColor: 'var(--background-color-container)',
        minHeight: 'calc(100vh - 64px)',
        padding: 0,
      }}
      siderMenuProps={{
        style: {
          backgroundColor: token.colorBgContainer,
          border: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        }
      }}
      menuProps={{
        style: {
          border: 'none',
        },
        theme: 'light',
        mode: 'inline',
      }}
    >
      <div className="fade-in" style={{ padding: '24px' }}>
        {children}
      </div>
    </ProLayout>
  )
}