import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor — attach JWT + tenant header
api.interceptors.request.use((config) => {
    const { accessToken, tenant } = useAuthStore.getState()
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    if (tenant?.slug) {
        config.headers['X-Tenant-ID'] = tenant.slug
    }
    return config
})

// Response interceptor — handle 401 + refresh token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            const { refreshToken, setTokens, logout } = useAuthStore.getState()
            if (refreshToken) {
                try {
                    const { data } = await axios.post('/api/v1/auth/refresh', {
                        refreshToken,
                    })
                    setTokens(data.accessToken, data.refreshToken)
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
                    return api(originalRequest)
                } catch {
                    logout()
                }
            } else {
                logout()
            }
        }
        return Promise.reject(error)
    }
)

export default api
