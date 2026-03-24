import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Users } from "lucide-react";
import type { LocationPin } from "./location-map";

export function LocationCard({ location }: { location: LocationPin }) {
  return (
    <Link href={`/locations/${location.id}`}>
      <Card className="transition-colors hover:bg-accent/5">
        <CardContent className="p-4">
          <h3 className="font-bold">{location.name}</h3>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-bronze" />
              {location.city}, {location.state}
            </p>
            {location.meetingDay && (
              <p className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-bronze" />
                {location.meetingDay}
                {location.meetingTime ? ` at ${location.meetingTime}` : ""}
              </p>
            )}
            {location.groupSize != null && (
              <p className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-bronze" />
                {location.groupSize} of {location.maxSize} members
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
