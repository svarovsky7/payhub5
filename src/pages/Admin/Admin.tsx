/**
 * Admin page main component
 */

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageContainer } from '@ant-design/pro-components'
import { Space, Tabs } from 'antd'
import {
  ApartmentOutlined,
  BgColorsOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'

// Import tab components
import { UsersTab } from './components/UsersTab'
import { ProjectsTab } from './components/ProjectsTab'
import { ContractorsTab } from './components/ContractorsTab'
import { EnumListsTab } from './components/EnumListsTab'
import { InvoiceTypesTab } from './components/InvoiceTypesTab'
import { StatusesTab } from './components/StatusesTab'
import { RolesTab } from './RolesTab'
import { MaterialResponsiblePersonsPage } from './MaterialResponsiblePersons'
import { WorkflowBuilderTab } from './WorkflowBuilderTab'
import { ThemeSettings } from './ThemeSettings'

const AdminPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Получаем текущую вкладку из URL параметров
  const getTabFromUrl = () => {
    const params = new URLSearchParams(location.search)
    return params.get('tab') || 'users'
  }

  const [activeTab, setActiveTab] = useState(getTabFromUrl())

  // Обновляем вкладку при изменении URL
  useEffect(() => {
    const currentTab = getTabFromUrl()
    if (currentTab !== activeTab) {
      setActiveTab(currentTab)
    }
  }, [location.search])

  // Функция для изменения вкладки с обновлением URL
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    // Обновляем URL без перезагрузки страницы
    navigate(`/admin?tab=${key}`, { replace: true })
  }

  const tabItems = [
    {
      key: 'users',
      label: (
        <Space>
          <UserOutlined />
          Пользователи
        </Space>
      ),
      children: <UsersTab />,
    },
    {
      key: 'roles',
      label: (
        <Space>
          <SafetyOutlined />
          Роли
        </Space>
      ),
      children: <RolesTab />,
    },
    {
      key: 'projects',
      label: (
        <Space>
          <ProjectOutlined />
          Проекты
        </Space>
      ),
      children: <ProjectsTab />,
    },
    {
      key: 'contractors',
      label: (
        <Space>
          <TeamOutlined />
          Поставщики
        </Space>
      ),
      children: <ContractorsTab />,
    },
    {
      key: 'material-responsible-persons',
      label: (
        <Space>
          <UserOutlined />
          МОЛ
        </Space>
      ),
      children: <MaterialResponsiblePersonsPage />,
    },
    {
      key: 'enums',
      label: (
        <Space>
          <SettingOutlined />
          Списки значений
        </Space>
      ),
      children: <EnumListsTab />,
    },
    {
      key: 'invoice-types',
      label: (
        <Space>
          <FileTextOutlined />
          Типы счетов
        </Space>
      ),
      children: <InvoiceTypesTab />,
    },
    {
      key: 'workflows',
      label: (
        <Space>
          <ApartmentOutlined />
          Процессы
        </Space>
      ),
      children: <WorkflowBuilderTab />,
    },
    {
      key: 'statuses',
      label: (
        <Space>
          <SettingOutlined />
          Статусы (счета/платежи)
        </Space>
      ),
      children: <StatusesTab />,
    },
    {
      key: 'theme',
      label: (
        <Space>
          <BgColorsOutlined />
          Настройки темы
        </Space>
      ),
      children: <ThemeSettings />,
    },
  ]

  return (
    <PageContainer
      title="Администрирование"
      subTitle="Управление пользователями, ролями и настройками системы"
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        type="card"
      />
    </PageContainer>
  )
}

export default AdminPage