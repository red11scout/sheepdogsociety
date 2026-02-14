"use client";

import { useState, useEffect } from "react";
import { BIBLE_BOOKS } from "@/lib/bible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type Translation = "ESV" | "NIV" | "NKJV";

export function BibleReader() {
  const [book, setBook] = useState("Genesis");
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState<Translation>("ESV");
  const [text, setText] = useState("");
  const [copyright, setCopyright] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookPicker, setShowBookPicker] = useState(false);

  const currentBookData = BIBLE_BOOKS.find((b) => b.name === book);
  const maxChapters = currentBookData?.chapters ?? 1;

  useEffect(() => {
    fetchPassage();
  }, [book, chapter, translation]);

  async function fetchPassage() {
    setLoading(true);
    try {
      const ref = `${book} ${chapter}`;
      const res = await fetch(
        `/api/bible/passage?ref=${encodeURIComponent(ref)}&translation=${translation}`
      );
      if (res.ok) {
        const data = await res.json();
        setText(data.text ?? "");
        setCopyright(data.copyright ?? "");
      } else {
        setText("Unable to load passage. Please check your API keys.");
      }
    } catch {
      setText("Unable to load passage. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function prevChapter() {
    if (chapter > 1) {
      setChapter(chapter - 1);
    } else {
      // Go to previous book
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx > 0) {
        const prevBook = BIBLE_BOOKS[idx - 1];
        setBook(prevBook.name);
        setChapter(prevBook.chapters);
      }
    }
  }

  function nextChapter() {
    if (chapter < maxChapters) {
      setChapter(chapter + 1);
    } else {
      // Go to next book
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx < BIBLE_BOOKS.length - 1) {
        setBook(BIBLE_BOOKS[idx + 1].name);
        setChapter(1);
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <BookOpen className="h-5 w-5 text-bronze" />

        {/* Book/Chapter selector */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBookPicker(!showBookPicker)}
          className="font-medium"
        >
          {book} {chapter}
        </Button>

        {/* Chapter nav */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevChapter}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextChapter}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Translation Toggle */}
        <div className="flex rounded-md border border-border">
          {(["ESV", "NIV", "NKJV"] as Translation[]).map((t) => (
            <button
              key={t}
              onClick={() => setTranslation(t)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                translation === t
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Book Picker Overlay */}
      {showBookPicker && (
        <div className="border-b border-border bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
            Old Testament
          </div>
          <div className="mb-4 flex flex-wrap gap-1">
            {BIBLE_BOOKS.slice(0, 39).map((b) => (
              <button
                key={b.name}
                onClick={() => {
                  setBook(b.name);
                  setChapter(1);
                  setShowBookPicker(false);
                }}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  book === b.name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
          <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
            New Testament
          </div>
          <div className="mb-4 flex flex-wrap gap-1">
            {BIBLE_BOOKS.slice(39).map((b) => (
              <button
                key={b.name}
                onClick={() => {
                  setBook(b.name);
                  setChapter(1);
                  setShowBookPicker(false);
                }}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  book === b.name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
          {/* Chapter grid */}
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Chapter
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: maxChapters }, (_, i) => i + 1).map((ch) => (
              <button
                key={ch}
                onClick={() => {
                  setChapter(ch);
                  setShowBookPicker(false);
                }}
                className={`h-8 w-8 rounded text-xs transition-colors ${
                  chapter === ch
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scripture Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-2xl font-bold">
            {book} {chapter}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="font-scripture text-lg leading-[1.8] whitespace-pre-line">
              {text}
            </div>
          )}

          {copyright && (
            <p className="mt-6 text-xs text-muted-foreground">{copyright}</p>
          )}
        </div>
      </div>
    </div>
  );
}
