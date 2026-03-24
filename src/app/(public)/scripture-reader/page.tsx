"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BIBLE_BOOKS, AVAILABLE_TRANSLATIONS } from "@/lib/bible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";

const popularTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.popular);
const otherTranslations = AVAILABLE_TRANSLATIONS.filter((t) => !t.popular);

const OT_BOOKS = BIBLE_BOOKS.slice(0, 39);
const NT_BOOKS = BIBLE_BOOKS.slice(39);

export default function PublicBiblePage() {
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState("KJV");
  const [text, setText] = useState("");
  const [copyright, setCopyright] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [showChapterGrid, setShowChapterGrid] = useState(false);

  const currentBookData = BIBLE_BOOKS.find((b) => b.name === book);
  const maxChapters = currentBookData?.chapters ?? 1;

  const currentTranslationName =
    AVAILABLE_TRANSLATIONS.find((t) => t.abbr === translation)?.name ??
    translation;

  // Fetch passage
  useEffect(() => {
    let cancelled = false;

    async function fetchPassage() {
      setLoading(true);
      setError("");
      try {
        const ref = `${book} ${chapter}`;
        const res = await fetch(
          `/api/public/bible?ref=${encodeURIComponent(ref)}&translation=${translation}`
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setText(data.text ?? "");
          setCopyright(data.copyright ?? "");
        } else {
          const errorData = await res.json().catch(() => null);
          setError(
            errorData?.error ??
              "Unable to load this passage. Please try a different translation."
          );
          setText("");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load passage. Please check your connection and try again.");
          setText("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPassage();
    return () => {
      cancelled = true;
    };
  }, [book, chapter, translation]);

  // Navigation
  const prevChapter = useCallback(() => {
    if (chapter > 1) {
      setChapter((c) => c - 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx > 0) {
        const prevBook = BIBLE_BOOKS[idx - 1];
        setBook(prevBook.name);
        setChapter(prevBook.chapters);
      }
    }
  }, [book, chapter]);

  const nextChapter = useCallback(() => {
    if (chapter < maxChapters) {
      setChapter((c) => c + 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx < BIBLE_BOOKS.length - 1) {
        setBook(BIBLE_BOOKS[idx + 1].name);
        setChapter(1);
      }
    }
  }, [book, chapter, maxChapters]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showBookPicker || showTranslations || showChapterGrid) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevChapter();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextChapter();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevChapter, nextChapter, showBookPicker, showTranslations, showChapterGrid]);

  function selectBook(bookName: string) {
    setBook(bookName);
    setChapter(1);
    setShowBookPicker(false);
    setShowChapterGrid(false);
  }

  function selectChapter(ch: number) {
    setChapter(ch);
    setShowChapterGrid(false);
    setShowBookPicker(false);
  }

  function closeAllOverlays() {
    setShowBookPicker(false);
    setShowTranslations(false);
    setShowChapterGrid(false);
  }

  return (
    <>
      <title>Bible — SheepDog Society</title>
      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Top Navigation Bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          {/* Verse of the Day link */}
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-bronze" />
            <Link
              href="/daily-scripture"
              className="text-xs font-medium text-bronze hover:underline"
            >
              Today&apos;s Scripture &amp; Devotional
            </Link>
          </div>

          {/* Main nav row */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <BookOpen className="hidden h-5 w-5 shrink-0 text-bronze sm:block" />

            {/* Book/Chapter selector button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBookPicker(!showBookPicker);
                setShowTranslations(false);
                setShowChapterGrid(false);
              }}
              className="max-w-[200px] truncate font-medium"
            >
              {book} {chapter}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>

            {/* Chapter nav arrows */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevChapter}
                title="Previous chapter (Left arrow)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Chapter number grid toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 px-2 text-xs text-muted-foreground sm:flex"
                onClick={() => {
                  setShowChapterGrid(!showChapterGrid);
                  setShowBookPicker(false);
                  setShowTranslations(false);
                }}
              >
                Ch. {chapter}/{maxChapters}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextChapter}
                title="Next chapter (Right arrow)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Translation pills - scrollable on mobile */}
            <div className="ml-auto flex items-center gap-1 overflow-x-auto">
              <div className="flex items-center rounded-md border border-border">
                {popularTranslations.map((t) => (
                  <button
                    key={t.abbr}
                    onClick={() => {
                      setTranslation(t.abbr);
                      setShowTranslations(false);
                    }}
                    className={`whitespace-nowrap px-2 py-1 text-xs font-medium transition-colors sm:px-2.5 ${
                      translation === t.abbr
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                    title={t.name}
                  >
                    {t.abbr}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowTranslations(!showTranslations);
                    setShowBookPicker(false);
                    setShowChapterGrid(false);
                  }}
                  className={`flex items-center gap-0.5 whitespace-nowrap px-2 py-1 text-xs font-medium transition-colors ${
                    showTranslations ||
                    otherTranslations.some((t) => t.abbr === translation)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  title="More translations"
                >
                  {otherTranslations.some((t) => t.abbr === translation)
                    ? translation
                    : "More"}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Translation Picker Overlay */}
        {showTranslations && (
          <div className="border-b border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All Translations
              </span>
              <button
                onClick={() => setShowTranslations(false)}
                className="rounded p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
              {AVAILABLE_TRANSLATIONS.map((t) => (
                <button
                  key={t.abbr}
                  onClick={() => {
                    setTranslation(t.abbr);
                    setShowTranslations(false);
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

        {/* Chapter Grid Overlay */}
        {showChapterGrid && (
          <div className="border-b border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {book} &mdash; Select Chapter
              </span>
              <button
                onClick={() => setShowChapterGrid(false)}
                className="rounded p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-20">
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(
                (ch) => (
                  <button
                    key={ch}
                    onClick={() => selectChapter(ch)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors sm:h-9 sm:w-9 ${
                      chapter === ch
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {ch}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Book Picker Overlay */}
        {showBookPicker && (
          <div className="max-h-[60vh] overflow-y-auto border-b border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select Book
              </span>
              <button
                onClick={() => setShowBookPicker(false)}
                className="rounded p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Old Testament */}
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Old Testament
            </p>
            <div className="mb-4 grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
              {OT_BOOKS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => selectBook(b.name)}
                  className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    book === b.name
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {/* New Testament */}
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              New Testament
            </p>
            <div className="mb-4 grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
              {NT_BOOKS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => selectBook(b.name)}
                  className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    book === b.name
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Chapter grid within book picker */}
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Chapter
            </p>
            <div className="grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-20">
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(
                (ch) => (
                  <button
                    key={ch}
                    onClick={() => selectChapter(ch)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors sm:h-9 sm:w-9 ${
                      chapter === ch
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {ch}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Scripture Content Area */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-16"
          onClick={() => {
            if (showBookPicker || showTranslations || showChapterGrid) {
              closeAllOverlays();
            }
          }}
        >
          <div className="mx-auto max-w-2xl">
            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {book} {chapter}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentTranslationName}
              </p>
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-4 w-full"
                    style={{ width: `${75 + Math.random() * 25}%` }}
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try switching to a different translation or check back later.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setError("");
                    setLoading(true);
                    const ref = `${book} ${chapter}`;
                    fetch(
                      `/api/public/bible?ref=${encodeURIComponent(ref)}&translation=${translation}`
                    )
                      .then((res) =>
                        res.ok
                          ? res.json()
                          : Promise.reject(new Error("Failed"))
                      )
                      .then((data) => {
                        setText(data.text ?? "");
                        setCopyright(data.copyright ?? "");
                        setError("");
                      })
                      .catch(() =>
                        setError("Still unable to load. Please try again later.")
                      )
                      .finally(() => setLoading(false));
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="font-scripture text-lg leading-[1.8] whitespace-pre-line">
                {text}
              </div>
            )}

            {/* Copyright */}
            {copyright && !loading && !error && (
              <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                {copyright}
              </p>
            )}

            {/* Keyboard hint */}
            <p className="mt-6 hidden text-xs text-muted-foreground/50 sm:block">
              Use left/right arrow keys to navigate chapters
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
