// Hand-written to match supabase/schema.sql.
// Once the Supabase project is live, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type ProductStatus = "published" | "draft" | "hidden";
export type DiscountType = "none" | "percentage" | "fixed";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type PromotionStatus = "draft" | "scheduled" | "active" | "expired" | "archived";
export type PromotionCtaType = "product" | "category" | "collection" | "shop" | "custom_page";
export type OrderStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";
export type UserRole = "owner_admin" | "sales_staff";

export interface UserRow {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface CollectionProductRow {
  collection_id: string;
  product_id: string;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  sku: string | null;
  regular_price: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_start: string | null;
  discount_end: string | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: StockStatus;
  status: ProductStatus;
  ingredients: string | null;
  usage_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  sku_suffix: string | null;
  additional_price: number;
  stock_quantity: number;
  display_order: number;
  created_at: string;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  subtotal: number;
  discount_total: number;
  estimated_total: number;
  delivery_location: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  regular_price: number;
  discount_amount: number;
  final_price: number;
  subtotal: number;
}

export interface InventoryTransactionRow {
  id: string;
  product_id: string;
  quantity_change: number;
  reason: string;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_type: PromotionCtaType;
  cta_target: string | null;
  start_date: string;
  end_date: string;
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
}

type TableDef<Row, RequiredInsertKeys extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      users: TableDef<UserRow, "name" | "email">;
      categories: TableDef<CategoryRow, "name" | "slug">;
      collections: TableDef<CollectionRow, "name" | "slug">;
      collection_products: TableDef<CollectionProductRow, "collection_id" | "product_id">;
      products: TableDef<ProductRow, "name" | "slug" | "regular_price">;
      product_variants: TableDef<ProductVariantRow, "product_id" | "variant_type" | "variant_value">;
      product_images: TableDef<ProductImageRow, "product_id" | "image_url">;
      customers: TableDef<CustomerRow, "name">;
      orders: TableDef<OrderRow, "customer_id" | "delivery_location">;
      order_items: TableDef<
        OrderItemRow,
        "order_id" | "product_name" | "quantity" | "regular_price" | "final_price" | "subtotal"
      >;
      inventory_transactions: TableDef<
        InventoryTransactionRow,
        "product_id" | "quantity_change" | "reason"
      >;
      promotions: TableDef<PromotionRow, "title" | "start_date" | "end_date">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_status: ProductStatus;
      discount_type: DiscountType;
      stock_status: StockStatus;
      promotion_status: PromotionStatus;
      promotion_cta_type: PromotionCtaType;
      order_status: OrderStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
