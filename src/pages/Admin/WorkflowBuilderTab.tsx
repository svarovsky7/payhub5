import React from 'react'
import { App } from 'antd'
import {WorkflowBuilder} from '@/components/WorkflowBuilder'

export const WorkflowBuilderTab: React.FC = () => {
    return (
        <App>
            <WorkflowBuilder/>
        </App>
    )
}