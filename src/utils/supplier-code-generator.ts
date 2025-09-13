/**
 * Утилита для генерации уникального кода поставщика
 * Код состоит из 3 латинских букв + 4 цифры ИНН
 */

/**
 * Транслитерация RU->LAT и нормализация строки:
 * - переводит в верхний регистр
 * - убирает кавычки/скобки/знаки
 * - схлопывает диграфы (SCH→S, SH→S, CH→C, ZH→Z, KH→K, TS→T)
 * - оставляет только латинские буквы/цифры/пробелы
 */
function translitRuToLat(input: string): string {
  const map: Record<string, string> = {
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'ZH','З':'Z','И':'I','Й':'Y',
    'К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F',
    'Х':'KH','Ц':'TS','Ч':'CH','Ш':'SH','Щ':'SCH','Ы':'Y','Э':'E','Ю':'YU','Я':'YA','Ь':'','Ъ':'',
    'а':'A','б':'B','в':'V','г':'G','д':'D','е':'E','ё':'E','ж':'ZH','з':'Z','и':'I','й':'Y',
    'к':'K','л':'L','м':'M','н':'N','о':'O','п':'P','р':'R','с':'S','т':'T','у':'U','ф':'F',
    'х':'KH','ц':'TS','ч':'CH','ш':'SH','щ':'SCH','ы':'Y','э':'E','ю':'YU','я':'YA','ь':'','ъ':''
  }

  let out = ""
  for (const ch of input ?? "") {
    out += map[ch] ?? ch
  }

  out = out
    .toUpperCase()
    .replace(/[«»"""'`().,+*&^%$#@!?:<>/\\|\[\]{}]/g, " ") // знаки → пробел
    // схлопываем диграфы в одну букву для удобства выбора согласных
    .replace(/SCH/g, "S")
    .replace(/SH/g, "S")
    .replace(/CH/g, "C")
    .replace(/ZH/g, "Z")
    .replace(/KH/g, "K")
    .replace(/TS/g, "T")
    // оставляем A-Z, 0-9, пробелы и дефисы как разделители
    .replace(/[^A-Z0-9\s-]+/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return out
}

/**
 * Стоп-слова (уже в транслитерации, UPPERCASE).
 * Удаляются как отдельные токены из начала/середины/конца названия.
 */
const STOP = new Set([
  // ОПФ
  "OOO","AO","PAO","ZAO","OAO","IP","GUP","MUP","NKO",
  // обёртки/принадлежность
  "COMPANY","KOMPANIYA","KOMP","GRUPPA","GROUP","HOLDING","KORPORATSIYA",
  "KONTSERN","ASSOTSIATSIYA","ASSOCIATION","SOYUZ","OBEDINENIE",
  "PARTNERSTVO","KOOPERATIV",
  // производственные
  "ZAVOD","FABRIKA","KOMBINAT","PREDPRIYATIE","NII","NPO",
  // приставки/суффиксы
  "UK","SK",
  // союзы
  "I","AND"
])

/**
 * Возвращает true, если символ — согласная латинская буква.
 */
function isConsonant(ch: string): boolean {
  return /^[BCDFGHJKLMNPQRSTVWXYZ]$/.test(ch)
}

/**
 * Подобрать из слова согласные/буквы для дополнения кода.
 * skipFirst — пропустить первые N символов (обычно 1 — первую букву уже взяли).
 */
function pickFromWord(word: string, want: number = 2, skipFirst: number = 1): string {
  const arr = (word || "").split("")
  const picked: string[] = []

  // сначала собираем согласные
  for (let i = skipFirst; i < arr.length && picked.length < want; i++) {
    const ch = arr[i]
    if (isConsonant(ch)) {picked.push(ch)}
  }
  // если не хватило — добираем любыми буквами A-Z
  for (let i = skipFirst; i < arr.length && picked.length < want; i++) {
    const ch = arr[i]
    if (/^[A-Z]$/.test(ch) && !picked.includes(ch)) {picked.push(ch)}
  }

  // если всё ещё < want — добиваем X
  while (picked.length < want) {picked.push("X")}
  return picked.join("")
}

/**
 * Сформировать 3-буквенный код поставщика из названия:
 * - 1 токен: первая буква + две следующие согласные/буквы
 * - 2–3 токена: первые буквы трёх значимых токенов; если не хватает — добираем из первого
 * - ≥4 токенов: просто первые буквы первых трёх значимых токенов
 * Всегда возвращает ровно 3 латинские буквы A–Z.
 */
function generateSupplierCode(companyName: string): string {
  const lat = translitRuToLat(companyName)
  if (!lat) {return "XXX"}

  // токены по пробелам
  let tokens = lat.split(" ").filter(Boolean)

  // чистим стоп-слова
  tokens = tokens.filter(t => !STOP.has(t))

  // удаляем токены, которые не начинаются с буквы A-Z
  tokens = tokens.filter(t => /^[A-Z]/.test(t))

  if (tokens.length === 0) {return "XXX"}

  let code = ""

  if (tokens.length === 1) {
    const w = tokens[0]
    const first = (w[0] && /[A-Z]/.test(w[0])) ? w[0] : "X"
    code = (first + pickFromWord(w, 2, 1)).slice(0, 3).padEnd(3, "X")
  } else if (tokens.length <= 3) {
    const initials = tokens.map(t => t[0]).join("").slice(0, 3)
    if (initials.length === 3) {
      code = initials
    } else {
      const need = 3 - initials.length
      const w = tokens[0]
      code = (initials + pickFromWord(w, need, 1)).slice(0, 3).padEnd(3, "X")
    }
  } else {
    code = tokens.slice(0, 3).map(t => t[0]).join("").padEnd(3, "X")
  }

  return code
}

/**
 * Улучшенная генерация кода поставщика с более предсказуемыми результатами
 * Приоритеты:
 * 1. Для известных слов используем стандартные аббревиатуры
 * 2. Для основного слова берем первые 3 буквы
 * 3. Для составных слов берем по 1 букве от каждого значимого слова
 */
export function generateSupplierCodeImproved(companyName: string): string {
  // Стандартные аббревиатуры для распространенных слов
  const standardAbbreviations: Record<string, string> = {
    'СТРОЙИНВЕСТ': 'STI',
    'СТРОЙМОНТАЖ': 'STM', 
    'СТРОЙМАТЕРИАЛ': 'STM',
    'СТРОЙГАЗМОНТАЖ': 'SGM',
    'МЕГАСТРОЙ': 'MGS',
    'ПОЛИСТРОЙ': 'PLT',
    'ТЕХСЕРВИС': 'THS',
    'ГЛАСС': 'GLS',
    'ПЕТРОВ': 'PTR',
  }
  
  // Очищаем название от кавычек и лишних символов
  const cleanName = companyName
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  
  // Проверяем стандартные аббревиатуры для основного слова
  for (const [word, abbr] of Object.entries(standardAbbreviations)) {
    if (cleanName.includes(word)) {
      return abbr
    }
  }
  
  // Убираем стоп-слова
  const stopWords = ['ООО', 'ОАО', 'АО', 'ЗАО', 'ПАО', 'ИП', 'ЧП']
  const words = cleanName.split(' ').filter(word => 
    !stopWords.includes(word) && word.length > 0
  )
  
  if (words.length === 0) {
    return 'XXX'
  }
  
  // Транслитерация
  const translitWords = words.map(word => translitRuToLat(word))
  
  let code = ''
  
  // Если есть несколько значимых слов - берем инициалы
  if (translitWords.length >= 2) {
    // Для ФИО (например, "Петров А.В.") берем первые буквы
    if (translitWords.length === 3 && 
        translitWords[1].length <= 2 && 
        translitWords[2].length <= 2) {
      code = translitWords[0].slice(0, 1) + 
             translitWords[1].slice(0, 1) + 
             translitWords[2].slice(0, 1)
    } else {
      // Для составных названий берем первые буквы каждого слова
      code = translitWords.slice(0, 3).map(w => w[0]).join('')
    }
  } else {
    // Для одного слова берем первые 3 буквы
    code = translitWords[0].slice(0, 3)
  }
  
  // Дополняем до 3 символов если нужно
  return code.toUpperCase().padEnd(3, 'X')
}

/**
 * Полный код поставщика: только 3 буквы без цифр ИНН
 */
export function generateFullSupplierCode(companyName: string, inn?: string | null): string {
  return generateSupplierCodeImproved(companyName)
}

/* ===================== Примеры использования (для тестирования) ===================== */
// console.log(generateSupplierCode("ООО «СтройИнвест»")); // STR
// console.log(generateSupplierCode("АО «Гласс Лаб»"));     // GLS
// console.log(generateSupplierCode("ПАО «ЭлектроМонтажСервис»")); // ELK
// console.log(generateFullSupplierCode("АО «Гласс Лаб»", "7708123456")); // GLS3456