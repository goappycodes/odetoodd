"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

/** Photo for a stock item. In the prototype the chosen file is only previewed in the browser. */
export default function ImageUpload({ src, alt, aspect = "3/4" }: { src?: string | null; alt: string; aspect?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const shown = preview ?? src ?? null;

  return (
    <div>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt={alt} className="w-full rounded-xl border border-line bg-sand object-cover" style={{ aspectRatio: aspect }} />
      ) : (
        <div className="grid w-full place-items-center rounded-xl border-2 border-dashed border-line bg-sand/40 text-center text-sm text-muted" style={{ aspectRatio: aspect }}>
          <span className="flex flex-col items-center gap-1.5 px-4">
            <ImagePlus className="size-6 text-faint" strokeWidth={1.5} />
            No photo yet
          </span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm hover:bg-sand">
          <ImagePlus className="size-4" />
          {shown ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
        </label>
        <span className="text-xs text-faint">Prototype: the photo isn&apos;t saved</span>
      </div>
    </div>
  );
}
