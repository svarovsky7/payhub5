import React, {useEffect} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {
    ProCard,
    ProForm,
    ProFormDatePicker,
    ProFormDigit,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
} from '@ant-design/pro-components'
import {Button, Col, message, Row, Space, Spin, Typography} from 'antd'
import {ArrowLeftOutlined, SaveOutlined} from '@ant-design/icons'
import {useInvoice, useUpdateInvoice} from '@/services/hooks/useInvoices'
import {useContractors} from '@/services/hooks/useContractors'
import {useProjects} from '@/services/hooks/useProjects'
import {useInvoiceTypes} from '@/services/hooks/useInvoiceTypes'
import {useMaterialResponsiblePersons} from '@/services/hooks/useMaterialResponsiblePersons'
import type {InvoiceUpdate} from '@/services/supabase'
import dayjs from 'dayjs'

const {Title} = Typography

export const InvoiceEdit: React.FC = () => {
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [form] = ProForm.useForm()

    // Загрузка данных счета
    const {data: invoice, isLoading: isLoadingInvoice} = useInvoice(id)

    // Загрузка справочников
    const {data: contractors = [], isLoading: isLoadingContractors} = useContractors()
    const {data: projects = [], isLoading: isLoadingProjects} = useProjects()
    const {data: invoiceTypes = [], isLoading: isLoadingTypes} = useInvoiceTypes()
    const {data: molPersons = [], isLoading: isLoadingMOL} = useMaterialResponsiblePersons()

    // Мутация для обновления
    const updateInvoiceMutation = useUpdateInvoice()

    // Заполнение формы при загрузке данных
    useEffect(() => {
        if (invoice) {
            console.log('[InvoiceEdit] Заполнение формы данными счета:', invoice)
            form.setFieldsValue({
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : undefined,
                supplier_id: invoice.supplier_id,
                payer_id: invoice.payer_id,
                project_id: invoice.project_id,
                type_id: invoice.type_id,
                material_responsible_person_id: invoice.material_responsible_person_id,
                description: invoice.description,
                priority: invoice.priority,
                delivery_days: invoice.delivery_days,
                amount_net: invoice.amount_net,
                vat_rate: invoice.vat_rate || 20,
                vat_amount: invoice.vat_amount,
                total_amount: invoice.total_amount,
            })
        }
    }, [invoice, form])

    // Обработка сохранения
    const handleSave = async (values: any) => {
        try {
            console.log('[InvoiceEdit.handleSave] Сохранение изменений:', values)

            const updateData: InvoiceUpdate = {
                invoice_number: values.invoice_number,
                invoice_date: values.invoice_date ? dayjs(values.invoice_date).format('YYYY-MM-DD') : undefined,
                supplier_id: values.supplier_id,
                payer_id: values.payer_id,
                project_id: values.project_id,
                type_id: values.type_id,
                material_responsible_person_id: values.material_responsible_person_id,
                description: values.description,
                priority: values.priority,
                delivery_days: values.delivery_days,
                amount_net: values.amount_net,
                vat_rate: values.vat_rate,
                vat_amount: values.vat_amount,
                total_amount: values.total_amount,
            }

            await updateInvoiceMutation.mutateAsync({id: id, updates: updateData})
            message.success('Счет успешно обновлен')
            navigate(`/invoices/${id}`)
        } catch (error) {
            console.error('[InvoiceEdit.handleSave] Ошибка сохранения:', error)
            message.error('Ошибка при сохранении счета')
        }
    }

    // Пересчет сумм при изменении
    const handleAmountChange = () => {
        const values = form.getFieldsValue()
        const amountNet = values.amount_net || 0
        const vatRate = values.vat_rate || 20

        const vatAmount = amountNet * (vatRate / 100)
        const totalAmount = amountNet + vatAmount

        form.setFieldsValue({
            vat_amount: vatAmount,
            total_amount: totalAmount,
        })
    }

    if (isLoadingInvoice || isLoadingContractors || isLoadingProjects || isLoadingTypes || isLoadingMOL) {
        return (
            <div style={{textAlign: 'center', padding: '50px'}}>
                <Spin size="large" tip="Загрузка..."/>
            </div>
        )
    }

    if (!invoice) {
        return (<ProCard>
                <Typography.Text type="danger">Счет не найден</Typography.Text>
                <Button onClick={() => void navigate('/invoices')} style={{marginTop: 16}}>
                    Вернуться к списку
                </Button>
            </ProCard>
        )
    }

    // Фильтрация поставщиков и плательщиков
    const suppliers = contractors.filter(c => c.type_id === 4 ?? c.type_id === 1)
    const payers = contractors.filter(c => c.type_id === 2 ?? c.type_id === 1)

    return (<div style={{padding: '24px'}}>
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Title level={3}>Редактирование счета №{invoice.invoice_number}</Title>
                    <Button icon={<ArrowLeftOutlined/>} onClick={() => void navigate(`/invoices/${id}`)}>
                        Назад
                    </Button>
                </div>

                <ProForm
                    form={form}
                    onFinish={handleSave}
                    submitter={{
                        render: (props) => (<Space>
                                <Button onClick={() => void navigate(`/invoices/${id}`)}>
                                    Отмена
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined/>}
                                    onClick={() => props.form?.submit()}
                                    loading={updateInvoiceMutation.isPending}
                                >
                                    Сохранить
                                </Button>
                            </Space>
                        ),
                    }}
                >
                    <ProCard title="Основная информация" bordered>
                        <Row gutter={16}>
                            <Col span={8}>
                                <ProFormText
                                    name="invoice_number"
                                    label="Номер счета"
                                    rules={[{required: true, message: 'Введите номер счета'}]}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormDatePicker
                                    name="invoice_date"
                                    label="Дата счета"
                                    width="100%"
                                    rules={[{required: true, message: 'Выберите дату счета'}]}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormSelect
                                    name="priority"
                                    label="Приоритет"
                                    options={[
                                        {label: 'Низкий', value: 'low'},
                                        {label: 'Средний', value: 'normal'},
                                        {label: 'Высокий', value: 'high'},
                                        {label: 'Срочный', value: 'urgent'},
                                    ]}
                                />
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <ProFormSelect
                                    name="supplier_id"
                                    label="Поставщик"
                                    showSearch
                                    rules={[{required: true, message: 'Выберите поставщика'}]}
                                    options={suppliers.map(s => ({
                                        label: s.name,
                                        value: s.id,
                                    }))}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormSelect
                                    name="payer_id"
                                    label="Плательщик"
                                    showSearch
                                    rules={[{required: true, message: 'Выберите плательщика'}]}
                                    options={payers.map(p => ({
                                        label: p.name,
                                        value: p.id,
                                    }))}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormSelect
                                    name="project_id"
                                    label="Проект"
                                    showSearch
                                    rules={[{required: true, message: 'Выберите проект'}]}
                                    options={projects.map(p => ({
                                        label: p.name,
                                        value: p.id,
                                    }))}
                                />
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <ProFormSelect
                                    name="type_id"
                                    label="Тип счета"
                                    rules={[{required: true, message: 'Выберите тип счета'}]}
                                    options={invoiceTypes.map(t => ({
                                        label: t.name,
                                        value: t.id,
                                    }))}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormSelect
                                    name="material_responsible_person_id"
                                    label="МОЛ (Материально ответственное лицо)"
                                    showSearch
                                    options={molPersons.map(m => ({
                                        label: `${m.full_name} ${m.position ? `(${m.position})` : ''}`,
                                        value: m.id,
                                    }))}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormDigit
                                    name="delivery_days"
                                    label="Поставка дней после оплаты"
                                    min={0}
                                    fieldProps={{precision: 0}}
                                />
                            </Col>
                        </Row>

                        <ProFormTextArea
                            name="description"
                            label="Описание"
                            placeholder="Введите описание счета"
                        />
                    </ProCard>

                    <ProCard title="Финансовая информация" bordered>
                        <Row gutter={16}>
                            <Col span={8}>
                                <ProFormDigit
                                    name="amount_net"
                                    label="Сумма без НДС"
                                    rules={[{required: true, message: 'Введите сумму'}]}
                                    min={0}
                                    fieldProps={{
                                        precision: 2,
                                        onChange: handleAmountChange,
                                    }}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormDigit
                                    name="vat_rate"
                                    label="Ставка НДС (%)"
                                    min={0}
                                    max={100}
                                    fieldProps={{
                                        precision: 0,
                                        onChange: handleAmountChange,
                                    }}
                                />
                            </Col>
                            <Col span={8}>
                                <ProFormDigit
                                    name="vat_amount"
                                    label="Сумма НДС"
                                    disabled
                                    fieldProps={{precision: 2}}
                                />
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <ProFormDigit
                                    name="total_amount"
                                    label="Общая сумма"
                                    disabled
                                    fieldProps={{precision: 2}}
                                />
                            </Col>
                        </Row>
                    </ProCard>
                </ProForm>
            </Space>
        </div>
    )
}