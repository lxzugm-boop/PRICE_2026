
import { PriceItem } from '../types';

/**
 * Ссылка на Google Таблицу пользователя (CSV).
 */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2G6BGYc08F8C3AG3gOP4ap13flDtjagG5oxbgjwgYn8srzldiuZJt_vFnLMbW9uG0X6GSTdGgYcJU/pub?gid=264825056&single=true&output=csv';

export async function fetchPriceData(): Promise<PriceItem[]> {
  try {
    // Используем уникальный параметр для обхода кеша браузера при каждом обновлении
    const cacheBuster = `&cache_tick=${new Date().getTime()}`;
    const response = await fetch(SHEET_CSV_URL + cacheBuster);
    
    if (!response.ok) throw new Error('Не удалось получить данные из Google Таблиц');
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Ошибка при загрузке прайса:', error);
    return [];
  }
}

function parseCSV(csv: string): PriceItem[] {
  const items: PriceItem[] = [];
  // Регулярное выражение корректно обрабатывает запятые внутри кавычек (например, в названиях)
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const lines = csv.split(/\r?\n/);
  
  if (lines.length < 2) return [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = line.split(regex).map(cell => 
      cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
    );

    // Если строка короче необходимого минимума колонок — пропускаем
    if (row.length < 3) continue;

    /**
     * АКТУАЛЬНЫЙ МАППИНГ ПО ВАШЕЙ ТАБЛИЦЕ:
     * A(0): list (byt/prom)
     * B(1): article
     * C(2): name
     * D(3): НОВИНКА
     * E(4): ДИСТРИБЬЮТОР
     * H(7): РРЦ
     * I(8): АКЦ
     * M(12): image_url
     * N(13): product_url
     */
    const categoryRaw = row[0] || '';
    const article = row[1] || '';
    const name = row[2] || '';
    const isNewRaw = row[3] || '';
    const isDistRaw = row[4] || '';
    const priceStr = row[7] || '';
    const promoPriceStr = row[8] || '';
    const imageUrl = row[12] || '';
    const productUrl = row[13] || '';

    // Обязательно наличие артикула или названия, иначе строка считается пустой
    if (!name && !article) continue;

    let category = 'Прочее';
    const catLower = categoryRaw.toLowerCase();
    if (catLower.includes('byt')) category = 'Бытовой сегмент';
    else if (catLower.includes('prom')) category = 'Промышленный сегмент';

    const parseNumeric = (val: string) => {
      if (!val) return 0;
      // Удаляем пробелы, валюту и заменяем запятую на точку для parseFloat
      const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const checkBool = (val: string) => {
      const v = val.toString().toLowerCase().trim();
      return v === '1' || v === 'да' || v === 'true' || v === 'yes' || v === '+' || v === 'д';
    };

    const price = parseNumeric(priceStr);
    const promoPrice = parseNumeric(promoPriceStr);

    items.push({
      id: `item-${i}-${article}`,
      article,
      name,
      description: '', 
      pack: '',
      pallet: '',
      price,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      isNew: checkBool(isNewRaw),
      isDistributor: checkBool(isDistRaw),
      category,
      imageUrl,
      productUrl
    });
  }

  return items;
}
