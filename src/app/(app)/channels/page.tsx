import { redirect } from "next/navigation";

export default function ChannelsPage() {
  // Redirect to home — channel selection is via sidebar
  redirect("/");
}
