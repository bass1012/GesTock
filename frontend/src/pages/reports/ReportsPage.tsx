import { useState, useMemo } from 'react'
import {
    BarChart3,
    Package,
    TrendingUp,
    AlertTriangle,
    Download,
    FileSpreadsheet,
    ShoppingCart,
    Activity,
    FileText,
    TrendingDown,
    History,
    Clock
} from 'lucide-react'
import { 
    useDashboardStats, 
    exportInventoryCSV, 
    exportMovementsCSV, 
    useInventoryReport, 
    useMovementReport,
    useExpiryAlerts,
    useSlowRotationReport
} from '../../hooks/useReports'
import { useAuthStore } from '../../store/authStore'
import { exportInventoryToPDF, exportMovementsToPDF } from '../../utils/pdfExport'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subDays, startOfDay, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Donut Chart Component
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0)
    if (total === 0) return <div className="text-gray-400 text-sm">Aucune donnée</div>

    let currentAngle = 0
    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {segments.map((segment, i) => {
                    const angle = (segment.value / total) * 360
                    const startAngle = currentAngle
                    const endAngle = currentAngle + angle
                    currentAngle = endAngle

                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180
                    const x1 = 50 + 40 * Math.cos(startRad)
                    const y1 = 50 + 40 * Math.sin(startRad)
                    const x2 = 50 + 40 * Math.cos(endRad)
                    const y2 = 50 + 40 * Math.sin(endRad)
                    const largeArc = angle > 180 ? 1 : 0

                    return (
                        <path
                            key={i}
                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={segment.color}
                        />
                    )
                })}
                <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-700">{total}</span>
            </div>
        </div>
    )
}

// Stat Card Component
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend
}: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    color: string
    trend?: { value: number; label: string }
}) {
    return (
        <div className="card p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp size={14} className={trend.value >= 0 ? 'text-green-500' : 'text-red-500'} />
                            <span className={`text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const { tenant } = useAuthStore()
    const { data: statsResponse, isLoading: isLoadingStats } = useDashboardStats()
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'movements' | 'bi'>('overview')
    const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days'>('7days')

    const stats = statsResponse

    const filterDate = useMemo(() => {
        const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
        return startOfDay(subDays(new Date(), days)).toISOString()
    }, [dateRange])
    
    const { data: movementsResponse, isLoading: isLoadingMovements } = useMovementReport({ startDate: filterDate })
    const { data: inventoryResponse, isLoading: isLoadingInventory } = useInventoryReport()

    // BI Reports (Pro/Enterprise only)
    const isPro = tenant?.plan === 'pro' || tenant?.plan === 'enterprise'
    const { data: expiryResponse, isLoading: isLoadingExpiry } = useExpiryAlerts(30)
    const { data: slowRotationResponse, isLoading: isLoadingSlow } = useSlowRotationReport(90)

    const isLoading = isLoadingStats || isLoadingMovements || isLoadingInventory || (isPro && (isLoadingExpiry || isLoadingSlow))

    const processChartData = () => {
        if (!movementsResponse?.movements) return []
        const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
        const chartData = []
        
        for (let i = days; i >= 0; i--) {
            const date = startOfDay(subDays(new Date(), i))
            const dayMovements = movementsResponse?.movements?.filter(m => isSameDay(new Date(m.createdAt), date)) || []
            
            chartData.push({
                date: format(date, 'd MMM', { locale: fr }),
                Sorties: dayMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0),
                Entrées: dayMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0),
            })
        }
        return chartData
    }

    const handleExportInventory = async () => {
        try {
            await exportInventoryCSV()
            toast.success('Export inventaire téléchargé')
        } catch {
            toast.error('Erreur lors de l\'export')
        }
    }

    const handleExportMovements = async () => {
        try {
            const endDate = new Date().toISOString().split('T')[0]
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            await exportMovementsCSV({ startDate, endDate })
            toast.success('Export mouvements téléchargé')
        } catch {
            toast.error('Erreur lors de l\'export')
        }
    }

    const handlePDFInventory = () => {
        if (!inventoryResponse) return toast.error('Données non disponibles')
        exportInventoryToPDF(inventoryResponse)
        toast.success('PDF d\'inventaire généré')
    }

    const handlePDFMovements = () => {
        if (!movementsResponse) return toast.error('Données non disponibles')
        exportMovementsToPDF(movementsResponse, dateRange === '7days' ? '7 Jours' : dateRange === '30days' ? '30 Jours' : '90 Jours')
        toast.success('PDF des mouvements généré')
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rapports & Tableaux de bord</h1>
                    <p className="text-gray-500 mt-1">Analyse et exports de données</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-8 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rapports & Tableaux de bord</h1>
                    <p className="text-gray-500 mt-1">Analyse de stock et exports de données</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportInventory}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <FileSpreadsheet size={18} />
                        <span className="hidden sm:inline">Export Inventaire</span>
                        <span className="sm:hidden">Inventaire</span>
                    </button>
                    <button onClick={handlePDFInventory} className="btn bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-2 border border-rose-200">
                        <FileText size={18} />
                        <span className="hidden sm:inline">PDF Inventaire</span>
                    </button>
                    <div className="w-px h-6 bg-gray-200 hidden sm:block mx-2"></div>
                    <button
                        onClick={handleExportMovements}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Mouvements</span>
                        <span className="sm:hidden">Mouvements</span>
                    </button>
                    <button onClick={handlePDFMovements} className="btn bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-2 border border-indigo-200">
                        <FileText size={18} />
                        <span className="hidden sm:inline">PDF Mouvements</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-6">
                    {[
                        { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
                        { id: 'inventory', label: 'Inventaire', icon: Package },
                        { id: 'movements', label: 'Mouvements', icon: Activity },
                        ...(isPro ? [{ id: 'bi', label: 'Analyses BI', icon: TrendingUp }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Produits actifs"
                            value={stats.totalProducts}
                            subtitle={`${stats.lowStockCount} en alerte stock`}
                            icon={Package}
                            color="bg-blue-500"
                        />
                        <StatCard
                            title="Valeur du stock"
                            value={`${stats.totalStockValue.toLocaleString('fr-FR')} F CFA`}
                            subtitle="Valeur totale estimée"
                            icon={TrendingUp}
                            color="bg-green-500"
                        />
                        <StatCard
                            title="Mouvements"
                            value={stats.totalMovementsWeek}
                            subtitle={`${stats.totalMovementsToday} aujourd'hui`}
                            icon={Activity}
                            color="bg-purple-500"
                        />
                        <StatCard
                            title="Commandes en attente"
                            value={stats.purchaseOrdersPending}
                            subtitle="Bons de commande"
                            icon={ShoppingCart}
                            color="bg-orange-500"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Products */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 produits (valeur stock)</h3>
                            <div className="space-y-3">
                                {stats.topProducts.map((product, i) => (
                                    <div key={product.id} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                            <p className="text-xs text-gray-500">{product.sku}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">{product.value.toLocaleString('fr-FR')} F CFA</p>
                                            <p className="text-xs text-gray-500">{product.currentStock} unités</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stock by Category */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par catégorie</h3>
                            <div className="flex items-center gap-6">
                                <DonutChart
                                    segments={stats.stockByCategory.map((cat, i) => ({
                                        label: cat.category,
                                        value: cat.count,
                                        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]
                                    }))}
                                />
                                <div className="flex-1 space-y-2">
                                    {stats.stockByCategory.map((cat, i) => (
                                        <div key={cat.category} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5] }}
                                                />
                                                <span className="text-gray-600">{cat.category}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{cat.count} ({cat.value.toLocaleString('fr-FR')} F CFA)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Movements Chart */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mouvements de stock (7 jours)</h3>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {stats.movementsByType.map((movement) => (
                                <div key={movement.type} className="text-center p-4 rounded-lg bg-gray-50">
                                    <p className="text-2xl font-bold text-gray-900">{movement.count}</p>
                                    <p className="text-sm text-gray-500">
                                        {movement.type === 'IN' && 'Entrées'}
                                        {movement.type === 'OUT' && 'Sorties'}
                                        {movement.type === 'ADJUSTMENT' && 'Ajustements'}
                                        {movement.type === 'TRANSFER' && 'Transferts'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{movement.quantity} unités</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts Section */}
                    {stats.lowStockCount > 0 && (
                        <div className="card p-6 border-l-4 border-red-500 bg-red-50">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-500 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-semibold text-red-900">Alertes de stock</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        {stats.lowStockCount} produit{stats.lowStockCount > 1 ? 's sont' : ' est'} en dessous du seuil minimum.
                                        Consultez la page Inventaire pour plus de détails.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">État de l'inventaire</h3>
                        <button onClick={handleExportInventory} className="btn btn-secondary flex items-center gap-2">
                            <Download size={16} />
                            Exporter CSV
                        </button>
                    </div>
                    <div className="card p-12 text-center">
                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">
                            Consultez l'onglet "Vue d'ensemble" pour les statistiques d'inventaire détaillées.
                            Utilisez le bouton Exporter CSV pour télécharger le rapport complet.
                        </p>
                    </div>
                </div>
            )}

            {/* Movements Tab */}
            {activeTab === 'movements' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-900">Activité (Séries Temporelles)</h3>
                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                {[
                                    { id: '7days', label: '7 jours' },
                                    { id: '30days', label: '30 jours' },
                                    { id: '90days', label: '90 jours' },
                                ].map((range) => (
                                    <button
                                        key={range.id}
                                        onClick={() => setDateRange(range.id as any)}
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                            dateRange === range.id
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handlePDFMovements} className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                            <FileText size={16} />
                            Bilan PDF
                        </button>
                    </div>
                    
                    <div className="card p-6 min-h-[400px]">
                        <h4 className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-wider">Évolution des Flux Logistiques</h4>
                        <div className="w-full h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={processChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" dataKey="Entrées" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="Sorties" stroke="#EF4444" strokeWidth={3} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* BI Tab */}
            {activeTab === 'bi' && isPro && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Expiry Alerts */}
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Clock className="text-amber-500" size={20} />
                                    Produits approchant la péremption
                                </h3>
                                <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                    Prochains 30 jours
                                </span>
                            </div>
                            <div className="space-y-4">
                                {expiryResponse?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${item.daysRemaining <= 7 ? 'text-red-500' : 'text-amber-600'}`}>
                                                {item.daysRemaining <= 0 ? 'PÉRIMÉ' : `dans ${item.daysRemaining} j`}
                                            </p>
                                            <p className="text-[10px] text-gray-400">Exp: {new Date(item.expiry_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!expiryResponse || expiryResponse.length === 0) && (
                                    <div className="py-8 text-center text-gray-400 italic text-sm">
                                        Aucun produit proche de la péremption. ✨
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Slow Rotation */}
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <History className="text-indigo-500" size={20} />
                                    Rotation lente (Stock dormant)
                                </h3>
                                <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                    +90 jours sans vente
                                </span>
                            </div>
                            <div className="space-y-4">
                                {slowRotationResponse?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500 bg-white px-1.5 rounded border">Stock: {item.current_stock}</span>
                                                <span className="text-xs text-gray-500">Dernière sortie: Jamais</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-indigo-600">
                                                {item.value.toLocaleString('fr-FR')} F
                                            </p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Capital immobilisé</p>
                                        </div>
                                    </div>
                                ))}
                                {(!slowRotationResponse || slowRotationResponse.length === 0) && (
                                    <div className="py-8 text-center text-gray-400 italic text-sm">
                                        Félicitations ! Votre stock tourne bien. 🚀
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BI Strategy Advice (Enterprise Look) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-100">
                             <TrendingDown size={18} className="text-amber-500 mb-2" />
                             <h4 className="text-sm font-bold text-amber-900">Stratégie Péremption</h4>
                             <p className="text-xs text-amber-700 mt-1">Planifiez une remise immédiate pour ces produits avant perte totale.</p>
                         </div>
                         <div className="card p-4 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                             <Download size={18} className="text-indigo-500 mb-2" />
                             <h4 className="text-sm font-bold text-indigo-900">Optimisation Stock</h4>
                             <p className="text-xs text-indigo-700 mt-1">Considérez un retour fournisseur ou un pack promotionnel pour libérer de l'espace.</p>
                         </div>
                         <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                             <TrendingUp size={18} className="text-emerald-500 mb-2" />
                             <h4 className="text-sm font-bold text-emerald-900">Rotation Rapide</h4>
                             <p className="text-xs text-emerald-700 mt-1">Stock idéal. Concentrez vos achats sur ces catégories à forte rotation.</p>
                         </div>
                    </div>
                </div>
            )}
        </div>
    )
}
