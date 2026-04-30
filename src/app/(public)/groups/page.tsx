import { redirect } from "next/navigation";

// /groups is the brief's canonical name for the group finder. The functioning
// surface is /locations (Mapbox locator + filters + Plant-a-group CTA).
// Until block-based pages move /locations to /groups in Phase D, redirect here.
export default function GroupsPage() {
  redirect("/locations");
}
