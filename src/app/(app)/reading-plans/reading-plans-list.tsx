"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle, Circle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppUser } from "@/lib/types";

type ReadingPlan = {
  id: string;
  name: string;
  description: string | null;
  totalDays: number;
  readings: { day: number; readings: string[] }[] | null;
  completedDays: number;
};

export function ReadingPlansList({ currentUser }: { currentUser: AppUser }) {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<Record<string, number[]>>(
    {}
  );

  useEffect(() => {
    fetch("/api/reading-plans")
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleExpanded(planId: string) {
    if (expanded === planId) {
      setExpanded(null);
      return;
    }
    setExpanded(planId);

    // Fetch progress for this plan
    if (!completedDays[planId]) {
      const res = await fetch(`/api/reading-plans/${planId}/progress`);
      const data = await res.json();
      setCompletedDays((prev) => ({ ...prev, [planId]: data.completedDays ?? [] }));
    }
  }

  async function toggleDay(planId: string, dayNumber: number) {
    await fetch(`/api/reading-plans/${planId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNumber }),
    });

    // Update local state
    setCompletedDays((prev) => {
      const current = prev[planId] ?? [];
      const isCompleted = current.includes(dayNumber);
      return {
        ...prev,
        [planId]: isCompleted
          ? current.filter((d) => d !== dayNumber)
          : [...current, dayNumber],
      };
    });

    // Update plan's completed count
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const current = completedDays[planId] ?? [];
        const isCompleted = current.includes(dayNumber);
        return {
          ...p,
          completedDays: isCompleted
            ? p.completedDays - 1
            : p.completedDays + 1,
        };
      })
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reading Plans</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading plans...</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <BookOpen className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No reading plans yet. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const pct = plan.totalDays > 0
              ? Math.round((plan.completedDays / plan.totalDays) * 100)
              : 0;
            const isExpanded = expanded === plan.id;
            const daysList = completedDays[plan.id] ?? [];

            return (
              <Card key={plan.id}>
                <CardHeader
                  className="cursor-pointer pb-3"
                  onClick={() => toggleExpanded(plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.completedDays} of {plan.totalDays} days completed
                  </p>
                </CardHeader>

                {isExpanded && plan.readings && (
                  <CardContent>
                    <div className="space-y-2">
                      {plan.readings.map((r) => {
                        const isDone = daysList.includes(r.day);
                        return (
                          <button
                            key={r.day}
                            onClick={() => toggleDay(plan.id, r.day)}
                            className={`flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors ${
                              isDone
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-secondary"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">Day {r.day}</span>
                            <span className="text-muted-foreground">
                              {r.readings.join(", ")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
