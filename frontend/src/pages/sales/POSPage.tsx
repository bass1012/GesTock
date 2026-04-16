import { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useSales } from '../../hooks/useSales';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ShoppingCart, Plus, Minus, Printer, Trash2, Search, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWarehouses } from '../../hooks/useWarehouses';

export default function POSPage() {
    const { data: productsData } = useProducts(1, 1000);
    const { data: warehouses } = useWarehouses();
    const { createSale, isCreating } = useSales();
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [clientName, setClientName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Select default warehouse
    useEffect(() => {
        if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [warehouses, selectedWarehouseId]);

    const subTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const taxAmount = subTotal * (taxRate / 100);
    const superTotal = subTotal + taxAmount;

    const filteredProducts = productsData?.products?.filter((p: any) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const addToCart = (product: any) => {
        const existing = cart.find(i => i.product.id === product.id);
        if (existing) {
            setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { product, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                const newQ = item.quantity + delta;
                return { ...item, quantity: newQ > 0 ? newQ : 1 };
            }
            return item;
        }));
    };

    const generateReceipt = (saleRef: string) => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235);
        doc.text('GesStock', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Reçu N° : ${saleRef}`, 14, 30);
        doc.text(`Date : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 36);
        if (clientName) doc.text(`Client : ${clientName}`, 14, 42);

        const tableBody = cart.map((item) => ([
            item.product.name,
            item.quantity.toString(),
            item.product.price.toLocaleString('fr-FR').replace(/\s/g, ' '),
            (item.product.price * item.quantity).toLocaleString('fr-FR').replace(/\s/g, ' ')
        ]));

        autoTable(doc, {
            startY: 50,
            head: [['Produit', 'Qté', 'Prix Unitaire', 'Total']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            margin: { left: 14, right: 14 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Sous-total : ${subTotal.toLocaleString('fr-FR').replace(/\s/g, ' ')} F CFA`, 140, finalY);
        if (taxRate > 0) doc.text(`Taxe (${taxRate}%) : ${taxAmount.toLocaleString('fr-FR').replace(/\s/g, ' ')} F CFA`, 140, finalY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL : ${superTotal.toLocaleString('fr-FR').replace(/\s/g, ' ')} F CFA`, 140, finalY + 14);

        doc.save(`Recu_${saleRef}.pdf`);
    };

    const handleCheckout = async () => {
        if (!selectedWarehouseId) return toast.error('Veuillez sélectionner un entrepôt de sortie');
        if (cart.length === 0) return toast.error('Le panier est vide');
        
        try {
            const sale = await createSale({
                type: 'FAC',
                taxRate: taxRate,
                warehouseId: selectedWarehouseId,
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity
                }))
            });
            
            generateReceipt(sale.reference);
            setCart([]);
            setClientName('');
            setTaxRate(0);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
            {/* Products Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Catalogue Caisse</h1>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par nom, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map((p: any) => (
                        <div 
                            key={p.id} 
                            onClick={() => addToCart(p)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all active:scale-[0.98]"
                        >
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{p.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{p.sku}</p>
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-primary-600">{p.price.toLocaleString('fr-FR')} F</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${p.currentStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {p.currentStock > 0 ? `${p.currentStock} ${p.unit}s` : 'Rupture'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Panel */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <ShoppingCart className="text-primary-600" />
                    <h2 className="text-lg font-bold">Panier Actuel</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.product.id} className="flex gap-3 justify-between items-center">
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold truncate leading-tight">{item.product.name}</h4>
                                <p className="text-xs text-gray-500">{(item.product.price * item.quantity).toLocaleString()} F</p>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border">
                                <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded"><Minus size={14}/></button>
                                <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded"><Plus size={14}/></button>
                            </div>
                            <button onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <ShoppingCart size={48} className="mb-4 opacity-20" />
                            <p>Le panier est vide</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                                <Warehouse size={12} /> Entrepôt de Sortie *
                            </label>
                            <select
                                required
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                                <option value="">Sélectionner un entrepôt...</option>
                                {warehouses?.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Nom du client (Optionnel)</label>
                            <input 
                                value={clientName} 
                                onChange={(e) => setClientName(e.target.value)} 
                                type="text" 
                                placeholder="Client de passage..." 
                                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" 
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">TVA (Taxe) %</label>
                            <input 
                                type="number" 
                                value={taxRate} 
                                onChange={(e) => setTaxRate(Number(e.target.value) || 0)} 
                                className="w-20 px-2 py-1 border rounded text-right" 
                            />
                        </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Sous-total</span>
                            <span>{subTotal.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Taxe</span>
                            <span>{taxAmount.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-900">Total à Payer</span>
                            <span className="text-2xl font-bold text-primary-600">{superTotal.toLocaleString('fr-FR')} F</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCheckout}
                        disabled={isCreating || cart.length === 0}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {isCreating ? 'Encaissement...' : <><Printer size={20} /> Encaisser & Imprimer Reçu</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
