/**
 * Theme Preview Component
 * Shows live preview of theme changes with various UI components
 */

import React from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Input,
  Menu,
  notification,
  Progress,
  Radio,
  Rate,
  Row,
  Select,
  Slider,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  TimePicker,
  Tooltip,
  Typography
} from 'antd'
import {
  FileOutlined,
  HeartOutlined,
  HomeOutlined,
  SettingOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { CustomThemeConfig } from '@/models/theme'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select
const { Step } = Steps

interface ThemePreviewProps {
  theme?: CustomThemeConfig
  className?: string
  style?: React.CSSProperties
}

// Sample data for table
const tableData = [
  {
    key: '1',
    name: 'ООО "Стройматериалы"',
    amount: '125 000 ₽',
    status: 'approved',
    date: '15.03.2024'
  },
  {
    key: '2',
    name: 'ИП Иванов А.А.',
    amount: '75 500 ₽',
    status: 'pending',
    date: '16.03.2024'
  },
  {
    key: '3',
    name: 'ООО "ТехСервис"',
    amount: '98 200 ₽',
    status: 'paid',
    date: '14.03.2024'
  }
]

const tableColumns = [
  {
    title: 'Поставщик',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Сумма',
    dataIndex: 'amount',
    key: 'amount',
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const statusConfig = {
        approved: { color: 'success', text: 'Одобрен' },
        pending: { color: 'warning', text: 'В ожидании' },
        paid: { color: 'processing', text: 'Оплачен' }
      }
      const config = statusConfig[status as keyof typeof statusConfig]
      return <Tag color={config.color}>{config.text}</Tag>
    },
  },
  {
    title: 'Дата',
    dataIndex: 'date',
    key: 'date',
  }
]

// Menu items
const menuItems = [
  {
    key: '1',
    icon: <HomeOutlined />,
    label: 'Главная',
  },
  {
    key: '2',
    icon: <FileOutlined />,
    label: 'Счета',
    children: [
      { key: '2-1', label: 'Все счета' },
      { key: '2-2', label: 'Создать счет' },
    ]
  },
  {
    key: '3',
    icon: <TeamOutlined />,
    label: 'Поставщики',
  },
  {
    key: '4',
    icon: <SettingOutlined />,
    label: 'Настройки',
  },
]

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  className,
  style
}) => {
  console.log('[ThemePreview] Rendering preview with theme:', theme?.name)

  return (
    <div className={className} style={style}>
      <div style={{ padding: '24px', background: theme?.colors.backgroundSecondary }}>
        {/* Header Section */}
        <Card 
          title="Предварительный просмотр темы" 
          style={{ marginBottom: 24 }}
          extra={
            <Space>
              <Badge count={5}>
                <Button icon={<UserOutlined />}>
                  Профиль
                </Button>
              </Badge>
              <Button type="primary" icon={<SettingOutlined />}>
                Настройки
              </Button>
            </Space>
          }
        >
          <Paragraph>
            Этот раздел демонстрирует, как будут выглядеть различные компоненты интерфейса
            с применяемой темой. Здесь вы можете оценить сочетания цветов, типографику и общий стиль.
          </Paragraph>
        </Card>

        {/* Typography Section */}
        <Card title="Типографика" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Title level={1} style={{ margin: 0 }}>Заголовок H1</Title>
              <Title level={2} style={{ margin: '8px 0' }}>Заголовок H2</Title>
              <Title level={3} style={{ margin: '8px 0' }}>Заголовок H3</Title>
              <Title level={4} style={{ margin: '8px 0' }}>Заголовок H4</Title>
            </div>
            
            <div>
              <Paragraph>
                <Text>Обычный текст.</Text> <Text type="secondary">Дополнительный текст.</Text>{' '}
                <Text type="success">Успешный результат.</Text> <Text type="warning">Предупреждение.</Text>{' '}
                <Text type="danger">Ошибка.</Text> <Text disabled>Отключенный текст.</Text>
              </Paragraph>
              
              <Paragraph>
                <Text strong>Жирный текст</Text>, <Text italic>курсив</Text>, 
                <Text underline>подчеркивание</Text>, <Text delete>зачеркнутый</Text>, 
                <Text code>код</Text>, <Text keyboard>Ctrl+C</Text>.
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* Form Controls Section */}
        <Card title="Элементы форм" style={{ marginBottom: 24 }}>
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong>Кнопки</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      <Button type="primary">Основная</Button>
                      <Button>По умолчанию</Button>
                      <Button type="dashed">Пунктирная</Button>
                      <Button type="text">Текстовая</Button>
                      <Button type="link">Ссылка</Button>
                      <Button danger>Опасность</Button>
                    </Space>
                  </div>
                </div>

                <div>
                  <Text strong>Поля ввода</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Input placeholder="Обычное поле ввода" />
                      <Input.Password placeholder="Пароль" />
                      <TextArea rows={3} placeholder="Многострочное поле" />
                    </Space>
                  </div>
                </div>

                <div>
                  <Text strong>Выбор</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Select placeholder="Выберите опцию" style={{ width: '100%' }}>
                        <Option value="option1">Опция 1</Option>
                        <Option value="option2">Опция 2</Option>
                        <Option value="option3">Опция 3</Option>
                      </Select>
                      
                      <DatePicker placeholder="Выберите дату" style={{ width: '100%' }} />
                      <TimePicker placeholder="Выберите время" style={{ width: '100%' }} />
                    </Space>
                  </div>
                </div>
              </Space>
            </Col>

            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong>Переключатели</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space direction="vertical">
                      <Switch defaultChecked /> Переключатель
                      <Radio.Group defaultValue="a">
                        <Radio value="a">Вариант A</Radio>
                        <Radio value="b">Вариант B</Radio>
                        <Radio value="c">Вариант C</Radio>
                      </Radio.Group>
                      
                      <Checkbox.Group>
                        <Checkbox value="1">Опция 1</Checkbox>
                        <Checkbox value="2">Опция 2</Checkbox>
                        <Checkbox value="3">Опция 3</Checkbox>
                      </Checkbox.Group>
                    </Space>
                  </div>
                </div>

                <div>
                  <Text strong>Слайдеры и рейтинги</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Slider defaultValue={30} />
                      <Rate defaultValue={3} />
                      <Progress percent={70} />
                    </Space>
                  </div>
                </div>

                <div>
                  <Text strong>Теги и аватары</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      <Tag>Тег</Tag>
                      <Tag color="success">Успех</Tag>
                      <Tag color="warning">Предупреждение</Tag>
                      <Tag color="error">Ошибка</Tag>
                      <Avatar icon={<UserOutlined />} />
                      <Avatar style={{ backgroundColor: '#f56a00' }}>U</Avatar>
                    </Space>
                  </div>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Data Display Section */}
        <Card title="Отображение данных" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Table */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Таблица</Text>
              <Table 
                dataSource={tableData} 
                columns={tableColumns} 
                pagination={false}
                size="small"
              />
            </div>

            {/* Steps */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Этапы процесса</Text>
              <Steps current={1} size="small">
                <Step title="Создание" description="Счет создан" />
                <Step title="Проверка" description="В процессе проверки" />
                <Step title="Утверждение" description="Ожидает утверждения" />
                <Step title="Оплата" description="Ожидает оплаты" />
              </Steps>
            </div>

            {/* Breadcrumb */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Хлебные крошки</Text>
              <Breadcrumb>
                <Breadcrumb.Item>
                  <HomeOutlined />
                </Breadcrumb.Item>
                <Breadcrumb.Item>Администрирование</Breadcrumb.Item>
                <Breadcrumb.Item>Настройки темы</Breadcrumb.Item>
              </Breadcrumb>
            </div>
          </Space>
        </Card>

        {/* Alerts Section */}
        <Card title="Уведомления и сообщения" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert message="Информационное сообщение" type="info" showIcon />
            <Alert message="Успешное выполнение операции" type="success" showIcon />
            <Alert message="Предупреждение о возможных проблемах" type="warning" showIcon />
            <Alert message="Критическая ошибка в системе" type="error" showIcon />
          </Space>
        </Card>

        {/* Navigation Menu */}
        <Card title="Навигационное меню" style={{ marginBottom: 24 }}>
          <Menu mode="horizontal" defaultSelectedKeys={['1']} items={menuItems} />
        </Card>

        {/* Interactive Elements */}
        <Card title="Интерактивные элементы">
          <Row gutter={[24, 16]}>
            <Col span={8}>
              <Tooltip title="Это всплывающая подсказка">
                <Button>Наведите курсор</Button>
              </Tooltip>
            </Col>
            
            <Col span={8}>
              <Button 
                icon={<HeartOutlined />} 
                onClick={() => {
                  console.log('[ThemePreview] Like button clicked')
                  // Mock notification
                  notification.info({
                    message: 'Уведомление',
                    description: 'Это пример уведомления с текущей темой',
                    placement: 'topRight'
                  })
                }}
              >
                Нравится
              </Button>
            </Col>
            
            <Col span={8}>
              <Space>
                <StarOutlined style={{ fontSize: '18px', color: theme?.colors.warning }} />
                <Text>Избранное</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        <Divider>
          <Text type="secondary">Конец предварительного просмотра</Text>
        </Divider>
      </div>
    </div>
  )
}