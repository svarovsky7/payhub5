import React from 'react'
import { Card, Empty, Typography } from 'antd'
import { ProjectOutlined } from '@ant-design/icons'

const { Title } = Typography

const ProjectsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <ProjectOutlined /> Проекты
      </Title>
      <Card>
        <Empty
          description="Страница проектов в разработке"
          style={{ padding: '40px 0' }}
        />
      </Card>
    </div>
  )
}

export default ProjectsPage