import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class ClientsService {
  async getAllClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  async getClientById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  async createClient(data: { name: string; email?: string; phone?: string; address?: string }) {
    return prisma.client.create({
      data
    })
  }

  async updateClient(id: string, data: any) {
    return prisma.client.update({
      where: { id },
      data
    })
  }

  async deleteClient(id: string) {
    return prisma.client.delete({
      where: { id }
    })
  }
}

export const clientsService = new ClientsService()
