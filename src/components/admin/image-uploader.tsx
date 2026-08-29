"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";
const MAX_FILE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Pulls the storage object path back out of a public bucket URL. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export function ImageUploader({
  productSlug,
  value,
  onChange,
}: {
  productSlug: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);
    setUploading(true);

    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`${file.name}: only JPEG, PNG, or WebP images are supported.`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`${file.name}: images must be under ${MAX_FILE_MB}MB.`);
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${productSlug || "unassigned"}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(`${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    if (uploaded.length) onChange([...value, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove(url: string) {
    onChange(value.filter((u) => u !== url));
    const path = pathFromPublicUrl(url);
    if (path) {
      // Best-effort cleanup — the product still saves fine even if this
      // fails, it just leaves an orphaned file in storage.
      await supabase.storage.from(BUCKET).remove([path]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div key={url} className="group relative h-24 w-20 overflow-hidden rounded-sm bg-rose-light/40">
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brown/80 text-xs text-cream opacity-0 transition-opacity group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-20 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-taupe/40 text-taupe hover:border-rose hover:text-rose disabled:opacity-60"
        >
          <span className="swatch-dot" aria-hidden />
          <span className="text-xs">{uploading ? "Uploading…" : "Add photo"}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-taupe">JPEG, PNG, or WebP, up to {MAX_FILE_MB}MB each.</p>
    </div>
  );
}
