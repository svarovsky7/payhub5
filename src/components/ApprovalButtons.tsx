/**
 * ApprovalButtons - approve/reject action buttons
 */

import React, { useState } from 'react'
import { Button, Input, message, Modal, Popconfirm, Space } from 'antd'
import { 
  CheckOutlined, 
  CloseOutlined, 
  EditOutlined,
  SendOutlined,
  StopOutlined 
} from '@ant-design/icons'

const { TextArea } = Input

interface ApprovalButtonsProps {
  invoiceId: string
  stepId?: string
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  canApprove?: boolean
  canReject?: boolean
  canEdit?: boolean
  canSubmit?: boolean
  canCancel?: boolean
  onApprove?: (comment?: string) => Promise<void>
  onReject?: (comment: string) => Promise<void>
  onEdit?: () => void
  onSubmit?: (comment?: string) => Promise<void>
  onCancel?: (comment?: string) => Promise<void>
  loading?: boolean
  size?: 'small' | 'middle' | 'large'
}

export const ApprovalButtons: React.FC<ApprovalButtonsProps> = ({
  invoiceId,
  stepId,
  status,
  canApprove = false,
  canReject = false,
  canEdit = false,
  canSubmit = false,
  canCancel = false,
  onApprove,
  onReject,
  onEdit,
  onSubmit,
  onCancel,
  loading = false,
  size = 'middle',
}) => {
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [submitModalVisible, setSubmitModalVisible] = useState(false)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const handleApprove = async (withComment: boolean = false) => {
    if (!onApprove) {return}
    
    try {
      setActionLoading('approve')
      await onApprove(withComment ? comment : undefined)
      setApproveModalVisible(false)
      setComment('')
      message.success('Заявка согласована')
    } catch (error) {
      message.error(error.message || 'Ошибка согласования')
    } finally {
      setActionLoading('')
    }
  }

  const handleReject = async () => {
    if (!onReject || !comment.trim()) {
      message.error('Укажите причину отклонения')
      return
    }
    
    try {
      setActionLoading('reject')
      await onReject(comment)
      setRejectModalVisible(false)
      setComment('')
      message.success('Заявка отклонена')
    } catch (error) {
      message.error(error.message || 'Ошибка отклонения')
    } finally {
      setActionLoading('')
    }
  }

  const handleSubmit = async () => {
    if (!onSubmit) {return}
    
    try {
      setActionLoading('submit')
      await onSubmit(comment || undefined)
      setSubmitModalVisible(false)
      setComment('')
      message.success('Заявка отправлена на согласование')
    } catch (error) {
      message.error(error.message || 'Ошибка отправки')
    } finally {
      setActionLoading('')
    }
  }

  const handleCancel = async () => {
    if (!onCancel) {return}
    
    try {
      setActionLoading('cancel')
      await onCancel(comment || undefined)
      setCancelModalVisible(false)
      setComment('')
      message.success('Заявка отменена')
    } catch (error) {
      message.error(error.message || 'Ошибка отмены')
    } finally {
      setActionLoading('')
    }
  }

  return (
    <>
      <Space wrap>
        {canSubmit && status === 'draft' && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setSubmitModalVisible(true)}
            loading={loading || actionLoading === 'submit'}
            size={size}
          >
            Отправить на согласование
          </Button>
        )}

        {canApprove && status === 'pending' && (
          <Space.Compact>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(false)}
              loading={loading || actionLoading === 'approve'}
              size={size}
            >
              Согласовать
            </Button>
            <Button
              type="primary"
              onClick={() => setApproveModalVisible(true)}
              loading={loading || actionLoading === 'approve'}
              size={size}
            >
              С комментарием
            </Button>
          </Space.Compact>
        )}

        {canReject && status === 'pending' && (
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={() => setRejectModalVisible(true)}
            loading={loading || actionLoading === 'reject'}
            size={size}
          >
            Отклонить
          </Button>
        )}

        {canEdit && ['draft', 'rejected'].includes(status) && (
          <Button
            icon={<EditOutlined />}
            onClick={onEdit}
            loading={loading}
            size={size}
          >
            Редактировать
          </Button>
        )}

        {canCancel && ['draft', 'pending'].includes(status) && (
          <Popconfirm
            title="Отменить заявку?"
            description="Это действие нельзя будет отменить"
            onConfirm={() => setCancelModalVisible(true)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              danger
              icon={<StopOutlined />}
              loading={loading || actionLoading === 'cancel'}
              size={size}
            >
              Отменить заявку
            </Button>
          </Popconfirm>
        )}
      </Space>

      {/* Approve with comment modal */}
      <Modal
        title="Согласовать заявку"
        open={approveModalVisible}
        onOk={() => handleApprove(true)}
        onCancel={() => {
          setApproveModalVisible(false)
          setComment('')
        }}
        okText="Согласовать"
        cancelText="Отмена"
        confirmLoading={actionLoading === 'approve'}
      >
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Добавить комментарий (необязательно)"
          rows={4}
        />
      </Modal>

      {/* Reject modal */}
      <Modal
        title="Отклонить заявку"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false)
          setComment('')
        }}
        okText="Отклонить"
        cancelText="Отмена"
        confirmLoading={actionLoading === 'reject'}
        okButtonProps={{ danger: true }}
      >
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Укажите причину отклонения *"
          rows={4}
          required
        />
      </Modal>

      {/* Submit modal */}
      <Modal
        title="Отправить на согласование"
        open={submitModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setSubmitModalVisible(false)
          setComment('')
        }}
        okText="Отправить"
        cancelText="Отмена"
        confirmLoading={actionLoading === 'submit'}
      >
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Добавить комментарий (необязательно)"
          rows={4}
        />
      </Modal>

      {/* Cancel modal */}
      <Modal
        title="Отменить заявку"
        open={cancelModalVisible}
        onOk={handleCancel}
        onCancel={() => {
          setCancelModalVisible(false)
          setComment('')
        }}
        okText="Отменить заявку"
        cancelText="Назад"
        confirmLoading={actionLoading === 'cancel'}
        okButtonProps={{ danger: true }}
      >
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Причина отмены (необязательно)"
          rows={4}
        />
      </Modal>
    </>
  )
}

export default ApprovalButtons