"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPromotion, updatePromotion, type PromotionFormInput } from "@/app/actions/admin/promotions";
import type { PromotionCtaType, PromotionStatus } from "@/types/database";

interface ExistingPromotion {
  id: string;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_type: PromotionCtaType;
  cta_target: string | null;
  start_date: string;
  end_date: string;
  status: PromotionStatus;
}

export function PromotionForm({ existing }: { existing?: ExistingPromotion }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const input: PromotionFormInput = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      ctaText: String(form.get("ctaText") || ""),
      ctaType: String(form.get("ctaType") || "shop") as PromotionCtaType,
      ctaTarget: String(form.get("ctaTarget") || ""),
      startDate: String(form.get("startDate") || ""),
      endDate: String(form.get("endDate") || ""),
      status: String(form.get("status") || "draft") as PromotionStatus,
    };

    const result = existing
      ? await updatePromotion(existing.id, input)
      : await createPromotion(input);

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || "Something went wrong.");
      return;
    }
    router.push("/admin/promotions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-rose/15 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="title" className="field-label">Title</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Christmas Beauty Edit"
            defaultValue={existing?.title}
            className="field-input mt-1.5"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="field-label">Description</label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="Special prices on selected beauty essentials."
            defaultValue={existing?.description ?? ""}
            className="field-textarea mt-1.5"
          />
        </div>
      </div>

      <div className="rounded-xl border border-rose/15 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-brown">Call to action</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ctaText" className="field-label">Button text</label>
            <input
              id="ctaText"
              name="ctaText"
              defaultValue={existing?.cta_text ?? ""}
              placeholder="Shop the Collection"
              className="field-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="ctaType" className="field-label">Links to</label>
            <select
              id="ctaType"
              name="ctaType"
              defaultValue={existing?.cta_type ?? "shop"}
              className="field-select mt-1.5"
            >
              <option value="shop">Shop page</option>
              <option value="collection">Collection</option>
              <option value="category">Category</option>
              <option value="product">Product</option>
              <option value="custom_page">Custom URL</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="ctaTarget" className="field-label">Target</label>
          <input
            id="ctaTarget"
            name="ctaTarget"
            defaultValue={existing?.cta_target ?? ""}
            placeholder="the-pink-edit"
            className="field-input mt-1.5"
          />
          <p className="field-hint">
            The collection/category/product slug it should link to — or a full URL if you chose Custom URL above.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-rose/15 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-brown">Schedule</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="field-label">Start date</label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              required
              defaultValue={existing?.start_date?.slice(0, 10)}
              className="field-input mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="field-label">End date</label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              required
              defaultValue={existing?.end_date?.slice(0, 10)}
              className="field-input mt-1.5"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="status" className="field-label">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={existing?.status ?? "draft"}
            className="field-select mt-1.5"
          >
            <option value="draft">Draft — not visible anywhere yet</option>
            <option value="scheduled">Scheduled — will go live on the start date</option>
            <option value="active">Active — live on the site now</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-rose px-6 py-2.5 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
      >
        {submitting ? "Saving…" : existing ? "Save changes" : "Create promotion"}
      </button>
    </form>
  );
}
