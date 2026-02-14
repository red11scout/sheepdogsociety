"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Shield,
  Plus,
  UserPlus,
  Flame,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { AppUser } from "@/lib/types";

type Partner = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

type Checkin = {
  id: string;
  userId: string;
  mood: string;
  highlights: string;
  struggles: string;
  prayerNeeds: string;
  createdAt: string;
};

type Pair = {
  id: string;
  user1Id: string;
  user2Id: string;
  status: string;
  startedAt: string;
  partner: Partner;
  recentCheckins: Checkin[];
  totalCheckins: number;
};

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export function AccountabilityView({
  currentUser,
  members,
}: {
  currentUser: AppUser;
  members: MemberOption[];
}) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [mood, setMood] = useState("");
  const [highlights, setHighlights] = useState("");
  const [struggles, setStruggles] = useState("");
  const [prayerNeeds, setPrayerNeeds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function fetchPairs() {
    fetch("/api/accountability")
      .then((r) => r.json())
      .then((data) => setPairs(data.pairs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPairs();
  }, []);

  async function handleCreatePair() {
    if (!selectedPartnerId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/accountability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: selectedPartnerId }),
      });
      if (res.ok) {
        setPairDialogOpen(false);
        setSelectedPartnerId("");
        fetchPairs();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckin() {
    if (!selectedPairId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accountability/${selectedPairId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, highlights, struggles, prayerNeeds }),
      });
      if (res.ok) {
        setCheckinDialogOpen(false);
        setMood("");
        setHighlights("");
        setStruggles("");
        setPrayerNeeds("");
        fetchPairs();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const moods = ["Great", "Good", "Okay", "Struggling", "Need Help"];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accountability</h1>
        <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-1 h-4 w-4" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose an Accountability Partner</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {members.map((m) => {
                const initials =
                  (m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "");
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPartnerId(m.id)}
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors ${
                      selectedPartnerId === m.id
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {m.firstName} {m.lastName}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={handleCreatePair}
              disabled={!selectedPartnerId || submitting}
              className="w-full"
            >
              {submitting ? "Creating..." : "Create Partnership"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Check-in dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weekly Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 text-sm font-medium">How are you doing?</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {moods.map((m) => (
                  <Button
                    key={m}
                    variant={mood === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMood(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 text-sm font-medium">Highlights this week</label>
              <Textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="What went well..."
                rows={2}
              />
            </div>
            <div>
              <label className="mb-1 text-sm font-medium">Struggles</label>
              <Textarea
                value={struggles}
                onChange={(e) => setStruggles(e.target.value)}
                placeholder="Where you need support..."
                rows={2}
              />
            </div>
            <div>
              <label className="mb-1 text-sm font-medium">Prayer needs</label>
              <Textarea
                value={prayerNeeds}
                onChange={(e) => setPrayerNeeds(e.target.value)}
                placeholder="How can your partner pray for you..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleCheckin}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Check-In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : pairs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Shield className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No accountability partners yet. Iron sharpens iron.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => {
            const initials =
              (pair.partner.firstName?.[0] ?? "") +
              (pair.partner.lastName?.[0] ?? "");

            return (
              <Card key={pair.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={pair.partner.avatarUrl ?? undefined}
                        />
                        <AvatarFallback>{initials || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {pair.partner.firstName} {pair.partner.lastName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Partners since{" "}
                          {format(new Date(pair.startedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {pair.totalCheckins} check-ins
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPairId(pair.id);
                          setCheckinDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Check In
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {pair.recentCheckins.length > 0 && (
                  <CardContent>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent Check-Ins
                    </p>
                    <div className="space-y-2">
                      {pair.recentCheckins.slice(0, 3).map((ci) => (
                        <div
                          key={ci.id}
                          className="rounded-md bg-secondary/50 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {ci.userId === currentUser.id
                                ? "You"
                                : pair.partner.firstName}
                            </span>
                            <span>
                              {format(new Date(ci.createdAt), "MMM d")}
                            </span>
                          </div>
                          {ci.mood && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {ci.mood}
                            </Badge>
                          )}
                          {ci.highlights && (
                            <p className="mt-1 text-muted-foreground">
                              {ci.highlights}
                            </p>
                          )}
                        </div>
                      ))}
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
