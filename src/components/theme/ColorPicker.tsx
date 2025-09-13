/**
 * Advanced Color Picker Component
 * Provides color selection with presets, custom colors, and palette management
 */

import React, { useState } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Input,
  Popover,
  Row,
  Space,
  Tooltip,
  Typography
} from 'antd'
import { 
  BgColorsOutlined,
  CheckOutlined,
  FormatPainterOutlined
} from '@ant-design/icons'
import { COLOR_PALETTES } from '@/models/theme'

const { Text } = Typography

// Predefined color presets
const COLOR_PRESETS = {
  primary: [
    '#1677ff', // Ant Design Blue
    '#52c41a', // Ant Design Green  
    '#722ed1', // Ant Design Purple
    '#fa541c', // Ant Design Orange
    '#f5222d', // Ant Design Red
    '#13c2c2', // Ant Design Cyan
    '#eb2f96', // Ant Design Magenta
    '#1890ff', // Light Blue
    '#36cfc9', // Light Cyan
    '#73d13d', // Light Green
  ],
  neutral: [
    '#ffffff', // White
    '#fafafa', // Gray 1
    '#f5f5f5', // Gray 2
    '#f0f0f0', // Gray 3
    '#d9d9d9', // Gray 4
    '#bfbfbf', // Gray 5
    '#8c8c8c', // Gray 6
    '#595959', // Gray 7
    '#434343', // Gray 8
    '#262626', // Gray 9
    '#1f1f1f', // Gray 10
    '#141414', // Gray 11
    '#000000', // Black
  ]
}

interface ColorPickerProps {
  value?: string
  onChange?: (color: string) => void
  label?: string
  showPresets?: boolean
  showPalettes?: boolean
  disabled?: boolean
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#1677ff',
  onChange,
  label,
  showPresets = true,
  showPalettes = true,
  disabled = false
}) => {
  console.log('[ColorPicker] Rendering with value:', value)
  
  const [inputValue, setInputValue] = useState(value)
  const [visible, setVisible] = useState(false)

  const handleColorSelect = (color: string) => {
    console.log('[ColorPicker] Color selected:', color)
    setInputValue(color)
    onChange?.(color)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
      onChange?.(newValue)
    }
  }

  const handleInputBlur = () => {
    // Reset to last valid value if invalid
    if (!/^#[0-9A-F]{6}$/i.test(inputValue)) {
      setInputValue(value)
    }
  }

  const handlePaletteSelect = (palette: keyof typeof COLOR_PALETTES) => {
    console.log('[ColorPicker] Palette selected:', palette)
    const paletteColor = COLOR_PALETTES[palette].primary
    handleColorSelect(paletteColor)
    setVisible(false)
  }

  const ColorPresetGrid: React.FC<{ colors: string[], title: string }> = ({ colors, title }) => (
    <div style={{ marginBottom: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>{title}</Text>
      <Row gutter={[8, 8]}>
        {colors.map((color, index) => (
          <Col key={index} span={4}>
            <Tooltip title={color}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: color,
                  border: '2px solid',
                  borderColor: value === color ? '#1677ff' : '#d9d9d9',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
                onClick={() => handleColorSelect(color)}
              >
                {value === color && (
                  <CheckOutlined 
                    style={{ 
                      color: color === '#ffffff' ? '#000000' : '#ffffff',
                      fontSize: 14
                    }} 
                  />
                )}
              </div>
            </Tooltip>
          </Col>
        ))}
      </Row>
    </div>
  )

  const ColorPalettes: React.FC = () => (
    <div style={{ marginBottom: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>Цветовые палитры</Text>
      <Row gutter={[8, 8]}>
        {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
          <Col key={key} span={12}>
            <Tooltip title={`Палитра ${key}`}>
              <div
                style={{
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  cursor: 'pointer',
                  backgroundColor: '#fafafa'
                }}
                onClick={() => handlePaletteSelect(key as keyof typeof COLOR_PALETTES)}
              >
                <div style={{ display: 'flex', marginBottom: 4 }}>
                  {Object.values(palette).slice(0, 3).map((color, index) => (
                    <div
                      key={index}
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: color,
                        marginRight: 2,
                        borderRadius: 2
                      }}
                    />
                  ))}
                </div>
                <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>
                  {key === 'blue' ? 'Синий' : 
                   key === 'green' ? 'Зеленый' :
                   key === 'purple' ? 'Фиолетовый' :
                   key === 'orange' ? 'Оранжевый' :
                   key === 'red' ? 'Красный' : key}
                </Text>
              </div>
            </Tooltip>
          </Col>
        ))}
      </Row>
    </div>
  )

  const pickerContent = (
    <div style={{ width: 280, padding: 8 }}>
      {/* Custom Color Input */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Пользовательский цвет</Text>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="#1677ff"
            prefix="#"
            style={{ textTransform: 'uppercase' }}
          />
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: value,
              border: '1px solid #d9d9d9',
              borderRadius: '0 4px 4px 0'
            }}
          />
        </Space.Compact>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Color Palettes */}
      {showPalettes && <ColorPalettes />}

      {/* Color Presets */}
      {showPresets && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <ColorPresetGrid colors={COLOR_PRESETS.primary} title="Основные цвета" />
          <ColorPresetGrid colors={COLOR_PRESETS.neutral} title="Нейтральные цвета" />
        </>
      )}
    </div>
  )

  return (
    <div>
      {label && (
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      
      <Popover
        content={pickerContent}
        title="Выбор цвета"
        trigger="click"
        open={visible}
        onOpenChange={setVisible}
        placement="bottomLeft"
      >
        <Button
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            height: 'auto'
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: value,
              border: '1px solid #d9d9d9',
              borderRadius: 2
            }}
          />
          <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {value.toUpperCase()}
          </Text>
          <BgColorsOutlined />
        </Button>
      </Popover>
    </div>
  )
}