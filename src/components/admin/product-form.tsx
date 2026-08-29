"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, type ProductFormInput } from "@/app/actions/admin/products";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { DiscountType, ProductStatus } from "@/types/database";

interface Category {
  id: string;
  name: string;
}

interface ExistingProduct {
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
  low_stock_threshold: number;
  status: ProductStatus;
  ingredients: string | null;
  usage_instructions: string | null;
}

export function ProductForm({
  categories,
  existing,
  existingImages = [],
  existingVariants = [],
}: {
  categories: Category[];
  existing?: ExistingProduct;
  existingImages?: string[];
  existingVariants?: { variant_type: string; variant_value: string }[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);
  const [slugForUpload, setSlugForUpload] = useState(existing?.slug ?? "");
  const [variants, setVariants] = useState<{ type: string; value: string }[]>(
    existingVariants.length
      ? existingVariants.map((v) => ({ type: v.variant_type, value: v.variant_value }))
      : []
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const input: ProductFormInput = {
      name: String(form.get("name") || ""),
      slug: String(form.get("slug") || ""),
      description: String(form.get("description") || ""),
      brand: String(form.get("brand") || ""),
      categoryId: String(form.get("categoryId") || ""),
      sku: String(form.get("sku") || ""),
      regularPrice: Number(form.get("regularPrice") || 0),
      discountType: (String(form.get("discountType") || "none") as DiscountType),
      discountValue: Number(form.get("discountValue") || 0),
      discountStart: String(form.get("discountStart") || ""),
      discountEnd: String(form.get("discountEnd") || ""),
      lowStockThreshold: Number(form.get("lowStockThreshold") || 5),
      status: (String(form.get("status") || "draft") as ProductStatus),
      ingredients: String(form.get("ingredients") || ""),
      usageInstructions: String(form.get("usageInstructions") || ""),
      imageUrls: imageUrls.map((u) => u.trim()).filter(Boolean),
      variants: variants.filter((v) => v.type.trim() && v.value.trim()),
    };

    const result = existing
      ? await updateProduct(existing.id, input)
      : await createProduct(input);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || "Something went wrong.");
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            name="name"
            placeholder="Matte Rose Lipstick"
            defaultValue={existing?.name}
            required
          />
          <div>
            <label htmlFor="slug" className="field-label">Slug</label>
            <input
              id="slug"
              name="slug"
              required
              placeholder="matte-rose-lipstick"
              defaultValue={existing?.slug}
              onChange={(e) => setSlugForUpload(e.target.value)}
              className="field-input mt-1.5"
            />
            <p className="field-hint">Used in the product's URL and photo folder — letters, numbers, hyphens.</p>
          </div>
          <Field label="Brand" name="brand" placeholder="Becca Nena" defaultValue={existing?.brand ?? ""} />
          <Field label="SKU" name="sku" placeholder="BN-LIP-001" defaultValue={existing?.sku ?? ""} />
        </div>

        <div className="mt-4">
          <label htmlFor="categoryId" className="field-label">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={existing?.category_id ?? ""}
            className="field-select mt-1.5"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="field-label">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="A short, sellable description customers will see on the product page."
            defaultValue={existing?.description ?? ""}
            className="field-textarea mt-1.5"
          />
        </div>
      </Section>

      <Section title="Pricing & discount">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Regular price (GH₵)"
            name="regularPrice"
            type="number"
            step="0.01"
            placeholder="250.00"
            defaultValue={existing?.regular_price}
            required
          />
          <div>
            <label htmlFor="discountType" className="field-label">Discount type</label>
            <select
              id="discountType"
              name="discountType"
              defaultValue={existing?.discount_type ?? "none"}
              className="field-select mt-1.5"
            >
              <option value="none">None</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <Field
            label="Discount value"
            name="discountValue"
            type="number"
            step="0.01"
            placeholder="20"
            defaultValue={existing?.discount_value ?? 0}
            hint="A percent (e.g. 20) or a cedi amount, depending on the type above."
          />
          <Field
            label="Low-stock threshold"
            name="lowStockThreshold"
            type="number"
            placeholder="5"
            defaultValue={existing?.low_stock_threshold ?? 5}
            hint="Flags as “low stock” once quantity drops to this number or below."
          />
          <Field
            label="Discount start"
            name="discountStart"
            type="date"
            defaultValue={existing?.discount_start?.slice(0, 10) ?? ""}
          />
          <Field
            label="Discount end"
            name="discountEnd"
            type="date"
            defaultValue={existing?.discount_end?.slice(0, 10) ?? ""}
          />
        </div>
      </Section>

      <Section title="Product details">
        <label htmlFor="ingredients" className="field-label">Ingredients</label>
        <textarea
          id="ingredients"
          name="ingredients"
          rows={2}
          placeholder="Aqua, Cera Alba, Ricinus Communis Seed Oil…"
          defaultValue={existing?.ingredients ?? ""}
          className="field-textarea mt-1.5"
        />

        <label htmlFor="usageInstructions" className="field-label mt-4">Usage instructions</label>
        <textarea
          id="usageInstructions"
          name="usageInstructions"
          rows={2}
          placeholder="Apply to clean, dry lips. Reapply as needed."
          defaultValue={existing?.usage_instructions ?? ""}
          className="field-textarea mt-1.5"
        />
      </Section>

      <Section title="Photos">
        <ImageUploader productSlug={slugForUpload} value={imageUrls} onChange={setImageUrls} />
      </Section>

      <Section title="Variants" description="Optional — size, shade, or any other option customers choose from.">
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={v.type}
                onChange={(e) =>
                  setVariants((prev) =>
                    prev.map((item, idx) => (idx === i ? { ...item, type: e.target.value } : item))
                  )
                }
                placeholder="Type — e.g. shade"
                className="field-input w-32"
              />
              <input
                value={v.value}
                onChange={(e) =>
                  setVariants((prev) =>
                    prev.map((item, idx) => (idx === i ? { ...item, value: e.target.value } : item))
                  )
                }
                placeholder="Value — e.g. Rose Nude"
                className="field-input flex-1"
              />
              <button
                type="button"
                onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove variant"
                className="rounded-md px-2 text-sm text-taupe hover:bg-cream hover:text-rose"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariants((prev) => [...prev, { type: "", value: "" }])}
            className="text-sm text-rose underline underline-offset-2"
          >
            + Add variant
          </button>
        </div>
      </Section>

      <Section title="Visibility">
        <select
          name="status"
          defaultValue={existing?.status ?? "draft"}
          className="field-select"
        >
          <option value="draft">Draft — hidden while you finish setting it up</option>
          <option value="published">Published — visible in the storefront</option>
          <option value="hidden">Hidden — kept out of the storefront on purpose</option>
        </select>
      </Section>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
      >
        {submitting ? "Saving…" : existing ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-rose/15 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-medium text-brown">{title}</legend>
      {description && <p className="-mt-1 mb-3 text-xs text-taupe">{description}</p>}
      {children}
    </fieldset>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  placeholder,
  defaultValue,
  required = false,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  placeholder?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field-input mt-1.5"
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
