
import React, { useState, useEffect, useMemo } from 'react';
import { PriceItem } from './types';
import { fetchPriceData } from './services/sheetService';

const App: React.FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showDistributorOnly, setShowDistributorOnly] = useState(false);
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    
    const data = await fetchPriceData();
    setItems(data);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatPrice = (price: number) => {
    const discounted = appliedDiscount > 0 ? Math.round(price * (1 - appliedDiscount / 100)) : price;
    return new Intl.NumberFormat('ru-RU').format(discounted);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.article.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesNew = !showNewOnly || item.isNew;
      const matchesDist = !showDistributorOnly || item.isDistributor;
      const matchesPromo = !showPromoOnly || (item.promoPrice && item.promoPrice > 0);
      
      return matchesSearch && matchesNew && matchesDist && matchesPromo;
    });
  }, [items, search, showNewOnly, showDistributorOnly, showPromoOnly]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PriceItem[] } = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'Прочее';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.keys(groups).map(name => ({
      name,
      items: groups[name]
    }));
  }, [filteredItems]);

  const handleDownloadExcel = () => {
    const wb = (window as any).XLSX.utils.book_new();
    const data = filteredItems.map(i => ({
      'Категория': i.category,
      'Артикул': i.article,
      'Наименование': i.name,
      'Упак.': i.pack,
      'Цена': i.price,
      'Акция': i.promoPrice || ''
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Прайс-лист");
    (window as any).XLSX.writeFile(wb, `geizer_price_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600 mb-4"></div>
        <p className="text-green-800 font-bold animate-pulse">Загрузка актуальных цен из Google Таблиц...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header Sticky Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl p-4 mb-8 border border-green-100 transition-all">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-green-700 tracking-tight">ГЕЙЗЕР ДИНАМИЧЕСКИЙ ПРАЙС</h1>
              <button 
                onClick={() => loadData(true)} 
                disabled={refreshing}
                title="Обновить данные"
                className={`text-green-600 hover:bg-green-100 p-2 rounded-full transition-all ${refreshing ? 'animate-spin' : ''}`}
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
            
            <div className="relative group">
              <input
                type="text"
                placeholder="Поиск товара или категории..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-xl shadow-inner transition-all outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"></i>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="grid grid-cols-1 gap-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 hover:text-green-600 transition-colors">
                <input type="checkbox" checked={showNewOnly} onChange={e => setShowNewOnly(e.target.checked)} className="w-4 h-4 rounded accent-green-600"/>
                НОВИНКИ
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors">
                <input type="checkbox" checked={showDistributorOnly} onChange={e => setShowDistributorOnly(e.target.checked)} className="w-4 h-4 rounded accent-blue-600"/>
                ДИСТРИБЬЮТОР
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 hover:text-orange-600 transition-colors">
                <input type="checkbox" checked={showPromoOnly} onChange={e => setShowPromoOnly(e.target.checked)} className="w-4 h-4 rounded accent-orange-600"/>
                АКЦИИ
              </label>
            </div>

            <div className="flex items-center gap-2 bg-green-50 p-3 rounded-xl border border-green-100">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-green-700 uppercase">Ваша скидка</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    className="w-16 px-2 py-1 bg-white border border-green-200 rounded font-bold text-green-800"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                  />
                  <span className="font-bold text-green-700">%</span>
                  <button onClick={() => setAppliedDiscount(discount)} className="bg-green-600 text-white px-3 py-1 rounded shadow-sm hover:bg-green-700 transition">Применить</button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadExcel}
              className="bg-gray-900 text-white px-5 py-3 rounded-xl hover:bg-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <i className="fas fa-file-export"></i>
              <span>Экспорт</span>
            </button>
          </div>
        </div>
        {lastUpdated && (
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Данные актуальны на: {lastUpdated.toLocaleTimeString()} (Google Sheets Sync Active)
          </div>
        )}
      </header>

      {/* Content Table */}
      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Арт.</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest">Наименование</th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest">Упак.</th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest">Цена</th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest bg-orange-600">Акция</th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest">Медиа</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    Ничего не найдено по вашему запросу...
                  </td>
                </tr>
              ) : (
                groupedItems.map(group => (
                  <React.Fragment key={group.name}>
                    <tr className="bg-green-50/80 backdrop-blur-sm">
                      <td colSpan={6} className="px-6 py-3 font-black text-green-900 border-y border-green-100 uppercase text-xs tracking-[0.2em] flex items-center gap-2">
                        <i className="fas fa-layer-group text-green-600"></i>
                        {group.name}
                        <span className="ml-auto bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-[10px] lowercase">{group.items.length} поз.</span>
                      </td>
                    </tr>
                    {group.items.map(item => (
                      <tr key={item.id} className="group hover:bg-gray-50 border-b border-gray-100 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm font-bold text-gray-400 group-hover:text-green-600 transition-colors">
                          {item.isNew && <span className="inline-block px-1.5 py-0.5 bg-green-600 text-white text-[9px] rounded mb-1 mr-1">NEW</span>}
                          {item.article}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800 leading-tight mb-0.5">{item.name}</div>
                          <div className="text-[11px] text-gray-400 italic line-clamp-1">{item.description}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-bold text-gray-500">
                          {item.pack}
                        </td>
                        <td className={`px-6 py-4 text-right font-black ${item.promoPrice ? 'line-through text-gray-300 text-sm' : 'text-gray-900'}`}>
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-red-600 bg-orange-50/30 group-hover:bg-orange-100/50 transition-colors">
                          {item.promoPrice ? formatPrice(item.promoPrice) : <span className="text-gray-200">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {item.imageUrl ? (
                              <button 
                                onClick={() => setZoomImage(item.imageUrl)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-green-500 transition-all active:scale-90"
                              >
                                <img src={item.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                              </button>
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                                <i className="fas fa-image text-xs"></i>
                              </div>
                            )}
                            {item.productUrl && (
                              <a 
                                href={item.productUrl} 
                                target="_blank" 
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-green-600 hover:text-white flex items-center justify-center transition-all"
                              >
                                <i className="fas fa-link text-xs"></i>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="max-w-full max-h-[90vh] rounded-xl shadow-2xl ring-4 ring-white/10" />
          <button className="absolute top-6 right-6 text-white text-3xl hover:rotate-90 transition-transform">&times;</button>
        </div>
      )}
    </div>
  );
};

export default App;
