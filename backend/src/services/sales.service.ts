import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class SalesService {
  async getAllSales(tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const sales = await prisma.$queryRawUnsafe(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM "${schemaName}".sale_items WHERE sale_id = s.id) as "_count_items"
       FROM "${schemaName}".sales s
       ORDER BY s.created_at DESC`
    ) as any[]

    return sales.map(s => ({
      id: s.id,
      clientId: s.client_id,
      status: s.status,
      totalAmount: s.total_amount,
      taxRate: s.tax_rate,
      taxAmount: s.tax_amount,
      reference: s.reference,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      _count: { items: Number(s._count_items) }
    }))
  }

  async getSaleById(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`;
    const sales = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaName}".sales WHERE id = $1::uuid`, id) as any[];
    if (!sales.length) return null;
    
    const items = await prisma.$queryRawUnsafe(`
        SELECT si.*, p.name as product_name
        FROM "${schemaName}".sale_items si
        JOIN "${schemaName}".products p ON si.product_id = p.id
        WHERE si.sale_id = $1::uuid
    `, id) as any[];

    return {
        ...sales[0],
        createdAt: sales[0].created_at,
        totalAmount: sales[0].total_amount,
        items: items.map(it => ({
            quantity: it.quantity,
            unitPrice: it.unit_price,
            product: { name: it.product_name }
        }))
    };
  }

  async createSale(data: any, userId: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    
    let totalAmount = 0;
    const prefix = data.type === 'DEV' ? 'DEV' : 'FAC';
    const reference = `${prefix}-${Date.now().toString().slice(-6)}`;
    
    const resolvedItems = [];
    
    // Check stock explicitly via Raw query to hit Tenant domain
    for (const item of data.items) {
      const prods = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${schemaName}".products WHERE id = $1::uuid`, 
          item.productId
      ) as any[];
      
      if (!prods.length) throw new Error(`Produit introuvable : ${item.productId}`);
      const product = prods[0];
      
      if (data.type === 'FAC') {
          if (product.current_stock < item.quantity) {
              throw new Error(`Stock insuffisant pour le produit: ${product.name}`);
          }
      }
      
      totalAmount += product.price * item.quantity;
      resolvedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          product
      });
    }

    let taxAmount = 0;
    if (data.taxRate && data.taxRate > 0) {
        taxAmount = totalAmount * (data.taxRate / 100);
    }
    const finalTotal = totalAmount + taxAmount;

    // Create Sale Ticket
    const saleResult = await prisma.$queryRawUnsafe(`
      INSERT INTO "${schemaName}".sales (client_id, status, total_amount, tax_rate, tax_amount, reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, data.clientId || null, data.type === 'DEV' ? 'DRAFT' : 'COMPLETED', finalTotal, data.taxRate || 0, taxAmount, reference) as any[];
    
    const sale = saleResult[0];

    // Sub-items creation and Stock Deduction
    for (const it of resolvedItems) {
        await prisma.$queryRawUnsafe(`
          INSERT INTO "${schemaName}".sale_items (sale_id, product_id, quantity, unit_price)
          VALUES ($1::uuid, $2::uuid, $3, $4)
        `, sale.id, it.productId, it.quantity, it.unitPrice);

        if (data.type === 'FAC') {
            await prisma.$queryRawUnsafe(`
              UPDATE "${schemaName}".products 
              SET current_stock = current_stock - $1, updated_at = NOW() 
              WHERE id = $2::uuid
            `, it.quantity, it.productId);

            // Audit
            await prisma.$queryRawUnsafe(`
              INSERT INTO "${schemaName}".stock_movements (product_id, type, quantity, reference, note, created_by)
              VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
            `, it.productId, 'OUT', it.quantity, reference, `Vente Caisse ${reference}`, userId);
        }
    }

    return sale;
  }
}

export const salesService = new SalesService()
