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
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                     <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="text-xl font-bold">{dish ? 'Edit Dish' : 'Add Dish'}</h3>
                    </div>
                    <div className="p-4 space-y-4 overflow-y-auto">
                        <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Dish Name" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} placeholder="Price" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" required />
                            <input name="costOverhead" type="number" step="0.01" value={formData.costOverhead} onChange={e => setFormData({...formData, costOverhead: parseFloat(e.target.value) || 0})} placeholder="Additional Cost (Gas, etc.)" title="Additional per-dish cost like gas, electricity" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                        </div>
                        <input name="imageUrl" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="Image URL" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                        
                        <h4 className="font-semibold pt-2 text-sm">Ingredients</h4>
                        <div className="space-y-2">
                           {formData.ingredients?.map((ing, index) => (
                               <div key={index} className="flex items-center gap-2">
                                   <select value={ing.id} onChange={e => handleIngredientChange(index, 'id', e.target.value)} className="flex-grow p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm">
                                       <option value={0}>Select Material</option>
                                       {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                                   </select>
                                   <input type="number" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" className="w-24 p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                                   <span className="w-12 text-sm">{rawMaterials.find(rm => rm.id === ing.id)?.unit || ''}</span>
                                   <button type="button" onClick={() => removeIngredient(index)} className="text-red-500 hover:text-red-700">Remove</button>
                               </div>
                           ))}
                        </div>
                        <button type="button" onClick={addIngredient} className="text-sm text-primary-600 hover:text-primary-800">+ Add Ingredient</button>
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 mt-auto bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">Save</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-xl font-bold">{material ? 'Edit' : 'Add'} Material</h3>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Material Name" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="Stock" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" required />
                        <select name="unit" value={formData.unit} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="pcs">pcs</option>
                        </select>
                    </div>
                    <input name="purchasePrice" type="number" step="0.01" value={formData.purchasePrice} onChange={handleChange} placeholder="Cost / Unit" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" required />
                     <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">Save</button>
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
                 <button onClick={() => setModalState({ type: 'add_dish', data: null })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition">Add New Dish</button>
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
          <div key={dish.id} className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
            <div className="w-full h-40 bg-cover bg-center" style={{backgroundImage: `url(${dish.imageUrl || 'https://placehold.co/400x300/e2e8f0/e2e8f0/png'})`}}></div>
            <div className="p-3 flex-grow flex flex-col">
              <div className="flex justify-between items-start">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{dish.name}</h3>
                <div className="flex items-center">
                    <Tooltip content="Edit Dish" position="top">
                        <button onClick={() => setModalState({type: 'edit_dish', data: dish})} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <Icon name="edit" className="w-4 h-4"/>
                        </button>
                    </Tooltip>
                    <Tooltip content="Delete Dish" position="top">
                        <button onClick={() => setDeleteConfirm(dish)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <Icon name="delete" className="w-4 h-4"/>
                        </button>
                    </Tooltip>
                </div>
              </div>
              <p className="text-sm font-semibold text-primary-500 mt-1">₹{dish.price.toFixed(2)}</p>
              <div className="mt-2 text-xs flex-grow">
                 <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                    <span title={`Ingredients: ₹${ingredientCost.toFixed(2)} + Overhead: ₹${(dish.costOverhead || 0).toFixed(2)}`}>₹{cost.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Profit:</span>
                    <span className={`font-semibold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>₹{profit.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Margin:</span>
                    <span className={`font-semibold ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>{margin.toFixed(1)}%</span>
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
                     <button onClick={() => setModalState({ type: 'add_material', data: null })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition">Add New Material</button>
                 </Tooltip>
            </div>
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60">
                            <tr>
                                <th className="px-4 py-2">Material</th>
                                <th className="px-4 py-2">Stock</th>
                                <th className="px-4 py-2">Unit</th>
                                <th className="px-4 py-2 text-right">Cost/Unit</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rawMaterials.map(mat => (
                                <tr key={mat.id} className="border-b dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{mat.name}</td>
                                    <td className="px-4 py-2">{mat.stock}</td>
                                    <td className="px-4 py-2">{mat.unit}</td>
                                    <td className="px-4 py-2 text-right">₹{mat.purchasePrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                        <Tooltip content="Edit Material" position="top">
                                            <button onClick={() => setModalState({type: 'edit_material', data: mat})} className="font-medium text-primary-600 dark:text-primary-500 hover:underline text-xs">Edit</button>
                                        </Tooltip>
                                        <Tooltip content="Delete Material" position="top">
                                            <button onClick={() => setDeleteConfirm(mat)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs">Delete</button>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="lg:hidden space-y-3 p-3">
                    {rawMaterials.map(mat => (
                        <div key={mat.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{mat.name}</h3>
                                    <p className="text-xs text-gray-500">Cost: ₹{mat.purchasePrice.toFixed(2)} / {mat.unit}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{mat.stock}</p>
                                    <p className="text-xs text-gray-500">{mat.unit}</p>
                                </div>
                            </div>
                            <div className="flex justify-end items-end mt-2 pt-2 border-t dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <Tooltip content="Edit Material" position="top">
                                        <button onClick={() => setModalState({type: 'edit_material', data: mat})} className="font-medium text-primary-600 dark:text-primary-500 hover:underline text-xs">Edit</button>
                                    </Tooltip>
                                    <Tooltip content="Delete Material" position="top">
                                        <button onClick={() => setDeleteConfirm(mat)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs">Delete</button>
                                    </Tooltip>
                                </div>
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