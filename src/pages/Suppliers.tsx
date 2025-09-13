import React from 'react'
import { Card, Empty, Typography } from 'antd'
import { ShopOutlined } from '@ant-design/icons'

const { Title } = Typography

const SuppliersPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <ShopOutlined /> Поставщики
      </Title>
      <Card>
        <Empty
          description="Страница поставщиков в разработке"
          style={{ padding: '40px 0' }}
        />
      </Card>
    </div>
  )
}

export default SuppliersPage