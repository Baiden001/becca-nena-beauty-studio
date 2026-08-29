"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/app/actions/admin/catalog";

export function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createCategory(name, slug);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || "Could not create category.");
      return;
    }
    setName("");
    setSlug("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="category-name" className="field-label">Name</label>
        <input
          id="category-name"
          value={name}
          placeholder="Skincare"
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, "-"));
          }}
          className="field-input-sm mt-1.5 w-44"
        />
      </div>
      <div>
        <label htmlFor="category-slug" className="field-label">Slug</label>
        <input
          id="category-slug"
          value={slug}
          placeholder="skincare"
          onChange={(e) => setSlug(e.target.value)}
          className="field-input-sm mt-1.5 w-44"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-rose px-4 py-2 text-xs font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
      >
        {submitting ? "Adding…" : "Add category"}
      </button>
      {error && <p className="w-full field-error">{error}</p>}
    </form>
  );
}
