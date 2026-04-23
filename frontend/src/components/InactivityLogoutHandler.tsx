import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

const timeoutMinutesRaw = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MINUTES)
const timeoutMinutes = Number.isFinite(timeoutMinutesRaw) && timeoutMinutesRaw > 0 ? timeoutMinutesRaw : 120
const INACTIVITY_MS = timeoutMinutes * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 1000
const ACTIVITY_KEY = 'gestock-last-activity'
const FORCE_LOGOUT_KEY = 'gestock-force-logout'

export default function InactivityLogoutHandler() {
    const navigate = useNavigate()
    const timeoutHandledRef = useRef(false)

    useEffect(() => {
        const { isAuthenticated } = useAuthStore.getState()
        if (!isAuthenticated) {
            return
        }

        const markActivity = () => {
            localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
        }

        const performLogout = async (notify = true) => {
            const { refreshToken, logout } = useAuthStore.getState()

            try {
                await api.post('/auth/logout', { refreshToken })
            } catch {
                // Ignore API failures; local logout must still happen.
            }

            logout()
            localStorage.removeItem(ACTIVITY_KEY)
            localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()))

            if (notify) {
                toast.error(`Session expiree apres ${timeoutMinutes} min d'inactivite.`)
            }

            navigate('/login', { replace: true })
        }

        const checkInactivity = async () => {
            if (timeoutHandledRef.current) {
                return
            }

            const { isAuthenticated: stillAuthenticated } = useAuthStore.getState()
            if (!stillAuthenticated) {
                return
            }

            const lastActivityRaw = localStorage.getItem(ACTIVITY_KEY)
            const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : Date.now()
            if (!lastActivityRaw) {
                localStorage.setItem(ACTIVITY_KEY, String(lastActivity))
                return
            }

            if (Date.now() - lastActivity >= INACTIVITY_MS) {
                timeoutHandledRef.current = true
                await performLogout(true)
            }
        }

        const onStorage = async (event: StorageEvent) => {
            if (event.key === FORCE_LOGOUT_KEY && event.newValue) {
                if (timeoutHandledRef.current) {
                    return
                }
                timeoutHandledRef.current = true
                const { isAuthenticated: stillAuthenticated, logout } = useAuthStore.getState()
                if (!stillAuthenticated) {
                    return
                }
                logout()
                localStorage.removeItem(ACTIVITY_KEY)
                toast.error('Session fermée sur un autre onglet.')
                navigate('/login', { replace: true })
            }
        }

        markActivity()

        const events: Array<keyof WindowEventMap> = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'click',
        ]

        events.forEach((eventName) => {
            window.addEventListener(eventName, markActivity, { passive: true })
        })
        window.addEventListener('storage', onStorage)

        const intervalId = window.setInterval(() => {
            void checkInactivity()
        }, CHECK_INTERVAL_MS)

        return () => {
            window.clearInterval(intervalId)
            events.forEach((eventName) => {
                window.removeEventListener(eventName, markActivity)
            })
            window.removeEventListener('storage', onStorage)
            timeoutHandledRef.current = false
        }
    }, [navigate])

    return null
}
