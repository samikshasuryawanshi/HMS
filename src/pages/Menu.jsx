// Menu Management Page - CRUD with categories and image upload
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, addDocument, updateDocument, deleteDocument } from '../firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoCreateOutline,
    IoTrashOutline,
    IoSearchOutline,
    IoCloudUploadOutline,
    IoToggleOutline,
    IoToggle,
} from 'react-icons/io5';

const categories = ['All', 'Starters', 'Main Course', 'Pizza', 'Burgers', 'Pasta', 'Rice & Noodles', 'Salads', 'Desserts', 'Beverages', 'Breads'];

const Menu = () => {
    const { isAdmin, isManager } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'Starters',
        description: '',
        imageUrl: '',
        available: true,
    });

    useEffect(() => {
        const unsub = listenToCollection('menu', (data) => {
            setMenuItems(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            category: 'Starters',
            description: '',
            imageUrl: '',
            available: true,
        });
        setEditItem(null);
    };

    const openAddModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditItem(item);
        setFormData({
            name: item.name,
            price: item.price,
            category: item.category,
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            available: item.available !== false,
        });
        setModalOpen(true);
    };

    // Handle image upload to Firebase Storage
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        setUploading(true);
        try {
            const storageRef = ref(getStorage(), `menu/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setFormData({ ...formData, imageUrl: url });
            toast.success('Image uploaded!');
        } catch (error) {
            toast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, price, category } = formData;

        if (!name || !price || !category) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            const data = {
                name: formData.name,
                price: Number(formData.price),
                category: formData.category,
                description: formData.description,
                imageUrl: formData.imageUrl,
                available: formData.available,
            };

            if (editItem) {
                await updateDocument('menu', editItem.id, data);
                toast.success('Menu item updated');
            } else {
                await addDocument('menu', data);
                toast.success('Menu item added');
            }
            setModalOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Error saving menu item');
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        try {
            await deleteDocument('menu', item.id);
            toast.success('Item deleted');
        } catch (error) {
            toast.error('Error deleting item');
        }
    };

    const toggleAvailability = async (item) => {
        try {
            await updateDocument('menu', item.id, { available: !item.available });
            toast.success(`${item.name} — ${!item.available ? 'Available' : 'Unavailable'}`);
        } catch (error) {
            toast.error('Error updating availability');
        }
    };

    // Filter items
    const filteredItems = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Menu Management</h1>
                    <p className="page-subtitle">{menuItems.length} items in menu</p>
                </div>
                {isAdmin && (
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <IoAddOutline size={20} />
                        Add Item
                    </button>
                )}
            </div>

            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search menu..."
                        className="input-field pl-11"
                    />
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${activeCategory === cat
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            {filteredItems.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">🍽️</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Items Found</h3>
                    <p className="text-dark-400">
                        {menuItems.length === 0 ? 'Add your first menu item.' : 'Try a different search or category.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className={`glass-card-hover overflow-hidden ${!item.available ? 'opacity-60' : ''}`}>
                            {/* Image */}
                            <div className="h-40 bg-dark-800 overflow-hidden">
                                {(item.imageUrl || item.image) ? (
                                    <img
                                        src={item.imageUrl || item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">
                                        {item.category === 'Drinks' ? '🥤' :
                                            item.category === 'Desserts' ? '🍰' :
                                                item.category === 'Starters' ? '🥗' : '🍛'}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-white font-semibold">{item.name}</h3>
                                        {item.description && (
                                            <p className="text-dark-400 text-xs mt-1 line-clamp-2">{item.description}</p>
                                        )}
                                    </div>
                                    <span className="badge-info whitespace-nowrap">{item.category}</span>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-xl font-bold text-primary-400">₹{item.price}</span>

                                    <div className="flex items-center gap-2">
                                        {/* Availability toggle */}
                                        {(isAdmin || isManager) && (
                                            <button
                                                onClick={() => toggleAvailability(item)}
                                                className={`transition-colors ${item.available ? 'text-emerald-400' : 'text-dark-500'}`}
                                                title={item.available ? 'Mark unavailable' : 'Mark available'}
                                            >
                                                {item.available ? <IoToggle size={28} /> : <IoToggleOutline size={28} />}
                                            </button>
                                        )}

                                        {/* Edit / Delete */}
                                        {(isAdmin || isManager) && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                                                >
                                                    <IoCreateOutline size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                                                >
                                                    <IoTrashOutline size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); resetForm(); }}
                title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Item Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Butter Chicken"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="label-text">Price (₹) *</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="e.g. 350"
                                className="input-field"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="select-field"
                            >
                                {categories.filter(c => c !== 'All').map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Availability</label>
                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, available: !formData.available })}
                                    className={`transition-colors ${formData.available ? 'text-emerald-400' : 'text-dark-500'}`}
                                >
                                    {formData.available ? <IoToggle size={36} /> : <IoToggleOutline size={36} />}
                                </button>
                                <span className="text-sm text-dark-300">
                                    {formData.available ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label-text">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of the dish..."
                            className="input-field resize-none h-20"
                            rows={3}
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="label-text">Image</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="btn-secondary flex items-center gap-2"
                            >
                                {uploading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <IoCloudUploadOutline size={18} />
                                )}
                                {uploading ? 'Uploading...' : 'Upload Image'}
                            </button>
                            {formData.imageUrl && (
                                <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover" />
                            )}
                        </div>
                        {/* Or paste URL */}
                        <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            placeholder="Or paste image URL"
                            className="input-field mt-2"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn-primary flex-1">
                            {editItem ? 'Update Item' : 'Add Item'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModalOpen(false); resetForm(); }}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Menu;
