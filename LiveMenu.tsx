import React, { useEffect, useState, useMemo } from 'react';
import { db, doc, onSnapshot } from './firebase';
import Icon from './components/Icon';
import { multiTermSearch } from './lib/searchUtils';

const LiveMenu: React.FC = () => {
    const shopId = useMemo(() => {
        const path = window.location.pathname;
        if (path.startsWith('/menu/')) {
            return path.split('/menu/')[1];
        }
        return null;
    }, []);
    const [menuData, setMenuData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    useEffect(() => {
        if (!shopId) return;

        const menuRef = doc(db, 'shops', shopId, 'public_menu', 'current');
        
        const unsubscribe = onSnapshot(menuRef, (docSnap) => {
            if (docSnap.exists()) {
                setMenuData(docSnap.data());
                setError(null);
            } else {
                setError('Menu not found or not published yet.');
            }
            setLoading(false);
        }, (err) => {
            console.error('Error fetching public menu:', err);
            setError('Could not load menu. Please try again later.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [shopId]);

    const allTags = useMemo(() => {
        if (!menuData?.categories) return [];
        const tags = new Set<string>();
        menuData.categories.forEach((cat: any) => {
            cat.items?.forEach((item: any) => {
                item.tags?.forEach((tag: string) => tags.add(tag));
            });
        });
        return Array.from(tags).sort();
    }, [menuData]);

    const filteredCategories = useMemo(() => {
        if (!menuData?.categories) return [];
        
        return menuData.categories.map((cat: any) => {
            const filteredItems = cat.items?.filter((item: any) => {
                const matchesSearch = multiTermSearch(searchTerm, [
                    item.name,
                    item.description,
                    item.tags,
                    cat.name,
                    ...(item.variants?.map((v: any) => v.name) || [])
                ]);
                const matchesTag = !selectedTag || item.tags?.includes(selectedTag);
                return matchesSearch && matchesTag;
            });
            
            return { ...cat, items: filteredItems };
        }).filter((cat: any) => cat.items && cat.items.length > 0);
    }, [menuData, searchTerm, selectedTag]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading live menu...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Icon name="close" className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Oops!</h2>
                <p className="text-slate-500 max-w-xs">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{menuData.shopName}</h1>
                    <div className="flex items-center gap-2 text-xs font-bold text-primary-500 uppercase tracking-widest">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Menu
                    </div>
                </div>
                
                {/* Search & Filter */}
                <div className="max-w-3xl mx-auto px-4 pb-4 space-y-3">
                    <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search items..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                    
                    {allTags.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button 
                                onClick={() => setSelectedTag(null)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!selectedTag ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                            >
                                All
                            </button>
                            {allTags.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedTag === tag ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Content */}
            <div className="max-w-3xl mx-auto px-4 mt-8 space-y-12">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat: any, idx: number) => (
                        <div key={idx} className="space-y-4">
                            <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
                                <span className="w-8 h-1 bg-primary-500 rounded-full"></span>
                                {cat.name}
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {cat.items?.map((item: any, i: number) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 group hover:border-primary-500 transition-all shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors truncate">{item.name}</h3>
                                                {item.description && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                                )}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {item.tags.map((tag: string, ti: number) => (
                                                            <span key={ti} className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {item.image && (
                                                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {item.variants?.map((variant: any, vi: number) => (
                                                <div key={vi} className="flex justify-between items-center py-2 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{variant.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {variant.stock <= 0 ? (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 uppercase">Out of Stock</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 uppercase">Available</span>
                                                            )}
                                                            {variant.unit && <span className="text-[9px] text-slate-400 font-bold uppercase">per {variant.unit}</span>}
                                                        </div>
                                                    </div>
                                                    <p className="text-lg font-black text-primary-500">₹{variant.price}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500 font-medium">No items found matching your criteria.</p>
                        <button 
                            onClick={() => { setSearchTerm(''); setSelectedTag(null); }}
                            className="mt-4 text-primary-500 font-bold text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-3xl mx-auto px-4 mt-16 text-center">
                <p className="text-xs text-slate-400 font-medium">Powered by Retail Hub • Last updated {new Date(menuData.lastUpdated?.seconds * 1000).toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

export default LiveMenu;
