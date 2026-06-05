-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "iv" TEXT;

-- AlterTable
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "email_verification_expires" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "email_verification_token" TEXT,
ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockout_until" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" JSONB,
ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "tenant_id" TEXT,
    "resource" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier_returns" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reference" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_returns_supplier_id_idx" ON "supplier_returns"("supplier_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_returns_warehouse_id_idx" ON "supplier_returns"("warehouse_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_returns_status_idx" ON "supplier_returns"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_return_items_return_id_idx" ON "supplier_return_items"("return_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_return_items_product_id_idx" ON "supplier_return_items"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_keys_created_at_idx" ON "api_keys"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_is_deleted_idx" ON "products"("is_deleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "purchase_orders_created_at_idx" ON "purchase_orders"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_client_id_idx" ON "sales"("client_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_created_at_idx" ON "sales"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_reference_idx" ON "sales"("reference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "supplier_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
