
import React, { useState, useEffect, useMemo } from 'react';
import { PriceItem } from './types';
import { fetchPriceData } from './services/sheetService';

const App: React.FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchPriceData();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return '—';
    const discounted = appliedDiscount > 0 ? Math.round(price * (1 - appliedDiscount / 100)) : price;
    return new Intl.NumberFormat('ru-RU').format(discounted);
  };

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(s) || 
        item.article.toLowerCase().includes(s) || 
        item.description.toLowerCase().includes(s);
      const matchesPromo = !showPromoOnly || (item.promoPrice && item.promoPrice > 0);
      return matchesSearch && matchesPromo;
    });
  }, [items, search, showPromoOnly]);

  const groupedItems = useMemo(() => {
    const groups: { name: string; items: PriceItem[] }[] = [];
    const map: { [key: string]: number } = {};

    filteredItems.forEach(item => {
      const catName = item.category;
      if (map[catName] === undefined) {
        map[catName] = groups.length;
        groups.push({ name: catName, items: [] });
      }
      groups[map[catName]].items.push(item);
    });
    return groups;
  }, [filteredItems]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-black text-green-600 animate-pulse uppercase tracking-widest text-center px-4">
      Загрузка актуального прайса...
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* HEADER */}
      <header className="sticky top-2 sm:top-4 z-50 bg-white/95 backdrop-blur-md shadow-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-8 border border-slate-200">
        <div className="flex flex-col gap-4">
          {/* Top Row: Logo & Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-green-600 p-2 sm:p-2.5 rounded-xl text-white shadow-lg shadow-green-200">
                <i className="fas fa-filter text-xs sm:text-base"></i>
              </div>
              <h1 className="text-sm sm:text-xl font-black tracking-tight uppercase">
                ГЕЙЗЕР <span className="text-green-600">SMART PRICE</span>
              </h1>
            </div>
            <button 
              onClick={() => loadData(true)} 
              className={`p-2 hover:text-green-600 transition-all ${refreshing ? 'animate-spin text-green-600' : ''}`}
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>

          {/* Middle Row: Search */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 bg-slate-100 rounded-xl sm:rounded-2xl outline-none focus:ring-2 ring-green-500 font-bold transition-all border border-transparent focus:bg-white text-sm sm:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fas fa-search absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-base"></i>
          </div>
          
          {/* Bottom Row: Controls */}
          <div className="flex flex-wrap gap-3 items-center justify-between sm:justify-end">
            <label className="flex items-center gap-2 bg-orange-50 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-orange-200 cursor-pointer hover:bg-orange-100 transition-all group flex-1 sm:flex-none justify-center">
              <input type="checkbox" checked={showPromoOnly} onChange={e => setShowPromoOnly(e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 accent-orange-600" />
              <span className="text-[9px] sm:text-[11px] font-black text-orange-800 uppercase group-hover:text-orange-900 whitespace-nowrap">Акции</span>
            </label>
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-none justify-center">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">Скидка %</span>
              <input 
                type="number" 
                className="w-10 sm:w-12 font-black text-xs sm:text-sm outline-none border-b-2 border-slate-100 focus:border-green-500 text-center" 
                value={discount} 
                onChange={e => setDiscount(Number(e.target.value))} 
              />
              <button onClick={() => setAppliedDiscount(discount)} className="bg-slate-900 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black hover:bg-green-600 transition-all">ОК</button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="bg-white shadow-2xl rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-slate-100 ring-1 ring-black/5">
        
        {/* Mobile View (Cards) - Hidden on desktop */}
        <div className="block md:hidden">
          {groupedItems.map(group => (
            <div key={group.name} className="border-b border-slate-100">
              <div className="bg-green-50 px-4 py-3 font-black text-[10px] text-green-800 uppercase tracking-widest sticky top-[165px] z-30 shadow-sm">
                {group.name}
              </div>
              <div className="divide-y divide-slate-50">
                {group.items.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="text-[9px] font-mono text-slate-400 block mb-1">#{item.article || '—'}</span>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{item.name}</h3>
                      </div>
                      {item.imageUrl && item.imageUrl.startsWith('http') && (
                        <button onClick={() => setZoomImage(item.imageUrl)} className="w-12 h-12 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                          <img src={item.imageUrl} className="w-full h-full object-contain" alt="product" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic">{item.description || 'Нет описания'}</p>
                    
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                      <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase">
                        <span>Уп: {item.pack || '—'}</span>
                        <span>Пал: {item.pallet || '—'}</span>
                      </div>
                      <div className="text-right">
                        {item.promoPrice ? (
                          <>
                            <div className="text-[10px] text-slate-300 line-through leading-none">{formatPrice(item.price)}</div>
                            <div className="text-sm font-black text-red-600">{formatPrice(item.promoPrice)} <span className="text-[9px]">₽</span></div>
                          </>
                        ) : (
                          <div className="text-sm font-black text-slate-900">{formatPrice(item.price)} <span className="text-[9px]">₽</span></div>
                        )}
                      </div>
                    </div>
                    
                    {item.productUrl && item.productUrl.startsWith('http') && (
                      <a href={item.productUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-slate-900 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2">
                        <i className="fas fa-external-link-alt"></i> Подробнее
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (Table) - Hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-wider text-center">
                <th className="px-4 py-6 text-left w-28">Артикул</th>
                <th className="px-4 py-6 text-left min-w-[200px]">НАИМЕНОВАНИЕ</th>
                <th className="px-4 py-6 text-left min-w-[250px]">Описание</th>
                <th className="px-2 py-6 w-20">упак.</th>
                <th className="px-2 py-6 w-20">палета</th>
                <th className="px-4 py-6 w-32">ЦЕНА, руб.</th>
                <th className="px-4 py-6 w-36 bg-orange-600">АКЦИЯ, руб.</th>
                <th className="px-4 py-6 w-20">Фото</th>
                <th className="px-4 py-6 w-20">Link</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.map(group => (
                <React.Fragment key={group.name}>
                  <tr className="bg-green-50/80 border-y border-green-100">
                    <td colSpan={9} className="px-6 py-4 font-black text-[12px] text-green-900 uppercase tracking-widest">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-green-600 rounded-full shadow-sm"></div>
                        {group.name}
                      </div>
                    </td>
                  </tr>
                  {group.items.map(item => (
                    <tr key={item.id} className="group border-b border-slate-50 transition-colors hover:bg-green-50/20">
                      <td className="px-4 py-5 font-mono text-[11px] text-slate-500 font-bold">{item.article || '—'}</td>
                      <td className="px-4 py-5 font-black text-slate-800 text-[13px] leading-tight">{item.name}</td>
                      <td className="px-4 py-5 text-[11px] text-slate-500 leading-relaxed max-w-xs truncate" title={item.description}>{item.description || '—'}</td>
                      <td className="px-2 py-5 text-center font-bold text-slate-600 text-[12px]">{item.pack || '—'}</td>
                      <td className="px-2 py-5 text-center font-bold text-slate-600 text-[12px]">{item.pallet || '—'}</td>
                      <td className={`px-4 py-5 text-right font-black text-[14px] ${item.promoPrice ? 'line-through text-slate-300' : 'text-slate-900'}`}>
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-5 text-right font-black text-[16px] text-red-600 bg-orange-50/10">
                        {item.promoPrice ? formatPrice(item.promoPrice) : <span className="opacity-10">—</span>}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {item.imageUrl && item.imageUrl.startsWith('http') ? (
                          <button onClick={() => setZoomImage(item.imageUrl)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg p-1 mx-auto hover:border-green-500 transition-all hover:scale-110">
                            <img src={item.imageUrl} className="w-full h-full object-contain" loading="lazy" />
                          </button>
                        ) : <i className="fas fa-camera text-slate-100 text-lg"></i>}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {item.productUrl && item.productUrl.startsWith('http') && (
                          <a href={item.productUrl} target="_blank" rel="noreferrer" className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center mx-auto hover:bg-green-600 transition-all shadow-md">
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
          <div className="bg-white p-2 sm:p-4 rounded-3xl max-w-2xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <img src={zoomImage} className="w-full max-h-[75vh] object-contain rounded-2xl" alt="Zoomed" />
            <button onClick={() => setZoomImage(null)} className="mt-4 w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] hover:bg-green-600 transition-all">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
