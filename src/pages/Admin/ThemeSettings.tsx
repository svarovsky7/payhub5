/**
 * Theme Settings Page
 * Comprehensive theme management interface similar to FlutterFlow
 */

import React, {useState} from 'react'
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Divider,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Slider,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography
} from 'antd'
import {
    AppstoreOutlined,
    BgColorsOutlined,
    BorderInnerOutlined,
    CheckOutlined,
    CloseOutlined,
    CopyOutlined,
    DeleteOutlined,
    ExportOutlined,
    EyeOutlined,
    FontSizeOutlined,
    ImportOutlined,
    MoonOutlined,
    ReloadOutlined,
    SaveOutlined,
    SunOutlined
} from '@ant-design/icons'
import {PageContainer} from '@ant-design/pro-layout'

import {COLOR_PALETTES, useTheme} from '@/models/theme'
import {ColorPicker} from '@/components/theme/ColorPicker'
import {FontSelector} from '@/components/theme/FontSelector'
import {ThemePreview} from '@/components/theme/ThemePreview'
import type {CustomThemeConfig} from '@/models/theme'

const {Title, Text, Paragraph} = Typography
const {Panel} = Collapse
const {TextArea} = Input
const {Option} = Select

export const ThemeSettings: React.FC = () => {
    console.log('[ThemeSettings] Component rendered')

    const {
        currentTheme,
        allThemes,
        previewMode,
        isLoading,
        isSaving,
        error,

        // Actions
        updateColors,
        updateTypography,
        updateLayout,
        toggleDarkMode,
        startPreview,
        stopPreview,
        applyPreview,
        createTheme,
        deleteTheme,
        duplicateTheme,
        exportTheme,
        importTheme,
        resetToDefault,
        applyTheme
    } = useTheme()

    const [activeSection, setActiveSection] = useState<string[]>(['colors'])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [newThemeName, setNewThemeName] = useState('')
    const [newThemeDescription, setNewThemeDescription] = useState('')
    const [importJson, setImportJson] = useState('')

    // Handle color changes
    const handleColorChange = (colorKey: string, color: string) => {
        console.log('[ThemeSettings] Color changed:', colorKey, color)
        updateColors({[colorKey]: color})
    }

    // Handle typography changes
    const handleTypographyChange = (_key: string, _value: any) => {
        console.log('[ThemeSettings] Typography changed:', key, value)
        updateTypography({[key]: value})
    }

    // Handle layout changes
    const handleLayoutChange = (_key: string, _value: any) => {
        console.log('[ThemeSettings] Layout changed:', key, value)
        updateLayout({[key]: value})
    }

    // Save current theme as new preset
    const handleCreateTheme = async () => {
        if (!newThemeName.trim()) {
            message.error('Введите название темы')
            return
        }

        try {
            console.log('[ThemeSettings] Creating new theme:', newThemeName)
            const newTheme = createTheme(newThemeName.trim(), newThemeDescription.trim())
            message.success(`Тема "${newTheme.name}" создана`)
            setShowCreateModal(false)
            setNewThemeName('')
            setNewThemeDescription('')
        } catch (error) {
            console.error('[ThemeSettings] Create theme error:', error)
            message.error('Ошибка создания темы')
        }
    }

    // Export theme to JSON
    const handleExportTheme = () => {
        try {
            console.log('[ThemeSettings] Exporting current theme')
            const themeJson = exportTheme()

            // Create download
            const blob = new Blob([themeJson], {type: 'application/json'})
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${currentTheme.name.replace(/\s+/g, '-')}-theme.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            message.success('Тема экспортирована')
        } catch (error) {
            console.error('[ThemeSettings] Export error:', error)
            message.error('Ошибка экспорта темы')
        }
    }

    // Import theme from JSON
    const handleImportTheme = () => {
        try {
            console.log('[ThemeSettings] Importing theme from JSON')
            const theme = importTheme(importJson)
            applyTheme(theme)
            message.success(`Тема "${theme.name}" импортирована и применена`)
            setShowImportModal(false)
            setImportJson('')
        } catch (error) {
            console.error('[ThemeSettings] Import error:', error)
            message.error('Ошибка импорта темы')
        }
    }

    // Handle theme selection
    const handleThemeSelect = (themeId: string) => {
        const theme = allThemes.find(t => t.id === themeId)
        if (theme) {
            console.log('[ThemeSettings] Theme selected:', theme.name)
            applyTheme(theme)
            message.success(`Применена тема "${theme.name}"`)
        }
    }

    // Preview handlers
    const handleStartPreview = (theme: CustomThemeConfig) => {
        console.log('[ThemeSettings] Starting preview for theme:', theme.name)
        startPreview(theme)
    }

    const handleStopPreview = () => {
        console.log('[ThemeSettings] Stopping preview')
        stopPreview()
        message.info('Предварительный просмотр отменен')
    }

    const handleApplyPreview = () => {
        console.log('[ThemeSettings] Applying preview')
        applyPreview()
        message.success('Изменения применены')
    }

    if (isLoading) {
        return (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>
                <Spin size="large"/>
            </div>
        )
    }

    return (<PageContainer
            title="Настройки темы"
            subTitle="Настройка внешнего вида приложения"
            extra={[
                previewMode && (
                    <Space key="preview-actions">
                        <Button
                            type="primary"
                            icon={<CheckOutlined/>}
                            onClick={() => void handleApplyPreview()}
                        >
                            Применить
                        </Button>
                        <Button
                            icon={<CloseOutlined/>}
                            onClick={() => void handleStopPreview()}
                        >
                            Отменить
                        </Button>
                    </Space>
                ),
                <Space key="main-actions">
                    <Button
                        icon={<SaveOutlined/>}
                        onClick={() => void setShowCreateModal(true)}
                        loading={isSaving}
                    >
                        Сохранить как
                    </Button>
                    <Button
                        icon={<ExportOutlined/>}
                        onClick={() => void handleExportTheme()}
                    >
                        Экспорт
                    </Button>
                    <Button
                        icon={<ImportOutlined/>}
                        onClick={() => void setShowImportModal(true)}
                    >
                        Импорт
                    </Button>
                    <Popconfirm
                        title="Сбросить все настройки?"
                        description="Это действие вернет тему к значениям по умолчанию"
                        onConfirm={resetToDefault}
                        okText="Да"
                        cancelText="Отмена"
                    >
                        <Button icon={<ReloadOutlined/>}>
                            Сброс
                        </Button>
                    </Popconfirm>
                </Space>
            ]}
        >
            {error && (
                <Alert
                    message="Ошибка"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    style={{marginBottom: 24}}
                />
            )}

            {previewMode && (
                <Alert
                    message="Режим предварительного просмотра"
                    description="Вы просматриваете изменения. Нажмите 'Применить' чтобы сохранить или 'Отменить' чтобы вернуться."
                    type="info"
                    showIcon
                    style={{marginBottom: 24}}
                />
            )}

            <Row gutter={[24, 24]}>
                {/* Settings Panel */}
                <Col xs={24} lg={14}>
                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                        {/* Theme Selection */}
                        <Card title={<><AppstoreOutlined/> Выбор темы</>}>
                            <Space direction="vertical" style={{width: '100%'}} size="middle">
                                <div>
                                    <Text strong>Текущая тема: </Text>
                                    <Tag color="blue">{currentTheme.name}</Tag>
                                    {currentTheme.darkMode && <Tag color="default">Темная</Tag>}
                                </div>

                                <Select
                                    style={{width: '100%'}}
                                    placeholder="Выберите тему"
                                    value={currentTheme.id}
                                    onChange={() => void handleThemeSelect()}
                                >
                                    <Select.OptGroup label="Предустановленные темы">
                                        {allThemes.filter(t => t.isPreset).map(theme => (
                                            <Option key={theme.id} value={theme.id}>
                                                <Space>
                                                    {theme.name}
                                                    {theme.darkMode ? <MoonOutlined/> : <SunOutlined/>}
                                                </Space>
                                            </Option>
                                        ))}
                                    </Select.OptGroup>

                                    {allThemes.some(t => !t.isPreset) && (
                                        <Select.OptGroup label="Пользовательские темы">
                                            {allThemes.filter(t => !t.isPreset).map(theme => (
                                                <Option key={theme.id} value={theme.id}>
                                                    <Space>
                                                        {theme.name}
                                                        {theme.darkMode ? <MoonOutlined/> : <SunOutlined/>}
                                                    </Space>
                                                </Option>
                                            ))}
                                        </Select.OptGroup>
                                    )}
                                </Select>

                                <div>
                                    <Space wrap>
                                        <Button
                                            type="primary"
                                            icon={currentTheme.darkMode ? <SunOutlined/> : <MoonOutlined/>}
                                            onClick={() => void toggleDarkMode()}
                                        >
                                            {currentTheme.darkMode ? 'Светлая тема' : 'Темная тема'}
                                        </Button>

                                        <Button
                                            icon={<CopyOutlined/>}
                                            onClick={() => {
                                                const duplicate = duplicateTheme(currentTheme.id, `${currentTheme.name} (копия)`)
                                                message.success(`Создана копия темы: ${duplicate.name}`)
                                            }}
                                        >
                                            Дублировать
                                        </Button>

                                        {!currentTheme.isPreset && (<Popconfirm
                                                title="Удалить тему?"
                                                description="Это действие нельзя отменить"
                                                onConfirm={() => {
                                                    deleteTheme(currentTheme.id)
                                                    message.success('Тема удалена')
                                                }}
                                                okText="Удалить"
                                                cancelText="Отмена"
                                            >
                                                <Button danger icon={<DeleteOutlined/>}>
                                                    Удалить
                                                </Button>
                                            </Popconfirm>
                                        )}
                                    </Space>
                                </div>
                            </Space>
                        </Card>

                        {/* Settings Accordion */}
                        <Collapse
                            activeKey={activeSection}
                            onChange={() => void setActiveSection()}
                            size="large"
                        >
                            {/* Colors Section */}
                            <Panel header={<><BgColorsOutlined/> Цвета</>} key="colors">
                                <Space direction="vertical" size="large" style={{width: '100%'}}>
                                    {/* Color Palettes */}
                                    <div>
                                        <Text strong style={{display: 'block', marginBottom: 12}}>
                                            Быстрые палитры
                                        </Text>
                                        <Row gutter={[8, 8]}>
                                            {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                                                <Col key={key} span={6}>
                                                    <Tooltip title={`Применить палитру ${key}`}>
                                                        <div
                                                            style={{
                                                                padding: 8,
                                                                border: '1px solid #d9d9d9',
                                                                borderRadius: 4,
                                                                cursor: 'pointer',
                                                                textAlign: 'center'
                                                            }}
                                                            onClick={() => {
                                                                updateColors(palette)
                                                                message.success(`Применена палитра ${key}`)
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                marginBottom: 4
                                                            }}>
                                                                {[palette.primary, palette.success, palette.warning].map((color, index) => (
                                                                    <div
                                                                        key={index}
                                                                        style={{
                                                                            width: 12,
                                                                            height: 12,
                                                                            backgroundColor: color,
                                                                            marginRight: index < 2 ? 4 : 0,
                                                                            borderRadius: 2
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <Text style={{fontSize: 11, textTransform: 'capitalize'}}>
                                                                {key}
                                                            </Text>
                                                        </div>
                                                    </Tooltip>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>

                                    <Divider/>

                                    {/* Brand Colors */}
                                    <div>
                                        <Title level={5}>Основные цвета</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Основной цвет"
                                                    value={currentTheme.colors.primary}
                                                    onChange={(color) => handleColorChange('primary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Дополнительный цвет"
                                                    value={currentTheme.colors.secondary}
                                                    onChange={(color) => handleColorChange('secondary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Информационный цвет"
                                                    value={currentTheme.colors.info}
                                                    onChange={(color) => handleColorChange('info', color)}
                                                />
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Status Colors */}
                                    <div>
                                        <Title level={5}>Статусные цвета</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Успех"
                                                    value={currentTheme.colors.success}
                                                    onChange={(color) => handleColorChange('success', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Предупреждение"
                                                    value={currentTheme.colors.warning}
                                                    onChange={(color) => handleColorChange('warning', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Ошибка"
                                                    value={currentTheme.colors.error}
                                                    onChange={(color) => handleColorChange('error', color)}
                                                />
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Background Colors */}
                                    <div>
                                        <Title level={5}>Фоновые цвета</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Основной фон"
                                                    value={currentTheme.colors.backgroundPrimary}
                                                    onChange={(color) => handleColorChange('backgroundPrimary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Вторичный фон"
                                                    value={currentTheme.colors.backgroundSecondary}
                                                    onChange={(color) => handleColorChange('backgroundSecondary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Фон контейнеров"
                                                    value={currentTheme.colors.backgroundContainer}
                                                    onChange={(color) => handleColorChange('backgroundContainer', color)}
                                                />
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Text Colors */}
                                    <div>
                                        <Title level={5}>Цвета текста</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Основной текст"
                                                    value={currentTheme.colors.textPrimary}
                                                    onChange={(color) => handleColorChange('textPrimary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Вторичный текст"
                                                    value={currentTheme.colors.textSecondary}
                                                    onChange={(color) => handleColorChange('textSecondary', color)}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <ColorPicker
                                                    label="Отключенный текст"
                                                    value={currentTheme.colors.textDisabled}
                                                    onChange={(color) => handleColorChange('textDisabled', color)}
                                                />
                                            </Col>
                                        </Row>
                                    </div>
                                </Space>
                            </Panel>

                            {/* Typography Section */}
                            <Panel header={<><FontSizeOutlined/> Типографика</>} key="typography">
                                <Space direction="vertical" size="large" style={{width: '100%'}}>
                                    <FontSelector
                                        value={currentTheme.typography.fontFamily}
                                        onChange={(font) => handleTypographyChange('fontFamily', font)}
                                    />

                                    <Row gutter={[16, 16]}>
                                        <Col span={12}>
                                            <div>
                                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                                    Базовый размер шрифта (px)
                                                </Text>
                                                <Slider
                                                    min={12}
                                                    max={20}
                                                    value={currentTheme.typography.fontSize}
                                                    onChange={(_value) => handleTypographyChange('fontSize', value)}
                                                    marks={{12: '12px', 14: '14px', 16: '16px', 18: '18px', 20: '20px'}}
                                                />
                                            </div>
                                        </Col>

                                        <Col span={12}>
                                            <div>
                                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                                    Межстрочный интервал
                                                </Text>
                                                <Slider
                                                    min={1.2}
                                                    max={2.0}
                                                    step={0.1}
                                                    value={currentTheme.typography.lineHeight}
                                                    onChange={(_value) => handleTypographyChange('lineHeight', value)}
                                                    marks={{1.2: '1.2', 1.5: '1.5', 1.8: '1.8', 2.0: '2.0'}}
                                                />
                                            </div>
                                        </Col>
                                    </Row>

                                    <div>
                                        <Text strong style={{display: 'block', marginBottom: 12}}>
                                            Насыщенность шрифта
                                        </Text>
                                        <Row gutter={[12, 12]}>
                                            {Object.entries(currentTheme.typography.fontWeight).map(([key, weight]) => (
                                                <Col key={key} span={8}>
                                                    <div>
                                                        <Text style={{
                                                            display: 'block',
                                                            marginBottom: 4,
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            {key === 'light' ? 'Легкий' :
                                                                key === 'normal' ? 'Обычный' :
                                                                    key === 'medium' ? 'Средний' :
                                                                        key === 'semibold' ? 'Полужирный' :
                                                                            key === 'bold' ? 'Жирный' : key}
                                                        </Text>
                                                        <InputNumber
                                                            min={100}
                                                            max={900}
                                                            step={100}
                                                            value={weight}
                                                            onChange={(value) =>
                                                                handleTypographyChange('fontWeight', {
                                                                    ...currentTheme.typography.fontWeight,
                                                                    [key]: value || 400
                                                                })
                                                            }
                                                            style={{width: '100%'}}
                                                        />
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                </Space>
                            </Panel>

                            {/* Layout Section */}
                            <Panel header={<><BorderInnerOutlined/> Макет</>} key="layout">
                                <Space direction="vertical" size="large" style={{width: '100%'}}>
                                    <div>
                                        <Title level={5}>Скругление углов</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={8}>
                                                <div>
                                                    <Text strong style={{display: 'block', marginBottom: 8}}>
                                                        Малое (px)
                                                    </Text>
                                                    <Slider
                                                        min={0}
                                                        max={12}
                                                        value={currentTheme.layout.borderRadiusSmall}
                                                        onChange={(_value) => handleLayoutChange('borderRadiusSmall', value)}
                                                    />
                                                </div>
                                            </Col>

                                            <Col span={8}>
                                                <div>
                                                    <Text strong style={{display: 'block', marginBottom: 8}}>
                                                        Обычное (px)
                                                    </Text>
                                                    <Slider
                                                        min={0}
                                                        max={16}
                                                        value={currentTheme.layout.borderRadius}
                                                        onChange={(_value) => handleLayoutChange('borderRadius', value)}
                                                    />
                                                </div>
                                            </Col>

                                            <Col span={8}>
                                                <div>
                                                    <Text strong style={{display: 'block', marginBottom: 8}}>
                                                        Большое (px)
                                                    </Text>
                                                    <Slider
                                                        min={0}
                                                        max={24}
                                                        value={currentTheme.layout.borderRadiusLarge}
                                                        onChange={(_value) => handleLayoutChange('borderRadiusLarge', value)}
                                                    />
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>

                                    <div>
                                        <Title level={5}>Отступы</Title>
                                        <div>
                                            <Text strong style={{display: 'block', marginBottom: 8}}>
                                                Базовый отступ (px)
                                            </Text>
                                            <Slider
                                                min={4}
                                                max={16}
                                                value={currentTheme.layout.spacing}
                                                onChange={(_value) => handleLayoutChange('spacing', value)}
                                                marks={{4: '4px', 8: '8px', 12: '12px', 16: '16px'}}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Title level={5}>Тени</Title>
                                        <Space direction="vertical" style={{width: '100%'}}>
                                            <div>
                                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                                    Малая тень
                                                </Text>
                                                <Input
                                                    value={currentTheme.layout.shadowSmall}
                                                    onChange={(_e) => handleLayoutChange('shadowSmall', e.target.value)}
                                                    placeholder="0 1px 2px rgba(0,0,0,0.1)"
                                                />
                                            </div>

                                            <div>
                                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                                    Средняя тень
                                                </Text>
                                                <Input
                                                    value={currentTheme.layout.shadowMedium}
                                                    onChange={(_e) => handleLayoutChange('shadowMedium', e.target.value)}
                                                    placeholder="0 4px 6px rgba(0,0,0,0.1)"
                                                />
                                            </div>

                                            <div>
                                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                                    Большая тень
                                                </Text>
                                                <Input
                                                    value={currentTheme.layout.shadowLarge}
                                                    onChange={(_e) => handleLayoutChange('shadowLarge', e.target.value)}
                                                    placeholder="0 10px 15px rgba(0,0,0,0.1)"
                                                />
                                            </div>
                                        </Space>
                                    </div>
                                </Space>
                            </Panel>
                        </Collapse>
                    </Space>
                </Col>

                {/* Preview Panel */}
                <Col xs={24} lg={10}>
                    <div style={{position: 'sticky', top: 24}}>
                        <Card
                            title={<><EyeOutlined/> Предварительный просмотр</>}
                            extra={
                                <Button
                                    size="small"
                                    onClick={() => {
                                        console.log('[ThemeSettings] Refreshing preview')
                                        // Force preview refresh
                                        window.location.reload()
                                    }}
                                >
                                    Обновить
                                </Button>
                            }
                        >
                            <div style={{maxHeight: '80vh', overflow: 'auto'}}>
                                <ThemePreview theme={currentTheme}/>
                            </div>
                        </Card>
                    </div>
                </Col>
            </Row>

            {/* Create Theme Modal */}
            <Modal
                title="Сохранить тему как"
                open={showCreateModal}
                onOk={handleCreateTheme}
                onCancel={() => {
                    setShowCreateModal(false)
                    setNewThemeName('')
                    setNewThemeDescription('')
                }}
                okText="Создать"
                cancelText="Отмена"
                confirmLoading={isSaving}
            >
                <Space direction="vertical" style={{width: '100%'}}>
                    <div>
                        <Text strong>Название темы</Text>
                        <Input
                            value={newThemeName}
                            onChange={(_e) => setNewThemeName(e.target.value)}
                            placeholder="Моя тема"
                            style={{marginTop: 8}}
                        />
                    </div>

                    <div>
                        <Text strong>Описание (опционально)</Text>
                        <TextArea
                            value={newThemeDescription}
                            onChange={(_e) => setNewThemeDescription(e.target.value)}
                            placeholder="Краткое описание темы"
                            rows={3}
                            style={{marginTop: 8}}
                        />
                    </div>
                </Space>
            </Modal>

            {/* Import Theme Modal */}
            <Modal
                title="Импорт темы"
                open={showImportModal}
                onOk={handleImportTheme}
                onCancel={() => {
                    setShowImportModal(false)
                    setImportJson('')
                }}
                okText="Импортировать"
                cancelText="Отмена"
                width={600}
            >
                <Space direction="vertical" style={{width: '100%'}}>
                    <Text>Вставьте JSON код темы:</Text>
                    <TextArea
                        value={importJson}
                        onChange={(_e) => setImportJson(e.target.value)}
                        placeholder='{"id": "custom-theme", "name": "Моя тема", ...}'
                        rows={10}
                        style={{fontFamily: 'monospace', fontSize: '12px'}}
                    />
                </Space>
            </Modal>
        </PageContainer>
    )
}