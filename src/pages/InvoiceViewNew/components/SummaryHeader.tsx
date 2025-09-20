import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Space, Tag, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  HomeOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined
} from '@ant-design/icons'

const { Title } = Typography

interface SummaryHeaderProps {
  invoice: any
  isEditing: boolean
  hasChanges: boolean
  showReturnButton?: boolean
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({
  invoice,
  isEditing,
  hasChanges,
  showReturnButton,
  onSave,
  onCancel,
  onEdit
}) => {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default'
      case 'pending': return 'processing'
      case 'partially_paid': return 'warning'
      case 'paid': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик'
      case 'pending': return 'В ожидании'
      case 'partially_paid': return 'Частично оплачен'
      case 'paid': return 'Оплачен'
      case 'cancelled': return 'Отменён'
      default: return status
    }
  }

  return (
    <>
      <div style={{
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/invoices')}>Счета</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            {invoice?.invoice_number || 'Загрузка...'}
          </Breadcrumb.Item>
        </Breadcrumb>

        {showReturnButton && (
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/payments')}
          >
            Вернуться к платежам
          </Button>
        )}
      </div>

      <div style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={2} style={{ margin: 0 }}>
            Счет {invoice?.invoice_number}
          </Title>
          {invoice?.internal_number && (
            <Tag color="blue">
              Внутр. №{invoice.internal_number}
            </Tag>
          )}
          <Tag color={getStatusColor(invoice?.status)}>
            {getStatusText(invoice?.status)}
          </Tag>
        </div>

        <Space>
          {isEditing ? (
            <>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSave}
                disabled={!hasChanges}
              >
                Сохранить
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={onCancel}
              >
                Отменить
              </Button>
            </>
          ) : (
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
            >
              Редактировать
            </Button>
          )}
        </Space>
      </div>
    </>
  )
}