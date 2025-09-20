import React, { useEffect } from 'react'
import { 
  Button, 
  Card, 
  Col, 
  Divider, 
  Form, 
  Input, 
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Typography
} from 'antd'
import { CloseOutlined, SaveOutlined } from '@ant-design/icons'
import type { WorkflowStage } from './types'
import { useRolesList } from '@/services/hooks/useRoles'

const { Title, Text } = Typography
const { TextArea } = Input

interface StageEditorProps {
  stage?: WorkflowStage
  projects?: Array<{ id: number; name: string }>
  contractors?: Array<{ id: number; name: string }>
  onSave: (stage: Partial<WorkflowStage>) => void
  onCancel: () => void
}

export const StageEditor: React.FC<StageEditorProps> = ({
  stage,
  projects = [],
  contractors = [],
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm()
  const { data: roles, isLoading: rolesLoading } = useRolesList()

  useEffect(() => {
    if (stage) {
      console.log('[StageEditor] Loading stage data:', stage)
      form.setFieldsValue({
        name: stage.name,
        description: stage.description,
        timeout_days: stage.timeout_days || 3,
        is_final: stage.is_final || false,
        assigned_roles: stage.assigned_roles,
        assigned_users: stage.assigned_users,
      })
    } else {
      form.resetFields()
    }
  }, [stage, form])

  const handleSubmit = () => {
    form.validateFields().then(values => {
      console.log('[StageEditor] Submitting stage data:', values)
      
      const stageData: Partial<WorkflowStage> = {
        name: values.name,
        description: values.description,
        timeout_days: values.timeout_days,
        is_final: values.is_final || false,
        approval_quorum: 1, // Фиксированное значение
        assigned_roles: values.assigned_roles,
        assigned_users: values.assigned_users,
      }

      if (stage) {
        stageData.id = stage.id
        stageData.position = stage.position
      }

      onSave(stageData)
    })
  }

  return (
    <Card 
      title={stage ? `Редактирование этапа: ${stage.name}` : 'Новый этап'}
      extra={
        <Space>
          <Button 
            icon={<SaveOutlined />} 
            type="primary"
            onClick={handleSubmit}
          >
            Сохранить
          </Button>
          <Button 
            icon={<CloseOutlined />}
            onClick={onCancel}
          >
            Отмена
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          timeout_days: 3,
        }}
      >
        <Title level={5}>Основные настройки</Title>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Название этапа"
              rules={[{ required: true, message: 'Введите название этапа' }]}
            >
              <Input placeholder="Например: Согласование менеджером" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="timeout_days"
              label="Срок согласования (дней)"
              rules={[{ required: true, message: 'Укажите срок' }]}
            >
              <InputNumber min={1} max={30} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Описание"
        >
          <TextArea rows={2} placeholder="Опишите задачи этого этапа" />
        </Form.Item>

        <Form.Item
          name="is_final"
          label="Финальный этап"
          valuePropName="checked"
          tooltip="После финального этапа счет считается оплаченным и не может быть изменен или удален"
        >
          <Switch 
            checkedChildren="Да" 
            unCheckedChildren="Нет"
          />
        </Form.Item>

        <Divider />

        <Title level={5}>Назначение ответственных</Title>
        
        <Form.Item
          name="assigned_roles"
          label="Роли"
        >
          <Select
            mode="multiple"
            placeholder="Выберите роли"
            loading={rolesLoading}
            options={roles?.map(role => ({
              label: role.name,
              value: role.code,
            })) || []}
          />
        </Form.Item>


      </Form>
    </Card>
  )
}