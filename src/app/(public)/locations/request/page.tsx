"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle, MapPin } from "lucide-react";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

export default function RequestLocationPage() {
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    proposedCity: "",
    proposedState: "",
    proposedMeetingDetails: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // fail silently
    }
    setSubmitting(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <>
      <title>Start a Group — SheepDog Society</title>
      <meta
        name="description"
        content="Request to start a new Sheepdog Society group in your area."
      />

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/locations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Link>
        </Button>

        <div className="text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold">Start a Group</h1>
          <p className="mt-2 text-muted-foreground">
            Ready to lead? Fill out this form and we&apos;ll set up a video call
            to get you started. Groups are 2-12 men, meeting weekly for
            Scripture study.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request a New Location</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-3 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-bronze" />
                <h3 className="text-lg font-bold">Request Submitted!</h3>
                <p className="text-muted-foreground">
                  We&apos;ll reach out to schedule a video call and help you get
                  your group started. Welcome to the brotherhood.
                </p>
                <Button asChild variant="outline">
                  <Link href="/locations">View Locations</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Your Name *
                    </label>
                    <Input
                      value={form.requesterName}
                      onChange={(e) => update("requesterName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={form.requesterEmail}
                      onChange={(e) => update("requesterEmail", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Phone (optional)
                  </label>
                  <Input
                    value={form.requesterPhone}
                    onChange={(e) => update("requesterPhone", e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      City *
                    </label>
                    <Input
                      value={form.proposedCity}
                      onChange={(e) => update("proposedCity", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      State *
                    </label>
                    <Select
                      value={form.proposedState}
                      onValueChange={(v) => update("proposedState", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Proposed Meeting Details
                  </label>
                  <Textarea
                    placeholder="Day, time, and location you're considering..."
                    value={form.proposedMeetingDetails}
                    onChange={(e) =>
                      update("proposedMeetingDetails", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Why do you want to start a group?
                  </label>
                  <Textarea
                    placeholder="Tell us about yourself and your vision..."
                    value={form.reason}
                    onChange={(e) => update("reason", e.target.value)}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
