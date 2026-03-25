import React, { useState } from 'react';
import type { Dish, RawMaterial, Ingredient, RestaurantPageTab, KitchenOrder } from '../types';
import KDS from './KitchenDisplay';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

// #region Modals
const DishModal: React.FC<{
    dish: Dish | null;
    rawMaterials: RawMaterial[];
    onClose: () => void;
    onSave: (dishData: Partial<Dish>) => void;
}> = ({ dish, rawMaterials, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Dish>>(
        dish ? { ...dish } : {
        name: '',
        price: 0,
        imageUrl: '',
        ingredients: [],
        costOverhead: 0,
    });

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...(formData.ingredients || [])];
        if (field === 'id') {
            const material = rawMaterials.find(rm => rm.id === Number(value));
            newIngredients[index] = { ...newIngredients[index], id: Number(value), name: material?.name || '' };
        } else {
            newIngredients[index] = { ...newIngredients[index], [field]: value };
        }
        setFormData(prev => ({...prev, ingredients: newIngredients }));
    };

    const addIngredient = () => {
        setFormData(prev => ({...prev, ingredients: [...(prev.ingredients || []), { id: 0, name: '', quantity: 0 }]}));
    };
    
    const removeIngredient = (index: number) => {
        setFormData(prev => ({...prev, ingredients: prev.ingredients?.filter((_, i) => i !== index)}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-theme-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-theme-main animate-page-fade-in">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                     <div className="p-6 border-b border-theme-main bg-theme-surface rounded-t-3xl">
                        <h3 className="text-xl font-bold text-theme-main">{dish ? 'Edit Dish' : 'Add Dish'}</h3>
                        <p className="text-sm text-theme-muted mt-1">{dish ? 'Update dish details and recipe' : 'Create a new dish for your menu'}</p>
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Dish Name *</label>
                            <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Margherita Pizza" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                            <p className="text-[10px] text-theme-muted mt-1">The name of the dish as it appears on the menu.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Selling Price (₹) *</label>
                                <input name="price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                                <p className="text-[10px] text-theme-muted mt-1">Final price charged to the customer.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Overhead Cost (₹)</label>
                                <input name="costOverhead" type="number" step="0.01" value={formData.costOverhead} onChange={e => setFormData({...formData, costOverhead: parseFloat(e.target.value) || 0})} placeholder="0.00" title="Additional per-dish cost like gas, electricity" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                                <p className="text-[10px] text-theme-muted mt-1">Additional per-dish cost (gas, electricity, etc.)</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Image URL (Optional)</label>
                            <input name="imageUrl" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                            <p className="text-[10px] text-theme-muted mt-1">Link to an image of the dish.</p>
                        </div>
                        
                        <div className="pt-4 border-t border-theme-main">
                            <h4 className="font-bold text-theme-main mb-4">Recipe / Ingredients</h4>
                            <div className="space-y-3">
                               {formData.ingredients?.map((ing, index) => (
                                   <div key={index} className="flex items-center gap-3 bg-theme-main p-3 rounded-xl border border-theme-main">
                                       <div className="flex-grow space-y-1">
                                            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Material</label>
                                           <select value={ing.id} onChange={e => handleIngredientChange(index, 'id', e.target.value)} className="w-full p-2.5 rounded-lg bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all">
                                               <option value={0}>Select Material</option>
                                               {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                           </select>
                                       </div>
                                       <div className="w-24 space-y-1">
                                            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Qty</label>
                                           <input type="number" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full p-2.5 rounded-lg bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                                       </div>
                                       <div className="w-12 pt-5">
                                            <span className="text-sm text-theme-muted font-medium">{rawMaterials.find(rm => rm.id === ing.id)?.unit || '-'}</span>
                                       </div>
                                       <div className="pt-5">
                                           <button type="button" onClick={() => removeIngredient(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors">
                                               <Icon name="close" className="w-5 h-5" />
                                           </button>
                                       </div>
                                   </div>
                               ))}
                            </div>
                            <button type="button" onClick={addIngredient} className="mt-4 text-sm font-bold text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                                <Icon name="plus" className="w-4 h-4" /> Add Ingredient
                            </button>
                        </div>
                    </div>

                    <div className="p-6 border-t border-theme-main bg-theme-surface rounded-b-3xl flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save Dish</button>
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
                    <div className="border-b border-theme-main pb-4">
                        <h3 className="text-xl font-bold text-theme-main">{material ? 'Edit' : 'Add'} Raw Material</h3>
                        <p className="text-sm text-theme-muted mt-1">{material ? 'Update material details' : 'Add a new ingredient to your inventory'}</p>
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
    <div className="space-y-4">
        <div className="flex justify-end">
             <Tooltip content="Create a new dish" position="bottom">
                 <button onClick={() => setModalState({ type: 'add_dish', data: null })} className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm flex items-center gap-2">
                     <Icon name="plus" className="w-4 h-4" /> Add New Dish
                 </button>
             </Tooltip>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dishes.map(dish => {
          const ingredientCost = dish.ingredients.reduce((acc, ing) => {
            const material = rawMaterials.find(rm => rm.id === ing.id);
            return acc + ((material?.purchasePrice || 0) * ing.quantity);
          }, 0);
          const cost = ingredientCost + (dish.costOverhead || 0);
          const profit = dish.price - cost;
          const margin = dish.price > 0 ? (profit / dish.price) * 100 : 0;
          
          return (
          <div key={dish.id} className="bg-theme-surface rounded-3xl border border-theme-main shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-cover bg-center relative" style={{backgroundImage: `url(${dish.imageUrl || 'https://placehold.co/400x300/e2e8f0/e2e8f0/png'})`}}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <h3 className="text-lg font-bold text-white drop-shadow-md">{dish.name}</h3>
                    <p className="text-lg font-bold text-white drop-shadow-md">₹{dish.price.toFixed(2)}</p>
                </div>
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Tooltip content="Edit Dish" position="top">
                        <button onClick={() => setModalState({type: 'edit_dish', data: dish})} className="p-2 rounded-full hover:bg-theme-main text-theme-muted hover:text-primary-500 transition-colors">
                            <Icon name="edit" className="w-4 h-4"/>
                        </button>
                    </Tooltip>
                    <Tooltip content="Delete Dish" position="top">
                        <button onClick={() => setDeleteConfirm(dish)} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-theme-muted hover:text-red-500 transition-colors">
                            <Icon name="delete" className="w-4 h-4"/>
                        </button>
                    </Tooltip>
                </div>
              </div>
              <div className="mt-auto text-sm space-y-2 bg-theme-main p-3 rounded-xl border border-theme-main">
                 <div className="flex justify-between items-center">
                    <span className="text-theme-muted font-medium">Cost</span>
                    <span className="font-bold text-theme-main" title={`Ingredients: ₹${ingredientCost.toFixed(2)} + Overhead: ₹${(dish.costOverhead || 0).toFixed(2)}`}>₹{cost.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-theme-muted font-medium">Profit</span>
                    <span className={`font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{profit.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-theme-muted font-medium">Margin</span>
                    <span className={`font-bold ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>{margin.toFixed(1)}%</span>
                 </div>
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
}

const Restaurant: React.FC<RestaurantProps> = (props) => {
  const { dishes, onSaveDish, onDeleteDish, rawMaterials, onSaveRawMaterial, onDeleteRawMaterial, activeTab, setActiveTab, modalState, setModalState, orders, setOrders } = props;
  
  const handleCloseModal = () => {
    setModalState({type: null, data: null});
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant</h1>
        <div className="flex items-center bg-white dark:bg-gray-800/50 rounded-lg shadow-sm p-1 border border-gray-200 dark:border-gray-800 self-start">
            <Tooltip content="Manage Dishes" position="bottom">
                <button onClick={() => setActiveTab('dishes')} className={`px-3 py-1 text-sm font-semibold rounded-md flex-1 transition-colors ${activeTab === 'dishes' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Dishes</button>
            </Tooltip>
            <Tooltip content="Manage Raw Materials" position="bottom">
                <button onClick={() => setActiveTab('materials')} className={`px-3 py-1 text-sm font-semibold rounded-md flex-1 transition-colors ${activeTab === 'materials' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Materials</button>
            </Tooltip>
            <Tooltip content="Kitchen Display System" position="bottom">
                <button onClick={() => setActiveTab('kds')} className={`px-3 py-1 text-sm font-semibold rounded-md flex-1 transition-colors ${activeTab === 'kds' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>KDS</button>
            </Tooltip>
        </div>
      </div>
      
      {activeTab === 'dishes' && <DishesView dishes={dishes} rawMaterials={rawMaterials} setModalState={setModalState} onDeleteDish={onDeleteDish} />}
      {activeTab === 'materials' && <RawMaterialsView rawMaterials={rawMaterials} setModalState={setModalState} onDeleteRawMaterial={onDeleteRawMaterial} />}
      {activeTab === 'kds' && <KDS orders={orders} setOrders={setOrders} />}


      {(modalState.type === 'add_dish' || modalState.type === 'edit_dish') && (
        <DishModal dish={modalState.data} rawMaterials={rawMaterials} onClose={handleCloseModal} onSave={onSaveDish} />
      )}
      {(modalState.type === 'add_material' || modalState.type === 'edit_material') && (
        <RawMaterialModal material={modalState.data} onClose={handleCloseModal} onSave={onSaveRawMaterial} />
      )}
    </div>
  );
};

export default Restaurant;