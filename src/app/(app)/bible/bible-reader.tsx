"use client";

import { useState, useEffect } from "react";
import { BIBLE_BOOKS, AVAILABLE_TRANSLATIONS } from "@/lib/bible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const popularTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.popular);
const otherTranslations = AVAILABLE_TRANSLATIONS.filter((t) => !t.popular);

export function BibleReader() {
  const [book, setBook] = useState("Genesis");
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState("ESV");
  const [text, setText] = useState("");
  const [copyright, setCopyright] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showAllTranslations, setShowAllTranslations] = useState(false);

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
        const errorData = await res.json().catch(() => null);
        setText(
          errorData?.error ?? "Unable to load passage. Please check your API keys."
        );
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
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx < BIBLE_BOOKS.length - 1) {
        setBook(BIBLE_BOOKS[idx + 1].name);
        setChapter(1);
      }
    }
  }

  const currentTranslationName =
    AVAILABLE_TRANSLATIONS.find((t) => t.abbr === translation)?.name ?? translation;

  return (
    <div className="flex h-full flex-col">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <BookOpen className="h-5 w-5 text-bronze" />

        {/* Book/Chapter selector */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowBookPicker(!showBookPicker);
            setShowAllTranslations(false);
          }}
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

        {/* Popular Translation Buttons */}
        <div className="flex items-center gap-0.5 rounded-md border border-border">
          {popularTranslations.map((t) => (
            <button
              key={t.abbr}
              onClick={() => {
                setTranslation(t.abbr);
                setShowAllTranslations(false);
              }}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                translation === t.abbr
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
              title={t.name}
            >
              {t.abbr}
            </button>
          ))}
          {/* More translations button */}
          <button
            onClick={() => {
              setShowAllTranslations(!showAllTranslations);
              setShowBookPicker(false);
            }}
            className={`flex items-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors ${
              showAllTranslations || otherTranslations.some((t) => t.abbr === translation)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
            title="More translations"
          >
            {otherTranslations.some((t) => t.abbr === translation) ? translation : "More"}
            <ChevronDown className="h-3 w-3" />
          </button>
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

      {/* All Translations Dropdown */}
      {showAllTranslations && (
        <div className="border-b border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            All Translations
          </div>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
            {AVAILABLE_TRANSLATIONS.map((t) => (
              <button
                key={t.abbr}
                onClick={() => {
                  setTranslation(t.abbr);
                  setShowAllTranslations(false);
                }}
                className={`rounded px-3 py-2 text-left text-xs transition-colors ${
                  translation === t.abbr
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                <span className="font-semibold">{t.abbr}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
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
          <h2 className="mb-1 text-2xl font-bold">
            {book} {chapter}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {currentTranslationName}
          </p>

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
