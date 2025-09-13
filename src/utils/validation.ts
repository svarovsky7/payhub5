/**
 * Утилиты для валидации форм и данных
 */

// Проверка email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Проверка российского номера телефона
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Проверка ИНН
export const isValidINN = (inn: string): boolean => {
  if (!inn || !/^\d+$/.test(inn)) {return false}
  
  if (inn.length === 10) {
    // ИНН юридического лица
    const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(inn[i]) * coefficients[i]
    }
    const checksum = (sum % 11) % 10
    return checksum === parseInt(inn[9])
  } else if (inn.length === 12) {
    // ИНН физического лица
    const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
    
    let sum1 = 0
    for (let i = 0; i < 10; i++) {
      sum1 += parseInt(inn[i]) * coefficients1[i]
    }
    const checksum1 = (sum1 % 11) % 10
    
    let sum2 = 0
    for (let i = 0; i < 11; i++) {
      sum2 += parseInt(inn[i]) * coefficients2[i]
    }
    const checksum2 = (sum2 % 11) % 10
    
    return checksum1 === parseInt(inn[10]) && checksum2 === parseInt(inn[11])
  }
  
  return false
}

// Проверка КПП
export const isValidKPP = (kpp: string): boolean => {
  const kppRegex = /^\d{4}[A-Z0-9]{2}\d{3}$/
  return kppRegex.test(kpp)
}

// Проверка ОГРН
export const isValidOGRN = (ogrn: string): boolean => {
  if (!ogrn || !/^\d{13}$/.test(ogrn)) {return false}
  
  const sum = parseInt(ogrn.substring(0, 12)) % 11
  const checksum = sum % 10
  return checksum === parseInt(ogrn[12])
}

// Проверка БИК банка
export const isValidBIK = (bik: string): boolean => {
  const bikRegex = /^04\d{7}$/
  return bikRegex.test(bik)
}

// Проверка номера банковского счета
export const isValidAccountNumber = (account: string, bik?: string): boolean => {
  if (!account || !/^\d{20}$/.test(account)) {return false}
  
  if (bik && isValidBIK(bik)) {
    // Проверка контрольной суммы
    const bikCode = bik.substring(6, 9)
    const fullNumber = bikCode + account
    
    const coefficients = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1]
    let sum = 0
    
    for (let i = 0; i < fullNumber.length; i++) {
      sum += parseInt(fullNumber[i]) * coefficients[i]
    }
    
    return sum % 10 === 0
  }
  
  return true
}

// Проверка пароля
export const isValidPassword = (password: string): boolean => {
  // Минимум 8 символов, должен содержать буквы и цифры
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
  return passwordRegex.test(password)
}

// Проверка силы пароля
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 6) {return 'weak'}
  
  let score = 0
  
  // Длина
  if (password.length >= 8) {score += 1}
  if (password.length >= 12) {score += 1}
  
  // Содержит цифры
  if (/\d/.test(password)) {score += 1}
  
  // Содержит строчные буквы
  if (/[a-z]/.test(password)) {score += 1}
  
  // Содержит заглавные буквы
  if (/[A-Z]/.test(password)) {score += 1}
  
  // Содержит специальные символы
  if (/[^A-Za-z0-9]/.test(password)) {score += 1}
  
  if (score < 3) {return 'weak'}
  if (score < 5) {return 'medium'}
  return 'strong'
}

// Проверка файла
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  return allowedTypes.includes(fileExtension)
}

export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

// Проверка URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Правила валидации для Ant Design Form
export const validationRules = {
  required: {
    required: true,
    message: 'Это поле обязательно для заполнения',
  },
  
  email: {
    type: 'email' as const,
    message: 'Некорректный адрес электронной почты',
  },
  
  phone: {
    pattern: /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    message: 'Некорректный номер телефона',
  },
  
  inn: {
    validator: (_: any, value: string) => {
      if (!value || isValidINN(value)) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Некорректный ИНН'))
    },
  },
  
  kpp: {
    validator: (_: any, value: string) => {
      if (!value || isValidKPP(value)) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Некорректный КПП'))
    },
  },
  
  ogrn: {
    validator: (_: any, value: string) => {
      if (!value || isValidOGRN(value)) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Некорректный ОГРН'))
    },
  },
  
  bik: {
    validator: (_: any, value: string) => {
      if (!value || isValidBIK(value)) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Некорректный БИК'))
    },
  },
  
  password: {
    validator: (_: any, value: string) => {
      if (!value || isValidPassword(value)) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Пароль должен содержать минимум 8 символов, включая буквы и цифры'))
    },
  },
  
  confirmPassword: (passwordField: string) => ({
    validator: (_: any, value: string) => {
      const form = _.field.fieldContext.getFieldsValue()
      if (!value || form[passwordField] === value) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Пароли не совпадают'))
    },
  }),
  
  positiveNumber: {
    validator: (_: any, value: number) => {
      if (value === undefined || value === null || value > 0) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Значение должно быть положительным числом'))
    },
  },
  
  maxLength: (max: number) => ({
    max,
    message: `Максимальная длина ${max} символов`,
  }),
  
  minLength: (min: number) => ({
    min,
    message: `Минимальная длина ${min} символов`,
  }),
}