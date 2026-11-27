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
export type PaymentStatus = "pending" | "paid" | "failed";
export type SalesChannel = "online" | "walk_in";
export type PaymentMethod = "cash" | "mobile_money" | "card" | "pos_terminal" | "bank_transfer";
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
  barcode: string | null;
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
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_channel: string | null;
  paid_at: string | null;
  channel: SalesChannel;
  payment_method: PaymentMethod | null;
  sold_by: string | null;
  /** Discount given on the whole sale (GH₵), 0 when none. */
  manual_discount: number;
  discount_reason: string | null;
  /** Staff member who gave the discount. */
  discount_approved_by: string | null;
  created_at: string;
  updated_at: string;
}

/** One part of how a sale was paid (a sale can be split across methods). */
export interface OrderPaymentRow {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  created_at: string;
}

export interface ReturnRow {
  id: string;
  return_number: string;
  order_id: string;
  processed_by: string | null;
  refund_method: PaymentMethod;
  reason: string;
  notes: string | null;
  refund_total: number;
  created_at: string;
}

export interface ReturnItemRow {
  id: string;
  return_id: string;
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  restocked: boolean;
}

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
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
      newsletter_subscribers: TableDef<NewsletterSubscriberRow, "email">;
      order_payments: TableDef<OrderPaymentRow, "order_id" | "method" | "amount">;
      returns: TableDef<ReturnRow, "return_number" | "order_id" | "refund_method" | "reason">;
      return_items: TableDef<
        ReturnItemRow,
        "return_id" | "order_item_id" | "product_name" | "quantity" | "unit_price" | "refund_amount"
      >;
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
    Functions: {
      fn_record_return: {
        Args: {
          p_order_id: string;
          p_processed_by: string;
          p_refund_method: PaymentMethod;
          p_reason: string;
          p_notes: string | null;
          p_lines: { order_item_id: string; quantity: number; restock: boolean }[];
        };
        Returns: { out_return_id: string; out_return_number: string; out_refund_total: number }[];
      };
      fn_record_walk_in_sale: {
        Args: {
          p_customer_id: string;
          p_sold_by: string;
          p_payment_method: PaymentMethod;
          p_notes: string | null;
          p_lines: {
            product_id: string;
            quantity: number;
            regular_price: number;
            final_price: number;
          }[];
          p_payments?: { method: PaymentMethod; amount: number; reference?: string | null }[] | null;
          p_manual_discount?: number;
          p_discount_reason?: string | null;
          p_discount_approved_by?: string | null;
        };
        Returns: { out_order_id: string; out_order_number: string }[];
      };
    };
    Enums: {
      product_status: ProductStatus;
      discount_type: DiscountType;
      stock_status: StockStatus;
      promotion_status: PromotionStatus;
      promotion_cta_type: PromotionCtaType;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      sales_channel: SalesChannel;
      payment_method: PaymentMethod;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
