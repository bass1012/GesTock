import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface Plan {
  name: string
  price: number
  productLimit: number
  userLimit: number
  warehouseLimit: number
  features: string[]
}

export interface PlansResponse {
  starter: Plan
  pro: Plan
  enterprise: Plan
}

export interface BillingInfo {
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

export interface Invoice {
  id: string
  amount: number
  status: string
  createdAt: string
  invoicePdf: string | null
}

export const usePlans = () => {
  return useQuery<{ data: PlansResponse }>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await api.get('/billing/plans')
      return data
    },
  })
}

export const useBillingInfo = () => {
  return useQuery<{ data: BillingInfo }>({
    queryKey: ['billing-info'],
    queryFn: async () => {
      const { data } = await api.get('/billing/info')
      return data
    },
  })
}

export const usePlanUsage = () => {
  return useQuery<{ productsCount: number; usersCount: number }>({
    queryKey: ['plan-usage'],
    queryFn: async () => {
      // Fetch both in parallel
      const [productsRes, usersRes] = await Promise.all([
        api.get('/products?page=1&limit=1'),
        api.get('/users'),
      ])
      return {
        productsCount: productsRes.data.total ?? 0,
        usersCount: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
      }
    },
    staleTime: 30_000, // refresh every 30s
  })
}

export const useCreateSubscription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ plan, priceId }: { plan: string; priceId: string }) => {
      const { data } = await api.post('/billing/subscribe', { plan, priceId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-info'] })
      toast.success('Abonnement créé avec succès')
    },
    onError: () => {
      toast.error("Erreur lors de la création de l'abonnement")
    },
  })
}

export const useCancelSubscription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/cancel')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-info'] })
      toast.success('Abonnement annulé (prendra fin à la fin de la période)')
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation")
    },
  })
}

export const useResumeSubscription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/resume')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-info'] })
      toast.success('Abonnement réactivé')
    },
    onError: () => {
      toast.error('Erreur lors de la réactivation')
    },
  })
}

export const useInvoices = () => {
  return useQuery<{ data: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await api.get('/billing/invoices')
      return data
    },
  })
}

export const useCreateSetupIntent = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/setup-intent')
      return data.data.clientSecret
    },
  })
}

export const useCreatePortalSession = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/portal')
      return data.data.url
    },
    onError: () => {
      toast.error("Erreur lors de l'ouverture du portail")
    },
  })
}
