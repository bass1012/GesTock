import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Package, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        companyName: '',
        companySlug: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        if (field === 'companyName') {
            setForm((prev) => ({
                ...prev,
                [field]: value,
                companySlug: value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
            }))
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await register(form)
            toast.success('Compte créé avec succès !')
            navigate('/')
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/20 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Package size={24} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">GesStock</span>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight mb-6">
                        Commencez<br />
                        <span className="text-primary-200">gratuitement.</span>
                    </h1>
                    <p className="text-lg text-primary-200 leading-relaxed max-w-md">
                        Créez votre espace en quelques secondes. Aucune carte bancaire requise pour le plan Starter.
                    </p>
                </div>
                <div className="relative z-10 grid grid-cols-3 gap-4">
                    {['500 produits', '3 utilisateurs', 'Rapports basiques'].map((feature) => (
                        <div key={feature} className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-center">
                            <p className="text-sm font-medium">{feature}</p>
                            <p className="text-xs text-primary-200 mt-1">Plan Starter</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right — Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                            <Package size={24} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">GesStock</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
                    <p className="text-gray-500 mb-8">Configurez votre espace de gestion de stock</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                <input id="firstName" type="text" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="input" placeholder="Ahmed" required />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input id="lastName" type="text" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="input" placeholder="Benali" required />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                            <input id="companyName" type="text" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} className="input" placeholder="Mon Entreprise SARL" required />
                        </div>

                        <div>
                            <label htmlFor="companySlug" className="block text-sm font-medium text-gray-700 mb-1">Identifiant (URL)</label>
                            <div className="flex items-center">
                                <input id="companySlug" type="text" value={form.companySlug} onChange={(e) => updateField('companySlug', e.target.value)} className="input rounded-r-none" placeholder="mon-entreprise" required />
                                <span className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.gestock.app</span>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="input" placeholder="vous@entreprise.com" required />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                            <div className="relative">
                                <input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} className="input pr-11" placeholder="8 caractères minimum" required minLength={8} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Création...' : 'Créer mon espace'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Déjà un compte ?{' '}
                        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                            Se connecter
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
