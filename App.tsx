
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
    
    try {
      const data = await fetchPriceData();
      setItems(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Critical update error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Обработка клавиши ESC для закрытия фото
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const formatPrice = (price: number) => {
    const discounted = appliedDiscount > 0 ? Math.round(price * (1 - appliedDiscount / 100)) : price;
    return new Intl.NumberFormat('ru-RU').format(discounted);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLower) || 
        item.article.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower);
      
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
    // Сортируем категории для предсказуемого порядка
    return Object.keys(groups).sort().map(name => ({
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
      'Цена': i.price,
      'Акция': i.promoPrice || '',
      'Новинка': i.isNew ? 'Да' : 'Нет',
      'Дистрибьютор': i.isDistributor ? 'Да' : 'Нет'
    }));
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Прайс-лист");
    (window as any).XLSX.writeFile(wb, `geizer_price_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-green-600 border-r-transparent border-b-4 border-l-transparent shadow-xl"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-tint text-green-600 animate-pulse text-xl"></i>
          </div>
        </div>
        <p className="mt-8 text-green-900 font-black tracking-[0.2em] animate-pulse uppercase text-[10px]">Подключение к базе Гейзер...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
      {/* Header Bar */}
      <header className="sticky top-4 z-50 bg-white/80 backdrop-blur-xl shadow-2xl rounded-[2rem] p-5 mb-8 border border-white/40 transition-all ring-1 ring-black/5">
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-2.5 rounded-2xl shadow-lg shadow-green-200">
                <i className="fas fa-tint text-white text-xl"></i>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">ГЕЙЗЕР <span className="text-green-600 font-light mx-0.5">|</span> ПРАЙС</h1>
              <button 
                onClick={() => loadData(true)} 
                disabled={refreshing}
                title="Синхронизировать с Таблицей"
                className={`ml-auto sm:ml-2 text-slate-400 hover:text-green-600 p-2.5 rounded-full hover:bg-green-50 transition-all active:scale-90 ${refreshing ? 'animate-spin text-green-600' : ''}`}
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
            
            <div className="relative group">
              <input
                type="text"
                placeholder="Поиск по артикулу или названию..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-100/50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl shadow-inner transition-all outline-none text-slate-700 font-bold placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors"></i>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-slate-100/80 p-1.5 rounded-[1.25rem] border border-slate-200 shadow-inner gap-1">
              <button 
                onClick={() => setShowNewOnly(!showNewOnly)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-300 ${showNewOnly ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-105' : 'text-slate-500 hover:bg-white'}`}
              >
                Новинки
              </button>
              <button 
                onClick={() => setShowDistributorOnly(!showDistributorOnly)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-300 ${showDistributorOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'text-slate-500 hover:bg-white'}`}
              >
                Дистрибьютор
              </button>
              <button 
                onClick={() => setShowPromoOnly(!showPromoOnly)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-300 ${showPromoOnly ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:bg-white'}`}
              >
                Акции
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1.5">Персональная скидка</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    className="w-10 bg-transparent font-black text-slate-900 text-sm outline-none border-b-2 border-slate-100 focus:border-green-500 transition-colors"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                  />
                  <span className="font-black text-slate-900 text-sm">%</span>
                  <button 
                    onClick={() => setAppliedDiscount(discount)} 
                    className="ml-1 bg-slate-900 text-white px-2.5 py-1 rounded-lg hover:bg-green-600 transition-all text-[10px] font-black shadow-md active:scale-95"
                  >
                    ПРИМЕНИТЬ
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadExcel}
              className="bg-slate-900 text-white h-[54px] px-6 rounded-2xl hover:bg-black flex items-center gap-3 shadow-xl shadow-slate-200 transition-all active:scale-95 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-green-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0"></div>
              <i className="fas fa-file-excel relative z-10 group-hover:scale-110 transition-transform"></i>
              <span className="font-bold text-sm relative z-10">EXCEL</span>
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-4 flex items-center justify-between px-3">
             <div className="text-[9px] text-slate-400 flex items-center gap-2 uppercase tracking-widest font-black">
              <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-orange-400 animate-spin' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse'}`}></span>
              Последняя синхронизация: {lastUpdated.toLocaleTimeString()}
            </div>
            {filteredItems.length !== items.length && (
              <div className="text-[10px] text-green-700 font-black uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
                Результатов: {filteredItems.length}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Product List Container */}
      <div className="bg-white shadow-2xl rounded-[3rem] overflow-hidden border border-slate-100 ring-1 ring-black/5 mb-10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-[0.2em] text-[10px] font-black">
                <th className="px-8 py-6 text-left border-r border-slate-800/50 w-36">Артикул / Статус</th>
                <th className="px-8 py-6 text-left">Наименование</th>
                <th className="px-8 py-6 text-right w-44">РРЦ</th>
                <th className="px-8 py-6 text-right w-44 bg-orange-600/95 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rotate-45 translate-x-6 -translate-y-6"></div>
                  Акция
                </th>
                <th className="px-8 py-6 text-center w-36">Медиа</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-40 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                        <i className="fas fa-search text-3xl text-slate-200"></i>
                      </div>
                      <p className="font-black uppercase tracking-[0.3em] text-slate-300 text-xs">Ничего не найдено</p>
                      <button 
                        onClick={() => {setSearch(''); setShowNewOnly(false); setShowDistributorOnly(false); setShowPromoOnly(false);}}
                        className="text-green-600 font-bold text-[10px] uppercase border-b border-green-200 pb-1 hover:text-green-800 transition-colors"
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedItems.map(group => (
                  <React.Fragment key={group.name}>
                    <tr className="bg-slate-50/90 sticky z-10 top-[188px] backdrop-blur-md">
                      <td colSpan={5} className="px-8 py-4 font-black text-slate-900 border-y border-slate-200 uppercase text-[11px] tracking-[0.25em]">
                        <div className="flex items-center gap-4">
                          <span className="w-2 h-7 bg-green-600 rounded-full"></span>
                          {group.name}
                          <div className="h-px flex-1 bg-slate-200/60 ml-4"></div>
                          <span className="ml-4 px-3 py-1 bg-white border border-slate-200 text-slate-400 rounded-lg text-[9px] font-black tracking-normal">
                            {group.items.length} ЕД.
                          </span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map(item => (
                      <tr key={item.id} className="group hover:bg-green-50/20 border-b border-slate-100 transition-all duration-150">
                        <td className="px-8 py-6 border-r border-slate-50">
                          <div className="flex flex-col gap-2">
                             {item.isNew && (
                               <span className="inline-flex items-center justify-center px-2 py-0.5 bg-green-600 text-white text-[8px] rounded font-black uppercase shadow-sm">
                                 NEW
                               </span>
                             )}
                             {item.isDistributor && (
                               <span className="inline-flex items-center justify-center px-2 py-0.5 bg-blue-600 text-white text-[8px] rounded font-black uppercase shadow-sm">
                                 ДИСТ
                               </span>
                             )}
                            <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                              {item.article}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-800 text-[15px] leading-relaxed group-hover:text-green-700 transition-colors">
                            {item.name}
                          </div>
                        </td>
                        <td className={`px-8 py-6 text-right font-black text-lg tabular-nums ${item.promoPrice ? 'line-through text-slate-200 decoration-slate-300 decoration-2' : 'text-slate-900'}`}>
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-8 py-6 text-right font-black text-xl tabular-nums text-red-600 bg-orange-50/10 group-hover:bg-orange-50/40 transition-all border-l border-orange-50/50">
                          {item.promoPrice ? (
                            <div className="flex flex-col items-end">
                              {formatPrice(item.promoPrice)}
                              <span className="text-[9px] font-black text-orange-500 uppercase mt-1">ВЫГОДА!</span>
                            </div>
                          ) : (
                            <span className="text-slate-100 font-light opacity-50">—</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-4">
                            {item.imageUrl ? (
                              <button 
                                onClick={() => setZoomImage(item.imageUrl)}
                                className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 hover:border-green-500 hover:shadow-xl hover:shadow-green-100 transition-all active:scale-90 bg-white group/img shadow-sm"
                              >
                                <img src={item.imageUrl} className="w-full h-full object-contain p-2 group-hover/img:scale-110 transition-transform" loading="lazy" />
                              </button>
                            ) : (
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-200">
                                <i className="fas fa-camera text-sm"></i>
                              </div>
                            )}
                            {item.productUrl && (
                              <a 
                                href={item.productUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-lg active:scale-95 group/link"
                              >
                                <i className="fas fa-link text-[10px] group-hover/link:rotate-45 transition-transform"></i>
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

      <footer className="mt-20 pb-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-20 bg-slate-200"></div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">
            Гейзер • Профессиональные системы очистки воды
          </div>
          <p className="text-slate-300 text-[9px] max-w-md uppercase leading-relaxed font-bold tracking-widest">
            Данный прайс-лист является справочным и обновляется в режиме реального времени напрямую из Google Таблиц.
          </p>
        </div>
      </footer>

      {/* Modern Zoom Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-12 cursor-zoom-out animate-in fade-in duration-300" 
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="relative bg-white p-4 sm:p-8 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 group overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
               <img 
                src={zoomImage} 
                className="max-w-full max-h-[70vh] object-contain rounded-2xl animate-in zoom-in duration-500 ease-out shadow-inner" 
                alt="Product Preview"
               />
               <div className="mt-8 flex justify-center gap-6">
                 <button 
                  onClick={() => setZoomImage(null)}
                  className="bg-slate-900 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all hover:bg-green-600 hover:scale-105 active:scale-95 shadow-xl"
                 >
                   Закрыть окно
                 </button>
               </div>
            </div>
            <button 
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-4"
              onClick={() => setZoomImage(null)}
            >
              <i className="fas fa-times text-4xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
