import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Boxes, Eye, EyeOff, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const data = await login(email, password)
            toast.success('Connexion réussie')
            
            if (data.user.mustChangePassword) {
                navigate('/change-password')
            } else {
                navigate('/')
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Identifiants invalides')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left — Branding & Visual */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#09090b] text-white p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Halos */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary-900/40 blur-[150px]"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-950/50 blur-[120px]"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,#09090b_100%)]"></div>
                </div>

                {/* Top: Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
                            <Boxes size={24} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            GesStock
                        </span>
                    </div>
                </div>

                {/* Middle: Hero Image & Text */}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-full max-w-xl mb-12 animate-float opacity-0 [animation-fill-mode:forwards] animate-in">
                        <div className="relative p-1.5 rounded-[2.5rem] bg-gradient-to-br from-white/20 via-white/5 to-transparent backdrop-blur-md border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                            <img 
                                src="/images/login-hero-premium.png" 
                                alt="Futuristic Warehouse" 
                                className="w-full h-auto rounded-[2.2rem] object-cover shadow-inner"
                            />
                            {/* Decorative elements over image */}
                            <div className="absolute -bottom-8 -right-8 p-5 glass-dark rounded-2xl border border-white/20 shadow-2xl hidden xl:block animate-in delay-300 opacity-0 [animation-fill-mode:forwards]">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping"></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-0.5">Moteur GStock</p>
                                        <p className="text-xs font-bold text-white tracking-wide">Optimisation Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center max-w-md animate-in delay-100 opacity-0 [animation-fill-mode:forwards]">
                        <h1 className="text-5xl font-black tracking-tighter mb-6 leading-[1.1]">
                            Propulsez votre <span className="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">Logistique.</span>
                        </h1>
                        <p className="text-gray-400 text-lg font-medium leading-relaxed">
                            L'écosystème complet pour gérer, suivre et optimiser vos stocks avec une précision absolue.
                        </p>
                    </div>
                </div>

                {/* Bottom: Footer Info */}
                <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-6">
                    <span>© 2026 GesStock Cloud</span>
                    <div className="flex gap-4">
                        <span>Status: Online</span>
                        <span>v1.2.0</span>
                    </div>
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

                    <h2 className="text-3xl font-black text-gray-900 mb-3 animate-in opacity-0 [animation-fill-mode:forwards]">
                        Re-bienvenue.
                    </h2>
                    <p className="text-gray-500 mb-10 animate-in delay-100 opacity-0 [animation-fill-mode:forwards]">
                        Accédez à votre tableau de bord sécurisé.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="animate-in delay-200 opacity-0 [animation-fill-mode:forwards]">
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input input-glow bg-gray-50/50 border-gray-200"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="animate-in delay-300 opacity-0 [animation-fill-mode:forwards]">
                            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input input-glow bg-gray-50/50 border-gray-200 pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="animate-in delay-400 opacity-0 [animation-fill-mode:forwards]">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-4 text-base shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Validation...
                                    </span>
                                ) : (
                                    'Connecter mon espace'
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Pas encore de compte ?{' '}
                        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
