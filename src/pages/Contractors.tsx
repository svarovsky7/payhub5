import React from 'react'
import { Card, Empty, Typography } from 'antd'
import { TeamOutlined } from '@ant-design/icons'

const { Title } = Typography

const ContractorsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <TeamOutlined /> Контрагенты
      </Title>
      <Card>
        <Empty
          description="Страница контрагентов в разработке"
          style={{ padding: '40px 0' }}
        />
      </Card>
    </div>
  )
}

export default ContractorsPage