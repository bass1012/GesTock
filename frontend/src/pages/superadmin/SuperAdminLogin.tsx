import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminLogin() {
    const [secret, setSecret] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post('http://localhost:3001/api/v1/superadmin/login', {}, {
                headers: { Authorization: `Bearer ${secret}` }
            });
            localStorage.setItem('superadmin_secret', secret);
            toast.success('Accès Super Admin autorisé');
            if(navigate) {
               navigate('/superadmin/dashboard');
            } else {
               window.location.href = '/superadmin/dashboard';
            }
        } catch (error) {
            toast.error('Code Maître invalide');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-700">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-center text-white mb-2">Quartier Général</h2>
                <p className="text-center text-gray-400 mb-8 font-medium">Contrôle d'activation centralisé GesStock</p>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Code Maître Sécurisé
                        </label>
                        <input
                            type="password"
                            required
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white font-mono text-center tracking-widest placeholder-gray-600"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading || !secret}
                        className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Vérification...' : 'Déverrouiller le Panel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
