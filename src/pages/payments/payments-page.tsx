import React from 'react'
import {Route, Routes} from 'react-router-dom'
import {PageHeader} from '@/components/ui/page-header'
import {Card, Empty} from 'antd'

const PaymentsInvoicesPage: React.FC = () => (
    <Card>
        <Empty description="Счета к оплате"/>
    </Card>
)

const PaymentsTransactionsPage: React.FC = () => (
    <Card>
        <Empty description="Транзакции"/>
    </Card>
)

const PaymentsBudgetPage: React.FC = () => (
    <Card>
        <Empty description="Бюджет"/>
    </Card>
)

const PaymentsOverviewPage: React.FC = () => (
    <div>
        <PageHeader title="Платежи" subtitle="Управление платежами и финансами"/>
        <Card>
            <Empty description="Обзор платежей"/>
        </Card>
    </div>
)

const PaymentsPage: React.FC = () => {
    return (
        <Routes>
            <Route index element={<PaymentsOverviewPage/>}/>
            <Route path="invoices" element={<PaymentsInvoicesPage/>}/>
            <Route path="transactions" element={<PaymentsTransactionsPage/>}/>
            <Route path="budget" element={<PaymentsBudgetPage/>}/>
        </Routes>
    )
}

export default PaymentsPage