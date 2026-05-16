import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const navigate = useNavigate()
  const { user, setAuth, tenant, accessToken, refreshToken } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      return toast.error('Le mot de passe doit faire au moins 8 caractères')
    }

    if (password !== confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas')
    }

    setIsLoading(true)
    try {
      await api.post('/auth/change-password-mandatory', { newPassword: password })

      // Update store state to remove the mandatory change flag
      if (user && tenant && accessToken && refreshToken) {
        setAuth({ ...user, mustChangePassword: false }, tenant, accessToken, refreshToken)
      }

      setIsSuccess(true)
      toast.success('Mot de passe sécurisé !')
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error: unknown) {
      const err = error as any
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-8 text-center">
        <div className="size-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Compte Sécurisé</h1>
        <p className="text-gray-400">
          Votre nouveau mot de passe a été enregistré.
          <br />
          Redirection vers votre espace…
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] size-[40%] bg-primary-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] size-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Inner Glow */}
          <div className="absolute -top-24 -left-24 size-48 bg-primary-500/10 blur-[60px] rounded-full"></div>

          <div className="flex justify-center mb-10">
            <div className="size-20 bg-gradient-to-br from-primary-500/20 to-blue-600/20 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner group animate-float">
              <ShieldCheck
                size={40}
                className="text-primary-400 group-hover:scale-110 transition-transform"
              />
            </div>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase italic leading-none">
              Protection <span className="text-primary-500">Activée</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              Configurez votre nouvel accès pour déverrouiller vos outils logistiques.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="new-password"
                className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"
              >
                Nouveau Mot de Passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2"
              >
                Confirmer le Mot de Passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="Répétez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-xl shadow-lg shadow-primary-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Sécurisation…' : 'ACTIVER MON ACCÈS'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[10px] text-gray-600 font-mono tracking-tighter">
          SYSTÈME DE PROTECTION GESTOCK v1.2 · CHIFFREMENT AES-256
        </p>
      </div>
    </div>
  )
}
