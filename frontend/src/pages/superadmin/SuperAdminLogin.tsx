import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Lock, Mail, KeyRound, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { data } = await axios.post(
        '/api/v1/superadmin/login',
        { email, password, code }
      )
      localStorage.setItem('superadmin_secret', data.accessToken)
      toast.success('Accès Super Admin autorisé')
      if (navigate) {
        navigate('/superadmin/dashboard')
      } else {
        window.location.href = '/superadmin/dashboard'
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Identifiants ou code 2FA incorrects'
      toast.error(errorMsg)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
      <div className="max-w-md w-full bg-zinc-850 rounded-2xl shadow-xl overflow-hidden p-8 border border-zinc-800">
        <div className="flex justify-center mb-6">
          <div className="size-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30">
            <Lock className="text-white size-8" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-white mb-2">Quartier Général</h2>
        <p className="text-center text-zinc-400 mb-8 font-medium">
          Authentification Administrateur GesStock
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 size-5" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-zinc-600"
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 size-5" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-zinc-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-2">
              Code de sécurité 2FA
            </label>
            <div className="relative">
              <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 size-5" />
              <input
                id="code"
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white font-mono text-center tracking-widest placeholder-zinc-600"
                placeholder="000000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password || code.length !== 6}
            className="w-full mt-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Vérification…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
