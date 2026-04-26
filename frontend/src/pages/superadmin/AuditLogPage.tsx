import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Activity, ShieldAlert, LogIn, Ban, Package, ShoppingCart,
    Key, Search, Download, RefreshCcw, Filter, X, ChevronLeft,
    ChevronRight, Users, CreditCard, Zap, Clock, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ---------- Types ----------
interface AuditLog {
    id: string;
    action: string;
    userId: string;
    tenantId: string | null;
    resource: string | null;
    resourceId: string | null;
    metadata: Record<string, any>;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    user?: { email: string; firstName: string; lastName: string; role: string };
    tenant?: { name: string; slug: string };
}

interface AuditStats {
    summary: {
        total24h: number;
        logins24h: number;
        suspensions7d: number;
        subscriptions7d: number;
        totalLogs: number;
    };
    categories7d: { name: string; count: number; color: string }[];
}

// ---------- Helpers ----------
const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    USER_LOGIN:           { label: 'Connexion',           color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: LogIn },
    USER_LOGOUT:          { label: 'Déconnexion',         color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20', icon: LogIn },
    USER_REGISTER:        { label: 'Inscription',         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   icon: Users },
    PASSWORD_CHANGE:      { label: 'Changement MDP',      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: ShieldAlert },
    PASSWORD_RESET:       { label: 'Reset MDP',           color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: ShieldAlert },
    FORCE_PASSWORD_RESET: { label: 'Reset forcé (QG)',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: ShieldAlert },
    USER_CREATED:         { label: 'Utilisateur créé',    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Users },
    USER_UPDATED:         { label: 'Utilisateur modifié', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
    USER_DELETED:         { label: 'Utilisateur supprimé',color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Users },
    ROLE_CHANGED:         { label: 'Rôle changé',         color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Users },
    TENANT_SUSPENDED:     { label: 'Compte suspendu',     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Ban },
    TENANT_ACTIVATED:     { label: 'Compte activé',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Zap },
    SUBSCRIPTION_MODIFIED:{ label: 'Abonnement modifié',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20', icon: CreditCard },
    QUOTA_MODIFIED:       { label: 'Quota modifié',       color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20', icon: CreditCard },
    PRODUCT_DELETED:      { label: 'Produit supprimé',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Package },
    STOCK_ADJUSTED:       { label: 'Ajustement stock',    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Package },
    STOCK_MOVEMENT_IN:    { label: 'Entrée stock',        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Package },
    STOCK_MOVEMENT_OUT:   { label: 'Sortie stock',        color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Package },
    STOCK_TRANSFER:       { label: 'Transfert stock',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Package },
    SALE_COMPLETED:       { label: 'Vente effectuée',     color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: ShoppingCart },
    SALE_CANCELLED:       { label: 'Vente annulée',       color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: ShoppingCart },
    ORDER_RECEIVED:       { label: 'Commande reçue',      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Package },
    ORDER_CANCELLED:      { label: 'Commande annulée',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Package },
    API_KEY_GENERATED:    { label: 'Clé API générée',     color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',   icon: Key },
    API_KEY_REVOKED:      { label: 'Clé API révoquée',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Key },
    PRODUCT_CREATED:      { label: 'Produit créé',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Package },
    PRODUCT_UPDATED:      { label: 'Produit modifié',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Package },
    SUPPLIER_CREATED:     { label: 'Fournisseur créé',   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Briefcase },
    SUPPLIER_UPDATED:     { label: 'Fournisseur modifié',color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Briefcase },
    SUPPLIER_DELETED:     { label: 'Fournisseur supprimé',color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Briefcase },
    CLIENT_CREATED:       { label: 'Client créé',        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Users },
    CLIENT_UPDATED:       { label: 'Client modifié',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
    CLIENT_DELETED:       { label: 'Client supprimé',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Users },
    ORDER_CREATED:        { label: 'Commande créée',     color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: ShoppingCart },
    ORDER_UPDATED:        { label: 'Commande modifiée',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: ShoppingCart },
    WAREHOUSE_CREATED:    { label: 'Entrepôt créé',      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', icon: Package },
    WAREHOUSE_UPDATED:    { label: 'Entrepôt modifié',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Package },
    WAREHOUSE_DELETED:    { label: 'Entrepôt supprimé',  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Package },
    AUDIT_LOG_VIEWED:     { label: 'Audit consulté',      color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',   icon: Activity },
};

const ALL_ACTIONS = Object.keys(ACTION_META);

function getActionMeta(action: string) {
    return ACTION_META[action] ?? { label: action, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', icon: Activity };
}

// ---------- Component ----------
export default function AuditLogPage({ secret }: { secret: string | null }) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [tenants, setTenants] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [filterTenant, setFilterTenant] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('7d');
    const [filterSearch, setFilterSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const headers = { Authorization: `Bearer ${secret}` };

    const getPeriodDates = () => {
        const now = new Date();
        const startMap: Record<string, Date | undefined> = {
            '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
            '7d':  new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000),
            '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            'all': undefined,
        };
        return startMap[filterPeriod];
    };

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/v1/superadmin/audit-stats', { headers });
            setStats(data);
        } catch {
            // silencieux
        }
    }, [secret]);

    const fetchTenants = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/v1/superadmin/tenants', { headers });
            setTenants(data.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })));
        } catch {
            // silencieux
        }
    }, [secret]);

    const fetchLogs = useCallback(async (p = 1) => {
        setIsLoading(true);
        try {
            const startDate = getPeriodDates();
            const params: Record<string, string> = {
                page: String(p),
                limit: '30',
            };
            if (filterTenant) params.tenantId = filterTenant;
            if (filterAction) params.action   = filterAction;
            if (startDate)    params.startDate = startDate.toISOString();

            const { data } = await axios.get('/api/v1/superadmin/audit-logs', { headers, params });
            setLogs(data.logs);
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
            setPage(p);
        } catch {
            toast.error('Impossible de charger les logs');
        } finally {
            setIsLoading(false);
        }
    }, [secret, filterTenant, filterAction, filterPeriod]);

    useEffect(() => { fetchStats(); fetchTenants(); }, []);
    useEffect(() => { fetchLogs(1); }, [filterTenant, filterAction, filterPeriod]);

    const handleExport = async () => {
        try {
            const startDate = getPeriodDates();
            const params = new URLSearchParams();
            if (filterTenant) params.set('tenantId', filterTenant);
            if (filterAction) params.set('action',   filterAction);
            if (startDate)    params.set('startDate', startDate.toISOString());

            const url = `/api/v1/superadmin/audit-logs/export?${params.toString()}`;
            const { data } = await axios.get(url, { headers, responseType: 'blob' });
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            toast.success('Export CSV téléchargé');
        } catch {
            toast.error('Erreur lors de l\'export');
        }
    };

    const resetFilters = () => {
        setFilterTenant('');
        setFilterAction('');
        setFilterPeriod('7d');
        setFilterSearch('');
    };

    const displayedLogs = filterSearch
        ? logs.filter(l =>
            (l.user?.email || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
            (l.tenant?.name || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
            (l.action || '').toLowerCase().includes(filterSearch.toLowerCase())
          )
        : logs;

    return (
        <div className="space-y-8">
            {/* ── KPI Cards ── */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard label="Actions (24h)"     value={stats.summary.total24h}        icon={<Activity className="text-primary-500" />} color="primary" />
                    <KpiCard label="Connexions (24h)"  value={stats.summary.logins24h}       icon={<LogIn className="text-blue-500" />}    color="blue" />
                    <KpiCard label="Suspensions (7j)"  value={stats.summary.suspensions7d}   icon={<Ban className="text-red-500" />}       color="red" />
                    <KpiCard label="Abonnements (7j)"  value={stats.summary.subscriptions7d} icon={<CreditCard className="text-amber-500" />} color="amber" />
                    <KpiCard label="Total Logs"         value={stats.summary.totalLogs}       icon={<Clock className="text-gray-400" />}    color="gray" />
                </div>
            )}

            {/* ── Barre Catégories ── */}
            {stats && (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                        <Filter size={11} /> Répartition par catégorie — 7 derniers jours
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {stats.categories7d.map(cat => (
                            <div key={cat.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium
                                ${cat.color === 'blue'   ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'   : ''}
                                ${cat.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : ''}
                                ${cat.color === 'red'    ? 'bg-red-500/10 border-red-500/20 text-red-400'     : ''}
                                ${cat.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : ''}
                                ${cat.color === 'green'  ? 'bg-green-500/10 border-green-500/20 text-green-400' : ''}
                                ${cat.color === 'gray'   ? 'bg-gray-500/10 border-gray-700 text-gray-400'     : ''}
                            `}>
                                <span className="font-black">{cat.count}</span>
                                <span className="opacity-70">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Filtres + Actions ── */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                    {/* Recherche libre */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                        <input
                            type="text"
                            placeholder="Rechercher email, tenant, action..."
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all
                                ${showFilters ? 'bg-primary-500 border-primary-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                        >
                            <Filter size={14} /> Filtres
                            {(filterTenant || filterAction || filterPeriod !== '7d') && (
                                <span className="ml-1 w-2 h-2 bg-amber-400 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => fetchLogs(1)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-white text-xs font-bold transition-all"
                        >
                            <RefreshCcw size={14} /> Actualiser
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all"
                        >
                            <Download size={14} /> Exporter CSV
                        </button>
                    </div>
                </div>

                {/* Panneau filtres avancés */}
                {showFilters && (
                    <div className="pt-3 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in duration-200">
                        {/* Tenant */}
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Tenant</label>
                            <select
                                value={filterTenant}
                                onChange={e => setFilterTenant(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            >
                                <option value="">Tous les tenants</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                                ))}
                            </select>
                        </div>

                        {/* Action */}
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Type d'action</label>
                            <select
                                value={filterAction}
                                onChange={e => setFilterAction(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            >
                                <option value="">Toutes les actions</option>
                                {ALL_ACTIONS.map(a => (
                                    <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
                                ))}
                            </select>
                        </div>

                        {/* Période */}
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Période</label>
                            <div className="flex gap-1">
                                {[['24h','24h'],['7d','7 jours'],['30d','30 jours'],['all','Tout']].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => setFilterPeriod(v)}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all
                                            ${filterPeriod === v
                                                ? 'bg-primary-500 border-primary-400 text-white'
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                                    >{l}</button>
                                ))}
                            </div>
                        </div>

                        {/* Reset */}
                        <div className="md:col-span-3 flex justify-end">
                            <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                                <X size={12} /> Réinitialiser les filtres
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Timeline ── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} />
                        {total} événement(s) — Page {page}/{totalPages}
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-xs font-mono text-gray-600 animate-pulse">
                        CHARGEMENT DES LOGS D'AUDIT...
                    </div>
                ) : displayedLogs.length === 0 ? (
                    <div className="py-16 text-center text-gray-600 text-sm border border-gray-800 rounded-2xl">
                        Aucun événement trouvé pour ces filtres
                    </div>
                ) : (
                    <div className="relative">
                        {/* Ligne verticale */}
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-800" />

                        <div className="space-y-1">
                            {displayedLogs.map((log) => {
                                const meta = getActionMeta(log.action);
                                const Icon = meta.icon;
                                return (
                                    <div key={log.id} className="flex gap-4 group">
                                        {/* Icône timeline */}
                                        <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${meta.bg}`}>
                                            <Icon size={16} className={meta.color} />
                                        </div>

                                        {/* Contenu */}
                                        <div className={`flex-1 bg-gray-900/40 border rounded-2xl px-5 py-3.5 transition-all group-hover:border-gray-700 ${meta.bg.includes('red') ? 'border-red-500/10' : 'border-gray-800'}`}>
                                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                                <span className={`text-xs font-black ${meta.color}`}>{meta.label}</span>
                                                {log.tenant && (
                                                    <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                                                        {log.tenant.name}
                                                    </span>
                                                )}
                                                {log.user && (
                                                    <span className="text-[10px] text-gray-500">
                                                        {log.user.firstName} {log.user.lastName} ({log.user.email})
                                                    </span>
                                                )}
                                                {!log.user && log.userId === 'superadmin' && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded font-black">QG</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-[10px] text-gray-600 font-mono">
                                                <span>{format(new Date(log.createdAt), "dd MMM yyyy 'à' HH:mm:ss", { locale: fr })}</span>
                                                {log.ip && <span>IP: {log.ip}</span>}
                                                {log.resource && <span>Ressource: {log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</span>}
                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <span className="text-gray-700">{JSON.stringify(log.metadata).slice(0, 80)}{JSON.stringify(log.metadata).length > 80 ? '…' : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button
                            onClick={() => fetchLogs(page - 1)}
                            disabled={page <= 1}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 text-xs font-bold transition-all"
                        >
                            <ChevronLeft size={14} /> Précédent
                        </button>
                        <span className="text-xs font-mono text-gray-500">
                            Page {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => fetchLogs(page + 1)}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 text-xs font-bold transition-all"
                        >
                            Suivant <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------- Sub-components ----------
function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: any; color: string }) {
    const colorMap: Record<string, string> = {
        primary: 'bg-primary-500/10 border-primary-500/20',
        blue:    'bg-blue-500/10 border-blue-500/20',
        red:     'bg-red-500/10 border-red-500/20',
        amber:   'bg-amber-500/10 border-amber-500/20',
        gray:    'bg-gray-500/10 border-gray-700',
    };
    return (
        <div className={`rounded-2xl border p-4 ${colorMap[color] ?? colorMap.gray}`}>
            <div className="flex items-center gap-2 mb-2">{icon}</div>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{label}</p>
            <h4 className="text-2xl font-black text-white mt-0.5">{value.toLocaleString('fr-FR')}</h4>
        </div>
    );
}
