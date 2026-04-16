import api from '../services/api'
import { useAuthStore, User, Tenant } from '../store/authStore'

export const useAuth = () => {
    const { setAuth, logout: storeLogout, isAuthenticated, user, tenant } = useAuthStore()

    const login = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password })
        setAuth(data.user as User, data.tenant as Tenant, data.accessToken, data.refreshToken)
        return data
    }

    const register = async (payload: {
        email: string
        password: string
        firstName: string
        lastName: string
        companyName: string
        companySlug: string
    }) => {
        const { data } = await api.post('/auth/register', payload)
        setAuth(data.user as User, data.tenant as Tenant, data.accessToken, data.refreshToken)
        return data
    }

    const logout = async () => {
        try {
            await api.post('/auth/logout')
        } catch {
            // ignore
        }
        storeLogout()
    }

    return { login, register, logout, isAuthenticated, user, tenant }
}
