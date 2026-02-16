"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Minus, Sparkles, BookMarked } from "lucide-react";

type ReadingPlan = {
  id: string;
  name: string;
  description: string | null;
  totalDays: number;
  readings: { day: number; readings: string[] }[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
};

export function AdminReadingPlanManager({
  initialPlans,
}: {
  initialPlans: ReadingPlan[];
}) {
  const [plans, setPlans] = useState<ReadingPlan[]>(initialPlans);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate form state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [theme, setTheme] = useState("");
  const [days, setDays] = useState(7);
  const [focusBooks, setFocusBooks] = useState("");

  // Preview/edit state (after generation)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReadings, setEditReadings] = useState<
    { day: number; readings: string[] }[]
  >([]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const focusBooksArray = focusBooks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/ai/reading-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          days,
          focusBooks: focusBooksArray.length > 0 ? focusBooksArray : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate");
      }

      const { draft } = await res.json();

      // Populate preview fields
      setEditName(draft.name);
      setEditDescription(draft.description);
      setEditReadings(draft.readings);
      setGenerateOpen(false);
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/reading-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          readings: editReadings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      const { plan } = await res.json();
      setPlans((prev) => [plan, ...prev]);
      setPreviewOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateReading(dayIndex: number, readingIndex: number, value: string) {
    setEditReadings((prev) =>
      prev.map((d, di) =>
        di === dayIndex
          ? {
              ...d,
              readings: d.readings.map((r, ri) =>
                ri === readingIndex ? value : r
              ),
            }
          : d
      )
    );
  }

  function addReading(dayIndex: number) {
    setEditReadings((prev) =>
      prev.map((d, di) =>
        di === dayIndex ? { ...d, readings: [...d.readings, ""] } : d
      )
    );
  }

  function removeReading(dayIndex: number, readingIndex: number) {
    setEditReadings((prev) =>
      prev.map((d, di) =>
        di === dayIndex
          ? { ...d, readings: d.readings.filter((_, ri) => ri !== readingIndex) }
          : d
      )
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Reading Plans</h1>
        <Button
          onClick={() => {
            setGenerateOpen(true);
            setError(null);
            setTheme("");
            setDays(7);
            setFocusBooks("");
          }}
        >
          <Sparkles />
          Generate New Plan
        </Button>
      </div>

      {/* Top-level error */}
      {error && !generateOpen && !previewOpen && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {plans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <BookMarked className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No reading plans yet. Generate the first one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plans list */}
      <div className="space-y-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{plan.name}</p>
                {plan.description && (
                  <p className="mt-1 text-sm text-muted-foreground truncate">
                    {plan.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.totalDays} days
                </p>
              </div>
              <Badge
                variant={plan.isActive ? "default" : "secondary"}
                className={
                  plan.isActive
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }
              >
                {plan.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Reading Plan with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe a theme and AI will generate a complete day-by-day
              reading plan with scripture references.
            </p>

            {/* Theme */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Theme</label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Walking in Faith, Psalms of Comfort, Spiritual Warfare"
              />
            </div>

            {/* Days */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Number of Days
              </label>
              <div className="flex items-center gap-2">
                {[7, 14, 21, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={days === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(d)}
                  >
                    {d}
                  </Button>
                ))}
                <Input
                  type="number"
                  min={3}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>

            {/* Focus Books */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Focus Books (optional)
              </label>
              <Input
                value={focusBooks}
                onChange={(e) => setFocusBooks(e.target.value)}
                placeholder="e.g. Romans, Psalms, Genesis"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated list of Bible books to emphasize
              </p>
            </div>

            {/* Error in generate dialog */}
            {error && generateOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !theme.trim()}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles />
                  Generate Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview/Edit Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Reading Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Plan Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Plan Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Plan name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Description
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Plan description"
                rows={2}
              />
            </div>

            <Separator />

            {/* Day-by-day readings */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Daily Readings ({editReadings.length} days)
              </label>
              <div className="space-y-3">
                {editReadings.map((day, dayIndex) => (
                  <div key={day.day} className="rounded-md border p-3">
                    <p className="mb-2 text-sm font-medium">Day {day.day}</p>
                    <div className="space-y-1.5">
                      {day.readings.map((reading, readingIndex) => (
                        <div
                          key={readingIndex}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={reading}
                            onChange={(e) =>
                              updateReading(dayIndex, readingIndex, e.target.value)
                            }
                            placeholder="e.g. Genesis 1:1-31"
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeReading(dayIndex, readingIndex)}
                          >
                            <Minus className="size-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addReading(dayIndex)}
                        className="text-xs"
                      >
                        <Plus className="mr-1 size-3" />
                        Add reading
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error in preview dialog */}
            {error && previewOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
