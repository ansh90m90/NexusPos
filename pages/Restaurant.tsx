import React, { useState, useMemo } from 'react';
import type { Dish, DishVariant, RawMaterial, Ingredient, RestaurantPageTab, KitchenOrder } from '../types';
import KDS from './KitchenDisplay';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import ComboBox from '../components/ComboBox';

// #region Modals
const DishModal: React.FC<{
    dish: Dish | null;
    rawMaterials: RawMaterial[];
    dishes: Dish[];
    onClose: () => void;
    onSave: (dishData: Partial<Dish>) => void;
}> = ({ dish, rawMaterials, dishes, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Dish>>(
        dish ? { ...dish } : {
        name: '',
        imageUrl: '',
        variants: [{ id: -1, dishId: 0, name: 'Standard', price: 0, ingredients: [], costOverhead: 0 }],
        tags: [],
    });

    const [activeVariantIndex, setActiveVariantIndex] = useState(0);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        dishes.forEach(d => d.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [dishes]);

    const handleVariantChange = (index: number, field: keyof DishVariant, value: any) => {
        const newVariants = [...(formData.variants || [])];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };

    const handleIngredientChange = (variantIndex: number, ingredientIndex: number, field: keyof Ingredient, value: string | number) => {
        const newVariants = [...(formData.variants || [])];
        const newIngredients = [...(newVariants[variantIndex].ingredients || [])];
        
        if (field === 'id') {
            const material = rawMaterials.find(rm => rm.id === Number(value));
            newIngredients[ingredientIndex] = { ...newIngredients[ingredientIndex], id: Number(value), name: material?.name || '' };
        } else {
            newIngredients[ingredientIndex] = { ...newIngredients[ingredientIndex], [field]: value };
        }
        
        newVariants[variantIndex] = { ...newVariants[variantIndex], ingredients: newIngredients };
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };

    const addVariant = () => {
        const newVariant: DishVariant = {
            id: -Date.now(),
            dishId: formData.id || 0,
            name: '',
            price: 0,
            ingredients: [],
            costOverhead: 0
        };
        setFormData(prev => ({ ...prev, variants: [...(prev.variants || []), newVariant] }));
        setActiveVariantIndex((formData.variants?.length || 0));
    };

    const removeVariant = (index: number) => {
        if ((formData.variants?.length || 0) > 1) {
            const newVariants = formData.variants?.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, variants: newVariants }));
            if (activeVariantIndex >= (newVariants?.length || 0)) {
                setActiveVariantIndex(Math.max(0, (newVariants?.length || 0) - 1));
            }
        }
    };

    const addIngredient = (variantIndex: number) => {
        const newVariants = [...(formData.variants || [])];
        const newIngredients = [...(newVariants[variantIndex].ingredients || []), { id: 0, name: '', quantity: 0 }];
        newVariants[variantIndex] = { ...newVariants[variantIndex], ingredients: newIngredients };
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };
    
    const removeIngredient = (variantIndex: number, ingredientIndex: number) => {
        const newVariants = [...(formData.variants || [])];
        const newIngredients = newVariants[variantIndex].ingredients.filter((_, i) => i !== ingredientIndex);
        newVariants[variantIndex] = { ...newVariants[variantIndex], ingredients: newIngredients };
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const currentVariant = formData.variants?.[activeVariantIndex];

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-theme-surface rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-theme-main animate-page-fade-in overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                     <div className="p-6 border-b border-theme-main bg-theme-surface flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="p-2 -ml-2 rounded-full hover:bg-theme-main text-theme-muted transition-colors"
                            >
                                <Icon name="arrow-left" className="w-5 h-5" />
                            </button>
                            <div>
                                <h3 className="text-xl font-bold text-theme-main">{dish ? 'Edit Dish' : 'Add Dish'}</h3>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium text-sm">Cancel</button>
                             <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium text-sm">Save Dish</button>
                        </div>
                    </div>

                    <div className="flex flex-grow overflow-hidden">
                        {/* Sidebar for variants */}
                        <div className="w-64 border-r border-theme-main bg-theme-main/30 p-4 space-y-4 overflow-y-auto">
                            <h4 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] px-2">Dish Variants</h4>
                            <div className="space-y-1">
                                {formData.variants?.map((v, i) => (
                                    <div key={i} className="group relative">
                                        <button
                                            type="button"
                                            onClick={() => setActiveVariantIndex(i)}
                                            className={`w-full text-left p-3 rounded-xl transition-all flex flex-col ${activeVariantIndex === i ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'hover:bg-theme-main text-theme-main'}`}
                                        >
                                            <span className="text-sm font-bold truncate">{v.name || `Variant ${i + 1}`}</span>
                                            <span className={`text-[10px] font-medium ${activeVariantIndex === i ? 'text-white/70' : 'text-theme-muted'}`}>₹{v.price}</span>
                                        </button>
                                        {(formData.variants?.length || 0) > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={(e) => { e.stopPropagation(); removeVariant(i); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Icon name="delete" size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button 
                                type="button" 
                                onClick={addVariant}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-theme-main text-[10px] font-black text-theme-muted uppercase tracking-widest hover:border-primary-500/50 hover:text-primary-500 transition-all"
                            >
                                + Add Variant
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="flex-grow p-8 space-y-8 overflow-y-auto custom-scrollbar bg-theme-surface">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Dish Name *</label>
                                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Margherita Pizza" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Image URL</label>
                                        <input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-1">Tags</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {formData.tags?.map((tag, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    {tag}
                                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter((_, idx) => idx !== i) }))} className="hover:text-rose-500">
                                                        <Icon name="close" size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <ComboBox
                                            value=""
                                            onChange={(val) => {
                                                if (val && !formData.tags?.includes(val)) {
                                                    setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                                                }
                                            }}
                                            options={allTags}
                                            placeholder="Type or select a tag..."
                                            allowCustom={true}
                                        />
                                    </div>
                                </div>

                                {currentVariant && (
                                    <div className="space-y-6 p-6 rounded-[2rem] bg-theme-main/20 border border-theme-main">
                                        <h4 className="text-xs font-black text-theme-main uppercase tracking-[0.2em]">Editing: {currentVariant.name || 'Untitled Variant'}</h4>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Variant Name</label>
                                            <input value={currentVariant.name} onChange={e => handleVariantChange(activeVariantIndex, 'name', e.target.value)} placeholder="e.g., Small, Large, Extra Cheese" className="w-full p-3 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Price (₹)</label>
                                                <input type="number" value={currentVariant.price} onChange={e => handleVariantChange(activeVariantIndex, 'price', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black text-lg" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Overhead (₹)</label>
                                                <input type="number" value={currentVariant.costOverhead || 0} onChange={e => handleVariantChange(activeVariantIndex, 'costOverhead', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black text-lg" />
                                            </div>
                                        </div>
                                        
                                        <div className="pt-4 border-t border-theme-main/50">
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="text-[10px] font-black text-theme-main uppercase tracking-widest">Recipe Ingredients</h5>
                                                <button type="button" onClick={() => addIngredient(activeVariantIndex)} className="text-[10px] font-black text-primary-500 uppercase hover:text-primary-600 transition-colors flex items-center gap-1">
                                                    <Icon name="plus" size={12} /> Add
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {currentVariant.ingredients?.map((ing, ingIdx) => (
                                                    <div key={ingIdx} className="flex gap-2 items-end">
                                                        <div className="flex-grow">
                                                            <select value={ing.id} onChange={e => handleIngredientChange(activeVariantIndex, ingIdx, 'id', e.target.value)} className="w-full p-2.5 rounded-lg bg-theme-surface text-theme-main border border-theme-main text-xs font-bold">
                                                                <option value={0}>Select Material</option>
                                                                {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="w-20">
                                                            <input type="number" value={ing.quantity} onChange={e => handleIngredientChange(activeVariantIndex, ingIdx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full p-2.5 rounded-lg bg-theme-surface text-theme-main border border-theme-main text-xs font-black" />
                                                        </div>
                                                        <button type="button" onClick={() => removeIngredient(activeVariantIndex, ingIdx)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                            <Icon name="close" size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(currentVariant.ingredients?.length || 0) === 0 && (
                                                    <p className="text-[10px] text-theme-muted italic text-center py-4 bg-theme-surface/50 rounded-xl border border-dashed border-theme-main">No ingredients added yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RawMaterialModal: React.FC<{
    material: RawMaterial | null;
    onClose: () => void;
    onSave: (material: Partial<RawMaterial>) => void;
}> = ({ material, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<RawMaterial>>(
        material ? { ...material } : { name: '', stock: 0, unit: 'g', purchasePrice: 0 }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: name === 'stock' || name === 'purchasePrice' ? parseFloat(value) || 0 : value }))
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-theme-surface rounded-3xl shadow-2xl p-6 max-w-md w-full border border-theme-main animate-page-fade-in">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="border-b border-theme-main pb-4 flex items-center gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="p-2 -ml-2 rounded-full hover:bg-theme-main text-theme-muted transition-colors"
                            title="Go Back"
                        >
                            <Icon name="arrow-left" className="w-5 h-5" />
                        </button>
                        <div>
                            <h3 className="text-xl font-bold text-theme-main">{material ? 'Edit' : 'Add'} Raw Material</h3>
                            <p className="text-sm text-theme-muted mt-1">{material ? 'Update material details' : 'Add a new ingredient to your inventory'}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Material Name *</label>
                            <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Flour, Tomatoes" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                            <p className="text-[10px] text-theme-muted mt-1">The name of the raw material.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Current Stock *</label>
                                <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="0" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                                <p className="text-[10px] text-theme-muted mt-1">Amount currently in inventory.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Unit *</label>
                                <select name="unit" value={formData.unit} onChange={handleChange} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all">
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="pcs">pcs</option>
                                </select>
                                <p className="text-[10px] text-theme-muted mt-1">Measurement unit.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Cost per Unit (₹) *</label>
                            <input name="purchasePrice" type="number" step="0.01" value={formData.purchasePrice} onChange={handleChange} placeholder="0.00" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                            <p className="text-[10px] text-theme-muted mt-1">Average cost to purchase one unit.</p>
                        </div>
                    </div>

                     <div className="flex justify-end gap-4 pt-4 border-t border-theme-main">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save Material</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// #endregion

// #region Page Views
const DishesView: React.FC<{
  dishes: Dish[];
  rawMaterials: RawMaterial[];
  setModalState: (state: { type: string, data: any }) => void;
  onDeleteDish: (dishId: number) => { success: boolean, message: string };
}> = ({ dishes, rawMaterials, setModalState, onDeleteDish }) => {
  const [deleteConfirm, setDeleteConfirm] = useState<Dish | null>(null);
  const toast = useToast();

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-black text-theme-main tracking-tight">Main Menu</h2>
                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">{dishes.length} Dishes available</p>
             </div>
             <Tooltip content="Create a new dish" position="bottom">
                 <button onClick={() => setModalState({ type: 'add_dish', data: null })} className="px-8 py-4 text-xs font-black uppercase tracking-widest rounded-[2rem] bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/25 flex items-center gap-3">
                     <Icon name="plus" size={18} /> Add New Dish
                 </button>
             </Tooltip>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dishes.map(dish => {
          const variantsWithStats = dish.variants?.map(v => {
            const ingredientCost = v.ingredients?.reduce((acc, ing) => {
                const material = rawMaterials.find(rm => rm.id === ing.id);
                return acc + ((material?.purchasePrice || 0) * ing.quantity);
            }, 0) || 0;
            const cost = ingredientCost + (v.costOverhead || 0);
            const profit = v.price - cost;
            const margin = v.price > 0 ? (profit / v.price) * 100 : 0;
            return { v, cost, profit, margin };
          }) || [];

          const prices = variantsWithStats.map(s => s.v.price);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          const priceDisplay = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;

          return (
          <div key={dish.id} className="bg-theme-surface backdrop-blur-xl rounded-[2.5rem] border border-theme-main shadow-xl shadow-theme-main/10 overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300">
            <div className="w-full h-48 bg-cover bg-center relative" style={{backgroundImage: `url(${dish.imageUrl || 'https://picsum.photos/seed/dish/400/300'})`}}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({type: 'edit_dish', data: dish})} className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-primary-500 transition-all">
                        <Icon name="edit" size={16}/>
                    </button>
                    <button onClick={() => setDeleteConfirm(dish)} className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-rose-500 transition-all">
                        <Icon name="delete" size={16}/>
                    </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-black text-white tracking-tight truncate">{dish.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-sm font-black text-white/90">{priceDisplay}</p>
                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{(dish.variants?.length || 0)} Variants</p>
                    </div>
                </div>
            </div>
            <div className="p-6 flex-grow flex flex-col gap-4 text-theme-main">
              {dish.tags && dish.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      {dish.tags.map((tag, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 bg-theme-main text-theme-muted rounded-lg border border-theme-main uppercase font-black tracking-tighter">
                              {tag}
                          </span>
                      ))}
                  </div>
              )}
              
              <div className="space-y-2 mt-auto">
                 {variantsWithStats.map((stats, idx) => (
                     <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-theme-main rounded-xl border border-theme-main">
                         <div className="flex flex-col">
                             <span className="font-black text-theme-main uppercase tracking-tighter">{stats.v.name}</span>
                             <span className="text-theme-muted font-bold tracking-widest">Margin: <span className={stats.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{stats.margin.toFixed(0)}%</span></span>
                         </div>
                         <div className="text-right">
                             <span className="font-black text-theme-main block">₹{stats.v.price}</span>
                             <span className="text-theme-muted font-bold uppercase tracking-tighter">Cost: ₹{stats.cost.toFixed(0)}</span>
                         </div>
                     </div>
                 ))}
              </div>
            </div>
          </div>
        )})}
      </div>
      <ConfirmationModal 
        isOpen={!!deleteConfirm}
        title="Delete Dish"
        message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
        onConfirm={() => {
            if (deleteConfirm) {
                const res = onDeleteDish(deleteConfirm.id);
                setDeleteConfirm(null);
                toast.showToast(res.message, res.success ? 'success' : 'error');
            }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

const RawMaterialsView: React.FC<{
    rawMaterials: RawMaterial[];
    setModalState: (state: { type: string, data: any }) => void;
    onDeleteRawMaterial: (materialId: number) => { success: boolean, message: string };
}> = ({ rawMaterials, setModalState, onDeleteRawMaterial }) => {
    const [deleteConfirm, setDeleteConfirm] = useState<RawMaterial | null>(null);
    const toast = useToast();

    return (
      <div className="space-y-4">
            <div className="flex justify-end">
                 <Tooltip content="Add a new raw material" position="bottom">
                     <button onClick={() => setModalState({ type: 'add_material', data: null })} className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm flex items-center gap-2">
                         <Icon name="plus" className="w-4 h-4" /> Add New Material
                     </button>
                 </Tooltip>
            </div>
            <div className="bg-theme-surface rounded-3xl border border-theme-main shadow-sm overflow-hidden">
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-sm text-left text-theme-muted">
                        <thead className="text-xs text-theme-muted uppercase bg-theme-main border-b border-theme-main">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Material</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Stock</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Unit</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Cost/Unit</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rawMaterials.map(mat => (
                                <tr key={mat.id} className="border-b border-theme-main transition-colors hover:bg-theme-main">
                                    <td className="px-6 py-4 font-bold text-theme-main">{mat.name}</td>
                                    <td className="px-6 py-4 font-medium text-theme-main">{mat.stock}</td>
                                    <td className="px-6 py-4">{mat.unit}</td>
                                    <td className="px-6 py-4 text-right font-medium text-theme-main">₹{mat.purchasePrice.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <Tooltip content="Edit Material" position="top">
                                            <button onClick={() => setModalState({type: 'edit_material', data: mat})} className="font-bold text-primary-500 hover:text-primary-600 transition-colors">Edit</button>
                                        </Tooltip>
                                        <Tooltip content="Delete Material" position="top">
                                            <button onClick={() => setDeleteConfirm(mat)} className="font-bold text-red-500 hover:text-red-600 transition-colors">Delete</button>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="lg:hidden space-y-3 p-4">
                    {rawMaterials.map(mat => (
                        <div key={mat.id} className="bg-theme-main rounded-2xl p-4 border border-theme-main shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-theme-main text-lg">{mat.name}</h3>
                                    <p className="text-sm text-theme-muted mt-1">Cost: ₹{mat.purchasePrice.toFixed(2)} / {mat.unit}</p>
                                </div>
                                <div className="text-right bg-theme-surface px-3 py-1.5 rounded-lg border border-theme-main">
                                    <p className="font-bold text-lg text-theme-main">{mat.stock}</p>
                                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">{mat.unit}</p>
                                </div>
                            </div>
                            <div className="flex justify-end items-center mt-4 pt-4 border-t border-theme-main gap-4">
                                <Tooltip content="Edit Material" position="top">
                                    <button onClick={() => setModalState({type: 'edit_material', data: mat})} className="font-bold text-primary-500 hover:text-primary-600 transition-colors text-sm">Edit</button>
                                </Tooltip>
                                <Tooltip content="Delete Material" position="top">
                                    <button onClick={() => setDeleteConfirm(mat)} className="font-bold text-red-500 hover:text-red-600 transition-colors text-sm">Delete</button>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <ConfirmationModal 
                isOpen={!!deleteConfirm}
                title="Delete Material"
                message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
                onConfirm={() => {
                    if (deleteConfirm) {
                        const res = onDeleteRawMaterial(deleteConfirm.id);
                        setDeleteConfirm(null);
                        toast.showToast(res.message, res.success ? 'success' : 'error');
                    }
                }}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
};
// #endregion

interface RestaurantProps {
  dishes: Dish[];
  onSaveDish: (dish: Partial<Dish>) => void;
  onDeleteDish: (dishId: number) => { success: boolean, message: string };
  rawMaterials: RawMaterial[];
  onSaveRawMaterial: (material: Partial<RawMaterial>) => void;
  onDeleteRawMaterial: (materialId: number) => { success: boolean, message: string };
  activeTab: RestaurantPageTab;
  setActiveTab: (tab: RestaurantPageTab) => void;
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
  orders: KitchenOrder[];
  setOrders: React.Dispatch<React.SetStateAction<KitchenOrder[]>>;
  setCurrentPage: (page: any) => void;
}

const Restaurant: React.FC<RestaurantProps> = (props) => {
  const { dishes, onSaveDish, onDeleteDish, rawMaterials, onSaveRawMaterial, onDeleteRawMaterial, activeTab, setActiveTab, modalState, setModalState, orders, setOrders, setCurrentPage } = props;
  
  const handleCloseModal = () => {
    setModalState({type: null, data: null});
  }

  return (
    <div className="space-y-8 p-4 sm:p-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setCurrentPage('Dashboard')} 
                className="p-3 rounded-2xl bg-theme-surface/50 backdrop-blur-md border border-theme-main text-theme-muted hover:text-primary-500 transition-all shadow-lg shadow-theme-main/20"
                title="Back to Dashboard"
            >
                <Icon name="arrow-left" size={20} />
            </button>
            <div>
                <h1 className="text-4xl font-black text-theme-main tracking-tighter">Restaurant</h1>
                <p className="text-xs font-bold text-theme-muted uppercase tracking-[0.2em] mt-1">Manage dishes, materials and kitchen</p>
            </div>
        </div>
        <div className="flex items-center bg-theme-surface/50 backdrop-blur-md rounded-3xl p-1.5 border border-theme-main shadow-lg shadow-theme-main/20 self-start">
            <Tooltip content="Manage Foods & Beverages" position="bottom">
                <button 
                    onClick={() => setActiveTab('dishes')} 
                    className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${activeTab === 'dishes' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-theme-muted hover:text-theme-main'}`}
                >
                    Dishes
                </button>
            </Tooltip>
            <Tooltip content="Inventory for Restaurant" position="bottom">
                <button 
                    onClick={() => setActiveTab('materials')} 
                    className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${activeTab === 'materials' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-theme-muted hover:text-theme-main'}`}
                >
                    Raw Materials
                </button>
            </Tooltip>
            <Tooltip content="Kitchen Display System" position="bottom">
                <button 
                    onClick={() => setActiveTab('kds')} 
                    className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${activeTab === 'kds' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-theme-muted hover:text-theme-main'}`}
                >
                    KDS
                </button>
            </Tooltip>
        </div>
      </div>
      
      {activeTab === 'dishes' && <DishesView dishes={dishes} rawMaterials={rawMaterials} setModalState={setModalState} onDeleteDish={onDeleteDish} />}
      {activeTab === 'materials' && <RawMaterialsView rawMaterials={rawMaterials} setModalState={setModalState} onDeleteRawMaterial={onDeleteRawMaterial} />}
      {activeTab === 'kds' && <KDS orders={orders} setOrders={setOrders} />}


      {(modalState.type === 'add_dish' || modalState.type === 'edit_dish') && (
        <DishModal dish={modalState.data} rawMaterials={rawMaterials} dishes={dishes} onClose={handleCloseModal} onSave={onSaveDish} />
      )}
      {(modalState.type === 'add_material' || modalState.type === 'edit_material') && (
        <RawMaterialModal material={modalState.data} onClose={handleCloseModal} onSave={onSaveRawMaterial} />
      )}
    </div>
  );
};

export default Restaurant;