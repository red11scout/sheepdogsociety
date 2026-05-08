"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";

interface ImageFieldProps {
  value: string;
  alt?: string;
  onChange: (url: string, alt?: string) => void;
  folder?: string;
  defaultPrompt?: string;
}

const STYLES: { id: string; label: string }[] = [
  { id: "documentary", label: "Documentary photo" },
  { id: "cinematic", label: "Cinematic golden hour" },
  { id: "engraving", label: "Engraving / woodcut" },
  { id: "oil", label: "Oil painting" },
  { id: "editorial", label: "Modern editorial" },
  { id: "topographic", label: "Topographic / map" },
];

export function ImageField({
  value,
  alt = "",
  onChange,
  folder = "uploads",
  defaultPrompt = "",
}: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"none" | "uploading" | "generating">("none");
  const [error, setError] = useState("");

  // AI gen state
  const [showAi, setShowAi] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [style, setStyle] = useState("editorial");
  const [aspect, setAspect] = useState<"square" | "landscape" | "portrait">(
    "landscape"
  );

  async function handleUpload(file: File) {
    setBusy("uploading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const data = await res.json();
      onChange(data.url, alt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("none");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setBusy("generating");
    setError("");
    try {
      const res = await fetch("/api/admin/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          aspectRatio: aspect,
          quality: "draft",
          folder,
          save: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Image generation failed");
      }
      const data = await res.json();
      onChange(data.url, alt);
      setShowAi(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy("none");
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative overflow-hidden border border-stone/15 bg-iron/40">
          <Image
            src={value}
            alt={alt}
            width={1200}
            height={800}
            className="block h-auto w-full object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 border border-bone/40 bg-iron/80 px-2.5 text-[0.625rem] font-medium uppercase tracking-wider text-bone backdrop-blur transition-colors hover:bg-iron"
          >
            <Icon name="trash" size={12} />
            Remove
          </button>
        </div>
      ) : (
        <div className="grid gap-3 border border-dashed border-stone/20 bg-iron/30 p-6 text-center">
          <Icon name="image" size={32} className="mx-auto text-stone/40" />
          <p className="text-sm text-stone/65">
            Upload an image, paste a URL, or generate one with AI.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== "none"}
              className="lift inline-flex h-9 items-center gap-2 border border-bone bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone disabled:opacity-60"
            >
              <Icon name="download" size={12} className="rotate-180" />
              {busy === "uploading" ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setShowAi((v) => !v)}
              disabled={busy !== "none"}
              className="lift inline-flex h-9 items-center gap-2 border border-brass/50 bg-brass/10 px-4 text-xs font-medium uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-60"
            >
              <Icon name="sparkles" size={12} />
              Generate with AI
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          <input
            type="url"
            placeholder="or paste an image URL"
            value=""
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value, alt);
            }}
            className="mt-3 h-9 w-full border border-stone/20 bg-transparent px-3 text-xs text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
          />
        </div>
      )}

      {showAi && !value && (
        <div className="space-y-3 border border-brass/30 bg-iron/40 p-5">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" size={14} className="text-brass" />
            <span className="section-mark text-brass">AI image generator</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image. e.g. A sheepdog watching over a flock at sunrise, mountain ridge in the distance."
            rows={3}
            className="block w-full border border-stone/20 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`border px-3 py-1.5 text-[0.625rem] uppercase tracking-wider transition-colors ${
                  style === s.id
                    ? "border-brass bg-brass/20 text-bone"
                    : "border-stone/20 bg-iron/40 text-stone/70 hover:border-brass/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["landscape", "square", "portrait"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAspect(a)}
                  className={`border px-3 py-1.5 text-[0.625rem] uppercase tracking-wider transition-colors ${
                    aspect === a
                      ? "border-brass bg-brass/20 text-bone"
                      : "border-stone/20 bg-iron/40 text-stone/70 hover:border-brass/50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || busy === "generating"}
              className="lift inline-flex h-9 items-center gap-2 bg-brass px-4 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
            >
              {busy === "generating" ? "Generating..." : "Generate"}
              {busy !== "generating" && <Icon name="sparkles" size={12} />}
            </button>
          </div>
          <p className="text-[0.625rem] leading-relaxed text-stone/50">
            Saved to Vercel Blob. Each generation also adds the brand
            safety suffix (no fabricated text in image, dignified, etc.).
          </p>
        </div>
      )}

      {error && (
        <p className="border border-oxblood/40 bg-oxblood/15 px-3 py-2 text-xs text-bone">
          {error}
        </p>
      )}
    </div>
  );
}
