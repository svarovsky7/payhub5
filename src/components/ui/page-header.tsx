import React from 'react'
import { Breadcrumb, Button, Space } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface BreadcrumbItem {
  title: string
  path?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  onBack?: () => void
  showBack?: boolean
  extra?: React.ReactNode
  children?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  onBack,
  showBack = false,
  extra,
  children,
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const breadcrumbItems = breadcrumbs?.map(item => ({
    title: item.path ? (
      <a onClick={() => item.path && navigate(item.path)}>{item.title}</a>
    ) : (
      item.title
    ),
  }))

  return (
    <div className="payhub-card" style={{ marginBottom: 24 }}>
      {breadcrumbs && (
        <Breadcrumb 
          items={breadcrumbItems}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: children ? 16 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {showBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginRight: 16 }}
            />
          )}
          
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px',
              fontWeight: 600,
              color: '#262626',
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ 
                margin: '4px 0 0 0',
                color: '#8c8c8c',
                fontSize: '14px',
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {extra && (
          <Space>
            {extra}
          </Space>
        )}
      </div>
      
      {children && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader