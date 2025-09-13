import React from 'react'
import { Card, Empty, Typography } from 'antd'
import { BankOutlined } from '@ant-design/icons'

const { Title } = Typography

const PayersPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BankOutlined /> Плательщики
      </Title>
      <Card>
        <Empty
          description="Страница плательщиков в разработке"
          style={{ padding: '40px 0' }}
        />
      </Card>
    </div>
  )
}

export default PayersPage