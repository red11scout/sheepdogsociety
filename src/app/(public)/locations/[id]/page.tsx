"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Clock,
  Users,
  Mail,
  MessageCircle,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

type LocationDetail = {
  id: string;
  name: string;
  description: string | null;
  latitude: string;
  longitude: string;
  address: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  groupSize: number | null;
  maxSize: number;
  contactName: string | null;
  contactEmail: string | null;
  signalGroupUrl: string | null;
  imageUrl: string | null;
};

export default function LocationDetailPage() {
  const params = useParams();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestForm, setInterestForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/public/locations/${params.id}`)
      .then((r) => r.json())
      .then((data) => setLocation(data.location ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleInterest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: params.id,
          ...interestForm,
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // fail silently
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-bold">Location Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          This location may no longer be active.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/locations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <title>{`${location.name} — SheepDog Society`}</title>

      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/locations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Locations
          </Link>
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{location.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {location.city}, {location.state}
          </p>
        </div>

        {location.description && (
          <p className="text-muted-foreground">{location.description}</p>
        )}

        {/* Details Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-bronze" />
                <div>
                  <p className="font-medium">Meeting Time</p>
                  <p className="text-sm text-muted-foreground">
                    {location.meetingDay || "TBD"}
                    {location.meetingTime
                      ? ` at ${location.meetingTime}`
                      : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-bronze" />
                <div>
                  <p className="font-medium">Meeting Place</p>
                  <p className="text-sm text-muted-foreground">
                    {location.meetingPlace || location.address || "TBD"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-bronze" />
                <div>
                  <p className="font-medium">Group Size</p>
                  <p className="text-sm text-muted-foreground">
                    {location.groupSize ?? 0} of {location.maxSize} members
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {location.contactName && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-bronze" />
                  <div>
                    <p className="font-medium">Contact</p>
                    <p className="text-sm text-muted-foreground">
                      {location.contactName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Signal Group */}
        {location.signalGroupUrl && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MessageCircle className="h-5 w-5 text-bronze" />
              <div className="flex-1">
                <p className="font-medium">Join our Signal group</p>
                <p className="text-sm text-muted-foreground">
                  We use Signal for group communication
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a
                  href={location.signalGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Signal
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Interest Form */}
        <Card>
          <CardHeader>
            <CardTitle>Interested in joining this group?</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex items-center gap-3 text-bronze">
                <CheckCircle className="h-5 w-5" />
                <p>
                  Thanks for your interest! The group leader will be in touch.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInterest} className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={interestForm.name}
                  onChange={(e) =>
                    setInterestForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
                <Input
                  type="email"
                  placeholder="Your email"
                  value={interestForm.email}
                  onChange={(e) =>
                    setInterestForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Phone (optional)"
                  value={interestForm.phone}
                  onChange={(e) =>
                    setInterestForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
                <Textarea
                  placeholder="Any questions or comments? (optional)"
                  value={interestForm.message}
                  onChange={(e) =>
                    setInterestForm((f) => ({ ...f, message: e.target.value }))
                  }
                  rows={3}
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending..." : "I'm Interested"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
