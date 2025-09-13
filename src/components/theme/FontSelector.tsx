/**
 * Font Selector Component
 * Allows selection of system and Google fonts with preview
 */

import React, { useEffect, useState } from 'react'
import {
  Button,
  Divider,
  Input,
  message,
  Select,
  Space,
  Spin,
  Typography
} from 'antd'
import { 
  DesktopOutlined,
  FontSizeOutlined,
  GoogleOutlined
} from '@ant-design/icons'
import { GOOGLE_FONTS, SYSTEM_FONTS } from '@/models/theme'

const { Text } = Typography
const { Option, OptGroup } = Select

// Sample text for font preview
const PREVIEW_TEXT = 'Съешь ещё этих мягких французских булок, да выпей чаю. AaBbCc 123'

interface FontSelectorProps {
  value?: string
  onChange?: (font: string) => void
  label?: string
  disabled?: boolean
  showPreview?: boolean
  previewText?: string
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value = 'system-ui',
  onChange,
  label = 'Шрифт',
  disabled = false,
  showPreview = true,
  previewText = PREVIEW_TEXT
}) => {
  console.log('[FontSelector] Rendering with value:', value)
  
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set())
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const [customFont, setCustomFont] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Load Google Font dynamically
  const loadGoogleFont = async (fontFamily: string) => {
    if (SYSTEM_FONTS.includes(fontFamily) || loadedFonts.has(fontFamily)) {
      return true
    }

    console.log('[FontSelector] Loading Google Font:', fontFamily)
    setLoadingFonts(prev => new Set(prev).add(fontFamily))

    try {
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`
      link.rel = 'stylesheet'
      
      // Remove existing font link
      const existing = document.head.querySelector(`link[href*="${fontFamily.replace(' ', '+')}"]`)
      if (existing) {
        document.head.removeChild(existing)
      }
      
      // Add new font link
      document.head.appendChild(link)
      
      // Wait for font to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Font loading timeout'))
        }, 5000)
        
        link.onload = () => {
          clearTimeout(timeout)
          resolve()
        }
        
        link.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Font loading failed'))
        }
      })
      
      setLoadedFonts(prev => new Set(prev).add(fontFamily))
      return true
    } catch (error) {
      console.error('[FontSelector] Error loading font:', fontFamily, error)
      message.error(`Не удалось загрузить шрифт ${fontFamily}`)
      return false
    } finally {
      setLoadingFonts(prev => {
        const newSet = new Set(prev)
        newSet.delete(fontFamily)
        return newSet
      })
    }
  }

  const handleFontChange = async (fontFamily: string) => {
    console.log('[FontSelector] Font changed to:', fontFamily)
    
    // Load Google Font if needed
    if (!SYSTEM_FONTS.includes(fontFamily)) {
      const loaded = await loadGoogleFont(fontFamily)
      if (!loaded) {
        return
      }
    }
    
    onChange?.(fontFamily)
  }

  const handleCustomFontAdd = async () => {
    if (!customFont.trim()) {
      message.warning('Введите название шрифта')
      return
    }

    const fontFamily = customFont.trim()
    console.log('[FontSelector] Adding custom font:', fontFamily)
    
    const loaded = await loadGoogleFont(fontFamily)
    if (loaded) {
      handleFontChange(fontFamily)
      setCustomFont('')
      setShowCustomInput(false)
      message.success(`Шрифт ${fontFamily} добавлен`)
    }
  }

  // Preload some popular fonts
  useEffect(() => {
    const popularFonts = ['Inter', 'Roboto', 'Open Sans']
    popularFonts.forEach(font => {
      if (!loadedFonts.has(font)) {
        loadGoogleFont(font)
      }
    })
  }, [])

  const FontOption: React.FC<{ fontFamily: string, isSystem?: boolean }> = ({ 
    fontFamily, 
    isSystem = false 
  }) => {
    const isLoading = loadingFonts.has(fontFamily)
    const displayName = fontFamily === 'system-ui' ? 'Системный шрифт' : fontFamily
    
    return (
      <Option 
        value={fontFamily} 
        key={fontFamily}
        style={{ fontFamily: isSystem ? 'inherit' : fontFamily }}
      >
        <Space>
          {isSystem ? <DesktopOutlined /> : <GoogleOutlined />}
          <span>{displayName}</span>
          {isLoading && <Spin size="small" />}
        </Space>
      </Option>
    )
  }

  const PreviewCard: React.FC = () => {
    if (!showPreview) {return null}
    
    const previewStyle = {
      fontFamily: value,
      fontSize: '16px',
      lineHeight: '1.5',
      padding: '16px',
      backgroundColor: '#fafafa',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      minHeight: '80px'
    }
    
    return (
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Предварительный просмотр:
        </Text>
        <div style={previewStyle}>
          {previewText}
        </div>
        <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
          Шрифт: {value}
        </Text>
      </div>
    )
  }

  return (
    <div>
      {label && (
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          <FontSizeOutlined /> {label}
        </Text>
      )}
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={value}
          onChange={handleFontChange}
          disabled={disabled}
          style={{ width: '100%' }}
          placeholder="Выберите шрифт"
          showSearch
          filterOption={(input, option) =>
            option?.children?.toString().toLowerCase().includes(input.toLowerCase())
          }
          dropdownRender={menu => (
            <div>
              {menu}
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ padding: '8px' }}>
                {!showCustomInput ? (
                  <Button
                    type="dashed"
                    block
                    icon={<GoogleOutlined />}
                    onClick={() => setShowCustomInput(true)}
                  >
                    Добавить Google шрифт
                  </Button>
                ) : (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="Название шрифта"
                      value={customFont}
                      onChange={(e) => setCustomFont(e.target.value)}
                      onPressEnter={handleCustomFontAdd}
                    />
                    <Button onClick={handleCustomFontAdd}>
                      Добавить
                    </Button>
                    <Button onClick={() => {
                      setShowCustomInput(false)
                      setCustomFont('')
                    }}>
                      Отмена
                    </Button>
                  </Space.Compact>
                )}
              </div>
            </div>
          )}
        >
          <OptGroup label="Системные шрифты">
            {SYSTEM_FONTS.map(font => (
              <FontOption key={font} fontFamily={font} isSystem />
            ))}
          </OptGroup>
          
          <OptGroup label="Google шрифты">
            {GOOGLE_FONTS.map(font => (
              <FontOption key={font} fontFamily={font} />
            ))}
            
            {/* Show loaded custom fonts */}
            {[...loadedFonts].filter(font => 
              !GOOGLE_FONTS.includes(font) && !SYSTEM_FONTS.includes(font)
            ).map(font => (
              <FontOption key={font} fontFamily={font} />
            ))}
          </OptGroup>
        </Select>

        <PreviewCard />
      </Space>
    </div>
  )
}