
import { PriceItem } from '../types';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2G6BGYc08F8C3AG3gOP4ap13flDtjagG5oxbgjwgYn8srzldiuZJt_vFnLMbW9uG0X6GSTdGgYcJU/pub?gid=264825056&single=true&output=csv';

export async function fetchPriceData(): Promise<PriceItem[]> {
  try {
    const cacheBuster = `&cache_tick=${new Date().getTime()}`;
    const response = await fetch(SHEET_CSV_URL + cacheBuster);
    if (!response.ok) throw new Error('Ошибка загрузки');
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Ошибка:', error);
    return [];
  }
}

function parseCSV(csv: string): PriceItem[] {
  const items: PriceItem[] = [];
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const lines = csv.split(/\r?\n/);
  
  let currentCategory = 'Общий раздел';

  // Начинаем со строки с данными (обычно 3-я строка, индекс 2)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = line.split(regex).map(cell => 
      cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
    );

    if (row.length < 3) continue;

    const article = row[1] || '';
    const name = row[2] || '';
    const description = row[3] || '';
    const pack = row[5] || '';    
    const pallet = row[6] || '';  
    const priceStr = row[7] || ''; 
    const promoPriceStr = row[8] || ''; 
    const imageUrl = row[12] || ''; 
    const productUrl = row[13] || '';

    // ЛОГИКА ОПРЕДЕЛЕНИЯ КАТЕГОРИИ (ЗАГОЛОВКА):
    // Если артикула нет, а имя есть — это новая категория
    if (!article && name) {
      currentCategory = name;
      continue; 
    }

    // Если нет ни имени, ни артикула - пропускаем
    if (!name && !article) continue;

    const parseNumeric = (val: string) => {
      if (!val) return 0;
      const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const price = parseNumeric(priceStr);
    const promoPrice = parseNumeric(promoPriceStr);

    items.push({
      id: `item-${i}-${article || Math.random()}`,
      article,
      name,
      description,
      pack,
      pallet,
      price,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      isNew: false,
      isDistributor: false,
      category: currentCategory, // Присваиваем текущую активную категорию
      imageUrl,
      productUrl
    });
  }
  return items;
}
