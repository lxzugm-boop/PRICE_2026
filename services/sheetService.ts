
import { PriceItem } from '../types';

/**
 * Ссылка на Google Таблицу пользователя (CSV).
 */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2G6BGYc08F8C3AG3gOP4ap13flDtjagG5oxbgjwgYn8srzldiuZJt_vFnLMbW9uG0X6GSTdGgYcJU/pub?gid=264825056&single=true&output=csv';

export async function fetchPriceData(): Promise<PriceItem[]> {
  try {
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
  
  // Регулярное выражение для разделения CSV с учетом текста в кавычках
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const lines = csv.split(/\r?\n/);
  
  if (lines.length < 2) return [];

  // Начинаем со 2-й строки (индекс 1), так как первая — заголовки
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = line.split(regex).map(cell => 
      cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
    );

    /**
     * МАППИНГ ПО СКРИНШОТУ:
     * A(0): list (byt/prom) -> category
     * B(1): article
     * C(2): name
     * H(7): РРЦ -> price
     * I(8): АКЦ -> promoPrice
     * M(12): image_url
     * N(13): product_url
     */
    const categoryRaw = row[0] || '';
    const article = row[1] || '';
    const name = row[2] || '';
    const priceStr = row[7] || '';
    const promoPriceStr = row[8] || '';
    const imageUrl = row[12] || '';
    const productUrl = row[13] || '';

    if (!name && !article) continue;

    // Преобразование "byt" -> "Бытовой сегмент", "prom" -> "Промышленный сегмент"
    let category = 'Прочее';
    if (categoryRaw.toLowerCase().includes('byt')) category = 'Бытовой сегмент';
    if (categoryRaw.toLowerCase().includes('prom')) category = 'Промышленный сегмент';

    const parseNumeric = (val: string) => {
      if (!val) return 0;
      const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };

    const price = parseNumeric(priceStr);
    const promoPrice = parseNumeric(promoPriceStr);

    items.push({
      id: `item-${i}-${article}`,
      article,
      name,
      description: '', // В вашей таблице на скрине нет явного описания
      pack: '',
      pallet: '',
      price,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      isNew: false, // Можно добавить логику, если есть столбец для новинок
      isDistributor: false,
      category,
      imageUrl,
      productUrl
    });
  }

  return items;
}
