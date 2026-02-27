// Menu Management Page - CRUD with categories and image upload (Premium UI)
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, addDocument, updateDocument, deleteDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
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
    IoFastFoodOutline,
    IoSparklesOutline
} from 'react-icons/io5';

const categoriesList = ['All', 'Starters', 'Main Course', 'Pizza', 'Burgers', 'Pasta', 'Rice & Noodles', 'Salads', 'Desserts', 'Beverages', 'Breads'];

const Menu = () => {
    const { isManager, isCashier, userData } = useAuth();
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
        if (!userData?.businessId) return;

        const unsub = listenToCollection(
            'menu',
            (data) => {
                setMenuItems(data);
                setLoading(false);
            },
            [where('businessId', '==', userData.businessId)]
        );
        return unsub;
    }, [userData]);

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
            toast.success('Image uploaded successfully! ✨');
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
                businessId: userData.businessId,
            };

            if (editItem) {
                await updateDocument('menu', editItem.id, data);
                toast.success('Menu item updated');
            } else {
                await addDocument('menu', data);
                toast.success('Menu item added to your kitchen');
            }
            setModalOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Error saving menu item');
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;
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
            toast.success(`${item.name} is now ${!item.available ? 'Available' : 'Unavailable'}`);
        } catch (error) {
            toast.error('Error updating availability');
        }
    };

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in relative z-10 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Menu Collection <span className="inline-block origin-bottom-right animate-wave">👨‍🍳</span>
                    </h1>
                    <p className="text-dark-400 text-xs md:text-sm font-medium">
                        Curate your restaurant&apos;s culinary experience — {menuItems.length} items listed
                    </p>
                </div>
                {(isManager || isCashier) && (
                    <button
                        onClick={openAddModal}
                        className="w-full sm:w-auto py-2.5 sm:py-3.5 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,85,69,0.3)] hover:shadow-[0_0_25px_rgba(234,85,69,0.4)] relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                        <IoAddOutline className="text-xl" />
                        Register Dish
                    </button>
                )}
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-dark-900/40 backdrop-blur-xl border border-dark-700/50 p-3 md:p-4 rounded-3xl shadow-lg">
                <div className="relative w-full lg:max-w-md group">
                    <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-primary-400 transition-colors" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Look up a delicacy..."
                        className="w-full bg-dark-950/50 border border-dark-700/50 rounded-2xl pl-12 pr-4 py-3 md:py-3.5 text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition-all text-sm font-medium shadow-inner"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide no-scrollbar -mx-2 px-2 lg:mx-0 lg:px-0">
                    {categoriesList.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap uppercase tracking-wider border ${activeCategory === cat
                                ? 'bg-primary-500/20 text-white border-primary-500 shadow-[0_0_15px_rgba(234,85,69,0.2)]'
                                : 'bg-dark-800/50 text-dark-400 border-transparent hover:text-white hover:bg-dark-700/50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Container */}
            {filteredItems.length === 0 ? (
                <div className="glass-card p-12 md:p-24 text-center flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="text-7xl md:text-9xl mb-8 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">🍽️</div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">Cuisine Not Found</h3>
                    <p className="text-dark-400 text-sm md:text-lg max-w-md mx-auto leading-relaxed font-medium">
                        {menuItems.length === 0
                            ? "Start building your signature menu to wow your guests."
                            : "It seems we couldn't find items in this category matching your search."}
                    </p>
                    {menuItems.length === 0 && (isManager || isCashier) && (
                        <button onClick={openAddModal} className="mt-8 text-primary-400 font-black hover:text-primary-300 flex items-center gap-2 uppercase tracking-widest text-sm transition-colors group/btn">
                            <span className="p-2 rounded-full bg-primary-500/10 group-hover/btn:bg-primary-500/20 transition-all"><IoAddOutline /></span>
                            Create First Dish
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            className={`group/card relative flex flex-col glass-card border-dark-700/50 hover:border-primary-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden rounded-3xl ${!item.available ? 'grayscale-[0.8] opacity-60 hover:grayscale-0 hover:opacity-100' : ''}`}
                        >
                            {/* Category Indicator Tag */}
                            <div className="absolute top-4 right-4 z-20">
                                <span className="bg-dark-950/80 backdrop-blur-md text-primary-400 text-[9px] font-black tracking-widest uppercase py-1.5 px-3 rounded-full border border-primary-500/30 group-hover/card:border-primary-500/60 shadow-lg transition-colors">
                                    {item.category}
                                </span>
                            </div>

                            {/* Image Container */}
                            <div className="h-48 md:h-56 bg-dark-950/50 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/10 to-transparent z-10 opacity-60" />

                                {(item.imageUrl || item.image) ? (
                                    <img
                                        src={item.imageUrl || item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center relative">
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--primary-color)_0,transparent_70%)]" style={{ '--primary-color': '#e11d48' }} />
                                        <span className="text-6xl md:text-7xl group-hover/card:scale-110 transition-transform duration-500 z-10 filter drop-shadow-xl">
                                            {item.category === 'Beverages' ? '🥤' :
                                                item.category === 'Desserts' ? '🍰' :
                                                    item.category === 'Starters' ? '🥗' : '🍛'}
                                        </span>
                                    </div>
                                )}

                                {/* Hover Availability Status */}
                                {!item.available && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center z-20 pointer-events-none">
                                        <span className="bg-red-500/20 backdrop-blur-xl border border-red-500/40 text-red-100 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl shadow-2xl">
                                            Unavailable
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="p-5 md:p-6 flex flex-col flex-1 relative z-10">
                                <div className="flex-1">
                                    <h3 className="text-lg md:text-xl font-bold text-white group-hover/card:text-primary-400 transition-colors duration-300 tracking-tight leading-tight">
                                        {item.name}
                                    </h3>
                                    <p className="text-dark-400 text-xs md:text-sm font-medium mt-2 leading-relaxed line-clamp-2 md:line-clamp-3">
                                        {item.description || "The chef's special prepared with authentic ingredients and professional precision."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-5 pt-5 border-t border-dark-700/40">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-0.5">Price</span>
                                        <span className="text-xl md:text-2xl font-black text-white group-hover/card:text-primary-500 transition-colors flex items-center gap-0.5">
                                            <span className="text-sm font-bold text-primary-500/70">₹</span>
                                            {item.price}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        {(isManager || isCashier) && (
                                            <button
                                                onClick={() => toggleAvailability(item)}
                                                className={`p-2 rounded-xl transition-all duration-300 border ${item.available
                                                    ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                                                    : 'text-dark-500 bg-dark-800/50 border-transparent hover:text-emerald-500/40'}`}
                                                title={item.available ? 'Mark as Out of Stock' : 'Mark as Ready to Serve'}
                                            >
                                                {item.available ? <IoToggle size={24} /> : <IoToggleOutline size={24} />}
                                            </button>
                                        )}

                                        {(isManager || isCashier) && (
                                            <div className="flex items-center bg-dark-950/20 rounded-xl border border-dark-700/50 p-0.5">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-2 rounded-lg hover:bg-white/5 text-dark-400 hover:text-primary-400 transition-all font-bold"
                                                >
                                                    <IoCreateOutline size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                                                >
                                                    <IoTrashOutline size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Premium Modal Container */}
            <Modal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); resetForm(); }}
                title={editItem ? 'Update Culinary Delicacy' : 'Register New Dish'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 py-2 md:py-4">
                    {/* Visual Section: Image Preview/Upload */}
                    <div className="relative group/upload h-48 md:h-56 bg-dark-900/50 rounded-3xl border-2 border-dashed border-dark-700/50 flex flex-col items-center justify-center transition-all hover:border-primary-500/40 overflow-hidden shadow-inner">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        {formData.imageUrl ? (
                            <div className="absolute inset-0">
                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-dark-950/40 backdrop-blur-[2px] opacity-0 group-hover/upload:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all scale-90 group-hover/upload:scale-100"
                                    >
                                        <IoCloudUploadOutline size={32} />
                                    </button>
                                    <span className="mt-3 text-[10px] font-black text-white uppercase tracking-widest">Replace Visual</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center p-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className={`p-5 rounded-3xl ${uploading ? 'bg-dark-800' : 'bg-primary-500/10 text-primary-500 group-hover/upload:scale-110 group-hover/upload:bg-primary-500/20'} transition-all duration-500 relative`}>
                                    {uploading ? (
                                        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <IoCloudUploadOutline size={40} />
                                            <IoSparklesOutline className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                                        </>
                                    )}
                                </div>
                                <h4 className="mt-5 text-lg font-black text-white tracking-tight">Upload Product Image</h4>
                                <p className="text-dark-500 text-xs font-bold leading-relaxed max-w-[240px] mt-1.5 uppercase tracking-wider">
                                    High-quality visuals significantly increase order volume
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 font-medium">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1">Name of the dish *</label>
                                <div className="relative group">
                                    <IoFastFoodOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Signature Truffle Pasta"
                                        className="w-full bg-dark-800/80 border border-dark-700/50 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 transition-all font-bold"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1">Pricing (INR) *</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/50 font-black">₹</span>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-dark-800/80 border border-dark-700/50 rounded-2xl pl-10 pr-4 py-4 text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 transition-all font-bold"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1 font-medium">Categorization *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-dark-800/80 border border-dark-700/50 rounded-2xl px-4 py-4 text-white outline-none focus:border-primary-500/50 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    {categoriesList.filter(c => c !== 'All').map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1 font-medium">Initial Status</label>
                                <div
                                    onClick={() => setFormData({ ...formData, available: !formData.available })}
                                    className={`flex items-center gap-3 bg-dark-800/80 border border-dark-700/50 rounded-2xl px-5 py-3 cursor-pointer transition-all hover:bg-dark-700/50 ${formData.available ? 'border-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : ''}`}
                                >
                                    <span className={`transition-all duration-300 ${formData.available ? 'text-emerald-400' : 'text-dark-600'}`}>
                                        {formData.available ? <IoToggle size={36} /> : <IoToggleOutline size={36} />}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black tracking-widest uppercase ${formData.available ? 'text-emerald-400' : 'text-dark-400'}`}>
                                            {formData.available ? 'Ready for Orders' : 'Currently Unavailable'}
                                        </span>
                                        <span className="text-[9px] font-bold text-dark-500 uppercase tracking-tighter">Toggle stock status</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1 font-medium">Chef&apos;s Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Highlight the key ingredients, taste profile, and calories..."
                                className="w-full bg-dark-800/80 border border-dark-700/50 rounded-2xl px-5 py-4 text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 transition-all font-bold resize-none min-h-[100px] shadow-inner"
                                rows={4}
                            />
                        </div>

                        {/* Direct URL Input Area */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1 font-medium">Global Image Identifier (URL Bypass)</label>
                            <input
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://cdn.example.com/images/dish-01.jpg"
                                className="w-full bg-dark-950/30 border border-dark-700/30 rounded-xl px-4 py-3 text-dark-400 placeholder:text-dark-700 focus:outline-none focus:border-primary-500/30 transition-all text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-dark-700/30">
                        <button
                            type="submit"
                            className="flex-[2] py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_10px_25px_rgba(234,85,69,0.3)] hover:shadow-[0_15px_30px_rgba(234,85,69,0.4)]"
                        >
                            {editItem ? 'Commit Recipe Updates' : 'Launch New Dish'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModalOpen(false); resetForm(); }}
                            className="flex-1 py-4 rounded-2xl bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all border border-dark-700/50"
                        >
                            Discard
                        </button>
                    </div>
                </form>
            </Modal>

            <style>{`
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    50% { transform: rotate(15deg); }
                    75% { transform: rotate(-10deg); }
                }
                .animate-wave {
                    animation: wave 1.5s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Menu;
