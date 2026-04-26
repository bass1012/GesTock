import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, LogOut, Clock, Users, 
    Ban, Key, Unlock, Globe, CreditCard, 
    AlertTriangle, LayoutDashboard, Search, RefreshCcw, 
    ChevronDown, ChevronUp, UserCircle, Plus, Calendar, Ban as BanIcon, Zap,
    Terminal, ExternalLink, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AuditLogPage from './AuditLogPage';

export default function SuperAdminDashboard() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'expiring' | 'suspended'>('all');
    const [activeTab, setActiveTab] = useState<'tenants' | 'audit'>('tenants');
    
    const secret = localStorage.getItem('superadmin_secret');

    const fetchTenants = async () => {
        try {
            const { data } = await axios.get('/api/v1/superadmin/tenants', {
                headers: { Authorization: `Bearer ${secret}` }
            });
            setTenants(data);
        } catch (error) {
            toast.error('Session expirée');
            window.location.href = '/superadmin';
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!secret) {
            window.location.href = '/superadmin';
            return;
        }
        fetchTenants();
    }, []);

    const stats = useMemo(() => ({
        total: tenants.length,
        activeApis: tenants.reduce((acc, t) => acc + (t.apiKeysCount || 0), 0),
        premium: tenants.filter(t => t.plan !== 'starter').length,
        suspended: tenants.filter(t => t.isSuspended).length,
        expiringSoon: tenants.filter(t => {
            if (!t.currentPeriodEnd) return false;
            const diff = new Date(t.currentPeriodEnd).getTime() - new Date().getTime();
            return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
        }).length
    }), [tenants]);

    const filteredTenants = useMemo(() => {
        let result = tenants;
        
        // Apply search filter
        if (searchTerm) {
            result = result.filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.slug.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply quick access filter
        switch (activeFilter) {
            case 'recent':
                // Derniers créés (7 derniers jours)
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                result = result.filter(t => new Date(t.createdAt) >= oneWeekAgo)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'expiring':
                // Abonnements expirant dans les 7 jours
                result = result.filter(t => {
                    if (!t.currentPeriodEnd) return false;
                    const diff = new Date(t.currentPeriodEnd).getTime() - new Date().getTime();
                    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
                }).sort((a, b) => new Date(a.currentPeriodEnd).getTime() - new Date(b.currentPeriodEnd).getTime());
                break;
            case 'suspended':
                // Comptes suspendus
                result = result.filter(t => t.isSuspended);
                break;
            default:
                // 'all' - tri par date de création décroissante
                result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        
        return result;
    }, [tenants, searchTerm, activeFilter]);

    const handleUpdatePlan = async (id: string, plan: string, durationMonths: number) => {
        const confirm = window.confirm(`Activer le plan ${plan.toUpperCase()} (${durationMonths} mois) ?`);
        if (!confirm) return;
        
        try {
            const loadToast = toast.loading('Mise à jour du contrat...');
            await axios.put(`/api/v1/superadmin/tenants/${id}/plan`, {
                plan,
                durationMonths
            }, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            toast.dismiss(loadToast);
            toast.success('Bail commercial renouvelé !');
            fetchTenants();
        } catch (error) {
            toast.error('Échec de la mise à jour');
        }
    };

    const handleToggleStatus = async (id: string, isSuspended: boolean) => {
        const action = isSuspended ? 'réactiver' : 'suspendre';
        if (!window.confirm(`Voulez-vous vraiment ${action} ce compte ?`)) return;

        try {
            const loadToast = toast.loading('Action disciplinaire...');
            await axios.put(`/api/v1/superadmin/tenants/${id}/status`, {}, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            toast.dismiss(loadToast);
            toast.success(`Compte ${isSuspended ? 'réactivé' : 'bloqué'}`);
            fetchTenants();
        } catch (error) {
            toast.error('Erreur système');
        }
    };

    const handleToggleApi = async (id: string, apiEnabled: boolean) => {
        try {
            await axios.put(`/api/v1/superadmin/tenants/${id}/api`, {}, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            toast.success(`Flux API ${apiEnabled ? 'coupé' : 'restauré'}`);
            fetchTenants();
        } catch (error) {
            toast.error('Erreur API');
        }
    };

    const logout = () => {
        localStorage.removeItem('superadmin_secret');
        window.location.href = '/superadmin';
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center text-white font-mono">
            <ShieldAlert size={48} className="text-primary-500 animate-pulse mb-4" />
            <p className="tracking-widest animate-pulse text-sm">CHARGEMENT DU RADAR QG...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-gray-300 font-sans pb-20">
            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-600/20 p-2 rounded-xl border border-primary-500/30">
                            <ShieldAlert className="text-primary-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Radar Admin <span className="text-primary-500">v2.0</span></h1>
                            <p className="text-[10px] text-gray-500 font-mono">GESTOCK - QUARTIER GÉNÉRAL</p>
                        </div>
                    </div>
                    {/* Onglets navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
                        <button
                            onClick={() => setActiveTab('tenants')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'tenants'
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/30'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Globe size={14} /> Tenants
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'audit'
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/30'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Activity size={14} /> Audit Logs
                        </button>
                    </nav>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono text-gray-400">SYSTÈME OPÉRATIONNEL</span>
                    </div>
                    <button onClick={logout} className="text-gray-400 hover:text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <LogOut size={18} /> 
                        <span className="text-sm font-medium">QUITTER LE QG</span>
                    </button>
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto space-y-10">

                {/* ── Onglet Audit ── */}
                {activeTab === 'audit' && (
                    <AuditLogPage secret={secret} />
                )}

                {activeTab === 'tenants' && (<>
                {/* Statistics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Clients" value={stats.total} icon={<Globe className="text-blue-500" />} color="blue" />
                    <StatCard title="Abonnements Pro+" value={stats.premium} icon={<CreditCard className="text-amber-500" />} color="amber" />
                    <StatCard title="Flux API Actifs" value={stats.activeApis} icon={<Key className="text-green-500" />} color="green" />
                    <StatCard title="Comptes Suspendus" value={stats.suspended} icon={<Ban className="text-red-500" />} color="red" />
                </div>

                {/* Quick Access Buttons */}
                <div className="flex flex-wrap gap-3">
                    <QuickFilterButton 
                        active={activeFilter === 'recent'} 
                        onClick={() => setActiveFilter(activeFilter === 'recent' ? 'all' : 'recent')}
                        icon={<Plus size={16} />}
                        label="Derniers créés (7j)"
                        count={tenants.filter(t => new Date(t.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                    />
                    <QuickFilterButton 
                        active={activeFilter === 'expiring'} 
                        onClick={() => setActiveFilter(activeFilter === 'expiring' ? 'all' : 'expiring')}
                        icon={<Calendar size={16} />}
                        label="Expire bientôt"
                        count={tenants.filter(t => {
                            if (!t.currentPeriodEnd) return false;
                            const diff = new Date(t.currentPeriodEnd).getTime() - new Date().getTime();
                            return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
                        }).length}
                        color="amber"
                    />
                    <QuickFilterButton 
                        active={activeFilter === 'suspended'} 
                        onClick={() => setActiveFilter(activeFilter === 'suspended' ? 'all' : 'suspended')}
                        icon={<BanIcon size={16} />}
                        label="Suspendus"
                        count={tenants.filter(t => t.isSuspended).length}
                        color="red"
                    />
                    <QuickFilterButton 
                        active={activeFilter === 'all'} 
                        onClick={() => setActiveFilter('all')}
                        icon={<Zap size={16} />}
                        label="Tous"
                        count={tenants.length}
                        color="primary"
                    />
                </div>

                {/* API Quick Links */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                        <Terminal size={12} /> Liens API Rapides — Super Admin
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <ApiLinkButton 
                            method="POST"
                            path="/api/v1/superadmin/login"
                            label="Auth QG"
                            description="Connexion avec SUPER_ADMIN_SECRET"
                        />
                        <ApiLinkButton 
                            method="GET"
                            path="/api/v1/superadmin/audit-logs"
                            label="Logs d'Audit"
                            description="Historique des actions critiques"
                            color="primary"
                        />
                        <ApiLinkButton 
                            method="GET"
                            path="/api/v1/superadmin/tenants"
                            label="Liste Tenants"
                            description="Tous les clients actifs"
                            color="blue"
                        />
                        <ApiLinkButton 
                            method="POST"
                            path="/api/v1/superadmin/users-by-id/:userId/reset-password"
                            label="Reset MDP"
                            description="Réinitialiser mot de passe utilisateur"
                            color="amber"
                        />
                    </div>
                </div>

                {/* Search & Actions Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher une boutique (nom, slug)..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase">
                        <LayoutDashboard size={14} /> 
                        {activeFilter !== 'all' ? (
                            <span className="text-primary-400">Filtre actif: {filteredTenants.length} résultat(s)</span>
                        ) : (
                            <span>Affichage de {filteredTenants.length} boutique(s) sur {tenants.length}</span>
                        )}
                    </div>
                </div>

                {/* Tenant List */}
                <div className="grid grid-cols-1 gap-8">
                    {filteredTenants.map(t => (
                        <div key={t.id} className={`group relative bg-gray-900 rounded-3xl overflow-hidden border transition-all duration-300 ${t.isSuspended ? 'border-red-500/30' : 'border-gray-800 hover:border-gray-700 shadow-2xl'}`}>
                            {t.isSuspended && <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>}
                            
                            <div className="p-8 flex flex-col xl:flex-row gap-8 items-start xl:items-center">
                                {/* Section Identité */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">{t.name}</h3>
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                                            t.plan === 'enterprise' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            t.plan === 'pro' ? 'bg-primary-500/10 text-primary-500 border-primary-500/20' :
                                            'bg-gray-800 text-gray-400 border-gray-700'
                                        }`}>
                                            {t.plan}
                                        </span>
                                        {t.isSuspended && (
                                            <span className="flex items-center gap-1 text-[10px] font-black bg-red-500/20 text-red-500 px-2 py-1 rounded border border-red-500/30 uppercase">
                                                <Ban size={10} /> Suspendu
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-primary-500 font-mono text-sm group-hover:text-primary-400 transition-colors">
                                        <Globe size={14} /> {t.slug}.gestock.com
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 pt-4">
                                        <InfoBadge icon={<Users size={12} />} label="Usage" value={`${t.usersCount} utilisateurs`} />
                                        <InfoBadge 
                                            icon={<Clock size={12} />} 
                                            label="Échéance" 
                                            value={t.currentPeriodEnd ? format(new Date(t.currentPeriodEnd), 'dd MMM yyyy', { locale: fr }) : 'Indéfini'} 
                                            highlight={new Date(t.currentPeriodEnd) < new Date()}
                                        />
                                        <InfoBadge 
                                            icon={<Key size={12} />} 
                                            label="API" 
                                            value={`${t.apiKeysCount} clés ${t.apiEnabled ? '(On)' : '(Off)'}`} 
                                            active={t.apiEnabled}
                                        />
                                    </div>
                                </div>

                                {/* Séparateur Vertical */}
                                <div className="hidden xl:block w-px h-32 bg-gray-800"></div>

                                {/* Section Action Commerciale (Plans) */}
                                <div className="w-full xl:w-auto grid grid-cols-2 gap-2">
                                    <p className="col-span-full text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Renouveler Contrat</p>
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'starter', 1)} label="Starter +1 M" />
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'starter', 12)} label="Starter +12 M" />
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'pro', 1)} label="Pro +1 M" color="primary" highlight />
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'pro', 12)} label="Pro +12 M" color="primary" />
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'enterprise', 1)} label="Ent +1 M" color="amber" />
                                    <PlanButton onClick={() => handleUpdatePlan(t.id, 'enterprise', 12)} label="Ent +12 M" color="amber" />
                                </div>

                                {/* Section Contrôle Sécurité */}
                                <div className="w-full xl:w-auto flex flex-col gap-2 min-w-[200px]">
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Droit d'Intervention</p>
                                    <button
                                        onClick={() => handleToggleApi(t.id, t.apiEnabled)}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                                            t.apiEnabled 
                                                ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
                                                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                        }`}
                                    >
                                        {t.apiEnabled ? <Ban size={14} /> : <Unlock size={14} />}
                                        {t.apiEnabled ? 'COUPER ACCÈS API' : 'RÉACTIVER API'}
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(t.id, t.isSuspended)}
                                        className={`px-4 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border shadow-sm ${
                                            t.isSuspended 
                                                ? 'bg-green-600 border-green-500 text-white hover:bg-green-500 shadow-green-900/20' 
                                                : 'bg-red-600 border-red-500 text-white hover:bg-red-500 shadow-red-900/20'
                                        }`}
                                    >
                                        {t.isSuspended ? <Unlock size={14} /> : <AlertTriangle size={14} />}
                                        {t.isSuspended ? 'ANNULER SUSPENSION' : 'SUSPENDRE LE COMPTE'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Section Utilisateurs (Déroulante) */}
                            <TenantUsers tenantId={t.id} secret={secret} />
                        </div>
                    ))}
                </div>
                </>)}
            </main>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
    return (
        <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 shadow-lg hover:border-gray-700 transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                    {icon}
                </div>
            </div>
            <p className="text-gray-500 text-xs uppercase font-black tracking-widest mb-1">{title}</p>
            <h4 className="text-3xl font-black text-white">{value}</h4>
        </div>
    );
}

function InfoBadge({ icon, label, value, highlight, active }: { icon: any, label: string, value: string, highlight?: boolean, active?: boolean }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium ${
            highlight ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
            active === true ? 'bg-green-500/10 border-green-500/30 text-green-400' :
            active === false ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-gray-800/50 border-gray-700 text-gray-400'
        }`}>
            {icon}
            <span className="opacity-50">{label}:</span> {value}
        </div>
    );
}

function PlanButton({ onClick, label, color = 'gray', highlight }: { onClick: () => void, label: string, color?: string, highlight?: boolean }) {
    const colorClasses = {
        primary: 'bg-primary-600 border-primary-500 text-white hover:bg-primary-500',
        amber: 'bg-amber-600 border-amber-500 text-white hover:bg-amber-500',
        gray: 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
    };
    
    return (
        <button 
            onClick={onClick}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all hover:scale-[1.02] active:scale-[0.98] ${colorClasses[color as keyof typeof colorClasses]} ${highlight ? 'shadow-lg shadow-primary-900/20' : ''}`}
        >
            {label}
        </button>
    );
}

function QuickFilterButton({ 
    active, 
    onClick, 
    icon, 
    label, 
    count,
    color = 'gray'
}: { 
    active: boolean;
    onClick: () => void;
    icon: any;
    label: string;
    count: number;
    color?: 'gray' | 'amber' | 'red' | 'primary';
}) {
    const colorClasses = {
        gray: {
            base: 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white',
            active: 'bg-gray-700 border-gray-600 text-white shadow-lg shadow-gray-900/30'
        },
        amber: {
            base: 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20',
            active: 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-900/30'
        },
        red: {
            base: 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20',
            active: 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-900/30'
        },
        primary: {
            base: 'bg-primary-500/10 border-primary-500/20 text-primary-400 hover:bg-primary-500/20',
            active: 'bg-primary-500 border-primary-400 text-white shadow-lg shadow-primary-900/30'
        }
    };
    
    const styles = colorClasses[color];
    const activeClass = active ? styles.active : styles.base;
    
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeClass}`}
        >
            <div className={`${active ? 'text-white' : ''}`}>{icon}</div>
            <div className="flex flex-col items-start">
                <span className="text-xs font-bold">{label}</span>
                <span className={`text-[10px] font-mono ${active ? 'text-white/80' : 'opacity-60'}`}>{count} élément(s)</span>
            </div>
            {active && <div className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse" />}
        </button>
    );
}

function ApiLinkButton({ 
    method, 
    path, 
    label, 
    description,
    color = 'gray'
}: { 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    label: string;
    description: string;
    color?: 'gray' | 'primary' | 'blue' | 'amber' | 'green' | 'red';
}) {
    const methodColors = {
        GET: 'bg-green-500/20 text-green-400 border-green-500/30',
        POST: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        PUT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    
    const colorClasses = {
        gray: 'hover:bg-gray-800 hover:border-gray-600',
        primary: 'hover:bg-primary-500/10 hover:border-primary-500/30',
        blue: 'hover:bg-blue-500/10 hover:border-blue-500/30',
        amber: 'hover:bg-amber-500/10 hover:border-amber-500/30',
        green: 'hover:bg-green-500/10 hover:border-green-500/30',
        red: 'hover:bg-red-500/10 hover:border-red-500/30'
    };
    
    const fullUrl = `${window.location.origin}${path}`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(fullUrl);
        toast.success('URL copiée dans le presse-papiers');
    };
    
    return (
        <div className="group relative bg-gray-900/50 border border-gray-800 rounded-xl p-3 transition-all hover:border-gray-700 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${methodColors[method]}`}>
                    {method}
                </span>
                <span className="text-xs font-bold text-white">{label}</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">{description}</p>
            <div className="flex items-center gap-1">
                <code className="flex-1 text-[9px] font-mono text-gray-600 truncate bg-gray-950 px-2 py-1 rounded">
                    {path}
                </code>
                <button 
                    onClick={handleCopy}
                    className={`p-1.5 rounded-lg bg-gray-800 text-gray-400 transition-all ${colorClasses[color]}`}
                    title="Copier l'URL"
                >
                    <ExternalLink size={12} />
                </button>
            </div>
        </div>
    );
}

function TenantUsers({ tenantId, secret }: { tenantId: string, secret: string | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`/api/v1/superadmin/users-by-tenant/${tenantId}`, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            setUsers(data);
        } catch (error) {
            toast.error('Erreur chargement utilisateurs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const handleReset = async (userId: string, userName: string) => {
        const confirm = window.confirm(`Réinitialiser le mot de passe de ${userName} ?`);
        if (!confirm) return;

        try {
            const { data } = await axios.post(`/api/v1/superadmin/users-by-id/${userId}/reset-password`, {}, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            
            // On affiche le code dans un alert ou modal spécifique car c'est critique
            alert(`✅ MOT DE PASSE RÉINITIALISÉ\n\nNouveau code temporaire pour ${userName} :\n\n${data.tempPassword}\n\nNotez-le bien, il ne sera plus affiché !`);
            fetchUsers();
        } catch (error) {
            toast.error('Erreur réinitialisation');
        }
    };

    const handleUpdateRole = async (userId: string, userName: string, newRole: string) => {
        try {
            const loadToast = toast.loading(`Mise à jour du rôle de ${userName}...`);
            await axios.put(`/api/v1/superadmin/users-by-id/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            toast.dismiss(loadToast);
            toast.success(`Rôle de ${userName} mis à jour en ${newRole.toUpperCase()}`);
            fetchUsers();
        } catch (error) {
            toast.error('Erreur lors du changement de rôle');
        }
    };

    return (
        <div className="border-t border-gray-800">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-8 py-3 flex items-center justify-between text-[10px] font-bold text-gray-500 hover:text-white transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Users size={12} />
                    GESTION DES COMPTES UTILISATEURS
                </div>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isOpen && (
                <div className="px-8 pb-8 animate-in duration-300">
                    {isLoading ? (
                        <div className="py-4 text-center text-xs font-mono animate-pulse">Scan des profils...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map(user => (
                                <div key={user.id} className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-2xl flex flex-col justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-gray-700/50 rounded-lg">
                                            <UserCircle size={18} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{user.firstName} {user.lastName}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{user.email}</p>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <select 
                                                    value={user.role} 
                                                    onChange={(e) => handleUpdateRole(user.id, user.firstName, e.target.value)}
                                                    className="text-[9px] px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 uppercase font-bold outline-none cursor-pointer hover:border-primary-500 transition-all appearance-none"
                                                    style={{ 
                                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                                        backgroundPosition: 'right 0.4rem center',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundSize: '0.6rem',
                                                        paddingRight: '1.4rem'
                                                    }}
                                                >
                                                    <option value="admin">ADMIN</option>
                                                    <option value="manager">MANAGER</option>
                                                    <option value="lecteur">LECTEUR</option>
                                                </select>
                                                {user.mustChangePassword && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 font-black italic">CHANGEMENT REQUIS</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleReset(user.id, user.firstName)}
                                        className="w-full py-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCcw size={12} /> GÉNÉRER CODE TEMPORAIRE
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
