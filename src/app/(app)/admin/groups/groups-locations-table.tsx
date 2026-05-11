"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { cn } from "@/lib/utils";
import {
  bulkUpdateGroupsLocations,
  deleteGroupLocation,
  upsertGroupLocation,
  type AdminGroupLocationRow,
  type UpsertGroupLocationInput,
} from "@/server/admin-groups-locations";
import { format } from "date-fns";

interface Props {
  initialRows: AdminGroupLocationRow[];
  dbError: string;
}

type SortKey =
  | "groupName"
  | "locationName"
  | "city"
  | "state"
  | "approvalStatus"
  | "isActive"
  | "displayedOnMap"
  | "memberCount"
  | "createdAt";

const APPROVAL_TONE: Record<string, string> = {
  approved: "border-olive/40 bg-olive/10 text-olive",
  pending: "border-brass/40 bg-brass/10 text-brass",
  rejected: "border-oxblood/40 bg-oxblood/10 text-oxblood",
};
const APPROVAL_OPTIONS = ["pending", "approved", "rejected"] as const;
const LOCATION_TYPE_OPTIONS = ["in_person", "online", "hybrid", "other"];
const MEETING_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function GroupsLocationsTable({ initialRows, dbError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterMap, setFilterMap] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null); // groupId or "_new"
  const [busy, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filterApproval && r.approvalStatus !== filterApproval) return false;
        if (filterActive === "active" && !r.isActive) return false;
        if (filterActive === "inactive" && r.isActive) return false;
        if (filterMap === "on" && !r.displayedOnMap) return false;
        if (filterMap === "off" && r.displayedOnMap) return false;
        if (!q) return true;
        const hay = [
          r.groupName,
          r.locationName,
          r.address,
          r.city,
          r.state,
          r.zipCode,
          r.locationType,
          r.specialInstructions,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const av = (a[sortKey] ?? "") as string | number | boolean;
        const bv = (b[sortKey] ?? "") as string | number | boolean;
        if (av === bv) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        return av > bv ? dir : -dir;
      });
  }, [rows, query, filterApproval, filterActive, filterMap, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.groupId)));
  }
  function clearFilters() {
    setQuery("");
    setFilterApproval("");
    setFilterActive("");
    setFilterMap("");
  }

  async function patchRow(id: string, patch: Partial<AdminGroupLocationRow>) {
    setRows((prev) => prev.map((r) => (r.groupId === id ? { ...r, ...patch } : r)));
  }

  async function handleApproval(groupId: string, approvalStatus: "pending" | "approved" | "rejected") {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await upsertGroupLocation({
          groupId,
          groupName: rows.find((r) => r.groupId === groupId)?.groupName ?? "",
          approvalStatus,
        });
        // Server-side auto-flips displayed_on_map=true when approving so a
        // pin appears on the public locator immediately. Mirror in the
        // optimistic UI so the row's On Map cell flips in the same render.
        const optimisticPatch: Partial<AdminGroupLocationRow> = { approvalStatus };
        if (approvalStatus === "approved") {
          optimisticPatch.displayedOnMap = true;
        }
        await patchRow(groupId, optimisticPatch);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }
  async function handleActive(groupId: string, isActive: boolean) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await upsertGroupLocation({
          groupId,
          groupName: rows.find((r) => r.groupId === groupId)?.groupName ?? "",
          isActive,
        });
        await patchRow(groupId, { isActive });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }
  async function handleMap(groupId: string, displayedOnMap: boolean) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await upsertGroupLocation({
          groupId,
          groupName: rows.find((r) => r.groupId === groupId)?.groupName ?? "",
          displayedOnMap,
        });
        await patchRow(groupId, { displayedOnMap });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }
  async function handleDelete(groupId: string) {
    if (
      !confirm(
        "Delete this group AND its location? Members assigned to it will become unassigned. This is permanent."
      )
    )
      return;
    setErrorMsg("");
    startTransition(async () => {
      try {
        await deleteGroupLocation(groupId);
        setRows((prev) => prev.filter((r) => r.groupId !== groupId));
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(groupId);
          return n;
        });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  async function bulk(patch: { isActive?: boolean; approvalStatus?: "approved" | "rejected"; displayedOnMap?: boolean }) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkUpdateGroupsLocations(ids, patch);
        // Mirror the server's auto-flip: approving in bulk also sets
        // displayedOnMap=true unless the caller passed it explicitly.
        const optimistic = { ...patch };
        if (patch.approvalStatus === "approved" && patch.displayedOnMap === undefined) {
          optimistic.displayedOnMap = true;
        }
        setRows((prev) =>
          prev.map((r) =>
            selected.has(r.groupId) ? { ...r, ...optimistic } : r
          )
        );
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  }

  async function saveRow(input: UpsertGroupLocationInput) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        const result = await upsertGroupLocation(input);
        // Easiest: just reload the page so we get fresh joined data.
        window.location.reload();
        void result;
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="border border-oxblood/40 bg-oxblood/15 p-6 text-sm text-bone">
          <p className="display-xl text-base">Groups table can&rsquo;t load.</p>
          <p className="mt-2 text-stone/85">{dbError}</p>
          <p className="mt-3 text-xs text-stone/60">
            Likely cause: migration 0009 hasn&rsquo;t been applied. Apply it via the GHA migration runner or paste into the Neon SQL editor.
          </p>
        </div>
      </div>
    );
  }

  const allSelectedOnPage =
    selected.size > 0 && filtered.every((r) => selected.has(r.groupId));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-12 md:py-14">
      <AdminPageIntro
        kicker="Groups & Locations"
        title="Where men meet."
        description="One row per group. Approving a group automatically puts it on the public map. Toggle active state and on-map visibility inline; edit address, lat/lng, and meeting day by clicking Edit. Bulk actions for the busy weeks."
        hint="Each group meets at one location. Members assigned to a group inherit its location for routing email/SMS. Approving auto-flips 'On Map' to On so the pin shows up on /locations right away. You can still toggle On Map off later to soft-hide an approved group without un-approving it."
        primary={{ label: "New group", href: "#", icon: "plus" }}
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border border-stone/15 bg-iron/30 p-3">
        <label className="relative flex flex-1 min-w-[220px] items-center">
          <Icon name="search" size={14} className="absolute left-3 text-stone/55" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search group, location, address, type..."
            className="block h-9 w-full border border-stone/20 bg-transparent pl-9 pr-3 text-sm text-bone placeholder:text-stone/45 focus:border-brass focus:outline-none"
          />
        </label>
        <select
          value={filterApproval}
          onChange={(e) => setFilterApproval(e.target.value)}
          className="h-9 border border-stone/20 bg-iron/40 px-3 text-xs text-bone focus:border-brass focus:outline-none"
        >
          <option value="">Approval: any</option>
          {APPROVAL_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="h-9 border border-stone/20 bg-iron/40 px-3 text-xs text-bone focus:border-brass focus:outline-none"
        >
          <option value="">Active: any</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={filterMap}
          onChange={(e) => setFilterMap(e.target.value)}
          className="h-9 border border-stone/20 bg-iron/40 px-3 text-xs text-bone focus:border-brass focus:outline-none"
        >
          <option value="">On map: any</option>
          <option value="on">On map</option>
          <option value="off">Hidden</option>
        </select>
        {(query || filterApproval || filterActive || filterMap) && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-stone/65 underline-offset-4 hover:text-brass hover:underline"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-stone/55">
          {filtered.length} of {rows.length}
        </span>
        <button
          type="button"
          onClick={() => setEditing("_new")}
          className="lift inline-flex h-9 items-center gap-1.5 border border-bone bg-bone px-3 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone"
        >
          <Icon name="plus" size={12} />
          New group
        </button>
      </div>

      {/* New row form */}
      {editing === "_new" && (
        <div className="mb-4">
          <EditForm
            initial={null}
            onCancel={() => setEditing(null)}
            onSave={(input) => saveRow(input)}
          />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 border border-brass/40 bg-brass/10 px-4 py-2 text-xs text-bone">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-stone/55">·</span>
          <button
            type="button"
            onClick={() => bulk({ approvalStatus: "approved" })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-olive/40 bg-olive/10 px-2 text-olive transition-colors hover:bg-olive/20"
          >
            <Icon name="check" size={11} /> Approve
          </button>
          <button
            type="button"
            onClick={() => bulk({ approvalStatus: "rejected" })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-oxblood/40 bg-oxblood/10 px-2 text-oxblood transition-colors hover:bg-oxblood/20"
          >
            <Icon name="close" size={11} /> Reject
          </button>
          <button
            type="button"
            onClick={() => bulk({ isActive: true })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={() => bulk({ isActive: false })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Deactivate
          </button>
          <button
            type="button"
            onClick={() => bulk({ displayedOnMap: true })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Show on map
          </button>
          <button
            type="button"
            onClick={() => bulk({ displayedOnMap: false })}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Hide from map
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-stone/55 hover:text-bone"
          >
            Clear selection
          </button>
        </div>
      )}

      {errorMsg && (
        <p className="mb-2 border border-oxblood/40 bg-oxblood/15 px-3 py-2 text-xs text-bone">
          {errorMsg}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-stone/15">
        <table className="w-full text-xs">
          <thead className="border-b border-stone/15 bg-iron/40 text-stone/65">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 accent-brass"
                />
              </th>
              <th className="px-3 py-2 text-left">ID</th>
              <SortableTh label="Approval" k="approvalStatus" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("approvalStatus")} />
              <SortableTh label="Active" k="isActive" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("isActive")} />
              <SortableTh label="Group" k="groupName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("groupName")} />
              <SortableTh label="Location" k="locationName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("locationName")} />
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Lat / Lng</th>
              <SortableTh label="On Map" k="displayedOnMap" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("displayedOnMap")} />
              <th className="px-3 py-2 text-left">Day</th>
              <th className="px-3 py-2 text-left">Time</th>
              <SortableTh label="#" k="memberCount" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("memberCount")} />
              <th className="w-16 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-6 py-12 text-center text-stone/60">
                  No groups match. Adjust filters or add a new group.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <GroupRow
                  key={r.groupId}
                  row={r}
                  selected={selected.has(r.groupId)}
                  editing={editing === r.groupId}
                  onToggleSelect={() => toggleSelect(r.groupId)}
                  onApprove={(s) => handleApproval(r.groupId, s)}
                  onActive={(a) => handleActive(r.groupId, a)}
                  onMap={(m) => handleMap(r.groupId, m)}
                  onEdit={() => setEditing(editing === r.groupId ? null : r.groupId)}
                  onDelete={() => handleDelete(r.groupId)}
                  onSave={(input) => saveRow(input)}
                  onCancel={() => setEditing(null)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[0.6875rem] text-stone/50">
        <Icon name="info" size={12} className="text-stone/40" />
        Approving a group auto-puts it on the map. Inline-edit Approval, Active, and On Map directly. Click the pencil to edit address, lat/lng, meeting day/time. Delete is permanent for the group + its location row; assigned members become unassigned.
      </p>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: () => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex items-center gap-1 hover:text-bone", active && "text-bone")}
      >
        {label}
        {active && <span className="text-[0.5625rem]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function GroupRow({
  row,
  selected,
  editing,
  onToggleSelect,
  onApprove,
  onActive,
  onMap,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: {
  row: AdminGroupLocationRow;
  selected: boolean;
  editing: boolean;
  onToggleSelect: () => void;
  onApprove: (s: "pending" | "approved" | "rejected") => void;
  onActive: (a: boolean) => void;
  onMap: (m: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (input: UpsertGroupLocationInput) => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <tr>
        <td colSpan={14} className="bg-iron/30 px-3 py-3">
          <EditForm initial={row} onCancel={onCancel} onSave={onSave} />
        </td>
      </tr>
    );
  }
  return (
    <tr className={cn("hover:bg-iron/30", selected && "bg-brass/5")}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 accent-brass"
        />
      </td>
      <td className="px-3 py-2 font-mono text-[0.6875rem] text-stone/55">{row.shortGroupId}</td>
      <td className="px-3 py-2">
        <select
          value={row.approvalStatus}
          onChange={(e) => onApprove(e.target.value as "pending" | "approved" | "rejected")}
          className={cn(
            "h-6 border bg-transparent px-1.5 text-[0.6875rem] uppercase tracking-wider focus:outline-none",
            APPROVAL_TONE[row.approvalStatus] ?? APPROVAL_TONE.pending
          )}
        >
          {APPROVAL_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-iron text-bone">
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onActive(!row.isActive)}
          className={cn(
            "h-6 border px-2 text-[0.6875rem] uppercase tracking-wider transition-colors",
            row.isActive
              ? "border-olive/40 bg-olive/10 text-olive hover:bg-olive/20"
              : "border-stone/30 bg-stone/10 text-stone/65 hover:bg-stone/20"
          )}
        >
          {row.isActive ? "On" : "Off"}
        </button>
      </td>
      <td className="px-3 py-2 text-bone">{row.groupName}</td>
      <td className="px-3 py-2 text-stone/85">{row.locationName ?? "—"}</td>
      <td className="px-3 py-2 text-stone/65">{row.locationType ?? ""}</td>
      <td className="px-3 py-2 text-stone/85">
        {row.address || row.city || row.state ? (
          <span>
            {[row.address, row.city, row.state].filter(Boolean).join(", ")}
          </span>
        ) : (
          <span className="text-stone/35">—</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[0.6875rem] text-stone/65">
        {row.latitude && row.longitude
          ? `${Number(row.latitude).toFixed(2)}, ${Number(row.longitude).toFixed(2)}`
          : "—"}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => onMap(!row.displayedOnMap)}
          className={cn(
            "h-6 border px-2 text-[0.6875rem] uppercase tracking-wider transition-colors",
            row.displayedOnMap
              ? "border-brass/40 bg-brass/10 text-brass hover:bg-brass/20"
              : "border-stone/30 bg-stone/10 text-stone/65 hover:bg-stone/20"
          )}
        >
          {row.displayedOnMap ? "On" : "Off"}
        </button>
      </td>
      <td className="px-3 py-2 text-stone/85">{row.meetingDay ?? ""}</td>
      <td className="px-3 py-2 text-stone/85">{row.meetingTime ?? ""}</td>
      <td className="px-3 py-2 text-right text-stone/65">{row.memberCount}</td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-none p-1 text-stone/55 transition-colors hover:text-brass"
            title="Edit"
          >
            <Icon name="pen" size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-none p-1 text-stone/45 transition-colors hover:text-oxblood"
            title="Delete (permanent)"
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: AdminGroupLocationRow | null;
  onCancel: () => void;
  onSave: (input: UpsertGroupLocationInput) => void;
}) {
  const [groupName, setGroupName] = useState(initial?.groupName ?? "");
  const [locationName, setLocationName] = useState(initial?.locationName ?? "");
  const [specialInstructions, setSpecialInstructions] = useState(
    initial?.specialInstructions ?? ""
  );
  const [locationType, setLocationType] = useState(initial?.locationType ?? "in_person");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zipCode, setZipCode] = useState(initial?.zipCode ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude ?? "");
  const [longitude, setLongitude] = useState(initial?.longitude ?? "");
  const [meetingDay, setMeetingDay] = useState(initial?.meetingDay ?? "");
  const [meetingTime, setMeetingTime] = useState(initial?.meetingTime ?? "");

  // Geocoding state — admin clicks "Find on map" and Mapbox returns lat/lng.
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodePreview, setGeocodePreview] = useState<string | null>(null);

  async function handleGeocode() {
    setGeocoding(true);
    setGeocodeError("");
    setGeocodePreview(null);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city, state, zipCode }),
      });
      const data = (await res.json()) as
        | { found: true; latitude: number; longitude: number; placeName: string; relevance: number }
        | { found: false; reason?: string }
        | { error?: string; detail?: string };
      if (!res.ok) {
        const err = "error" in data ? data.error ?? "Geocode failed" : "Geocode failed";
        throw new Error(err);
      }
      if ("found" in data && data.found) {
        setLatitude(data.latitude.toFixed(6));
        setLongitude(data.longitude.toFixed(6));
        setGeocodePreview(
          `${data.placeName} (confidence ${Math.round(data.relevance * 100)}%)`
        );
      } else {
        setGeocodeError(
          "found" in data && data.reason
            ? data.reason
            : "Mapbox returned no match. Try refining the address."
        );
      }
    } catch (e) {
      setGeocodeError(e instanceof Error ? e.message : "Geocode failed");
    } finally {
      setGeocoding(false);
    }
  }

  const canGeocode =
    address.trim().length > 0 ||
    (city.trim().length > 0 && state.trim().length > 0) ||
    zipCode.trim().length > 4;

  const canSave = groupName.trim().length > 0;

  return (
    <div className="border border-brass/30 bg-iron/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <Icon name="pen" size={14} className="text-brass" />
        <span className="section-mark text-brass">
          § {initial ? `Edit ${initial.groupName}` : "New group + location"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Group name *">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
            autoFocus
          />
        </Field>
        <Field label="Location name">
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. The Diner on 5th"
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="Location type">
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          >
            {LOCATION_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-iron text-bone">
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Address" className="md:col-span-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="ZIP">
          <input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="State">
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="Latitude">
          <input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 font-mono text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <Field label="Longitude">
          <input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 font-mono text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
        <div className="md:col-span-3">
          <button
            type="button"
            onClick={handleGeocode}
            disabled={!canGeocode || geocoding}
            className="inline-flex h-8 items-center gap-2 border border-brass/40 bg-brass/10 px-3 text-[0.6875rem] uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Convert the address above into latitude/longitude using Mapbox"
          >
            <Icon name="map-pin" size={11} />
            {geocoding ? "Looking up..." : "Find on map (auto lat/lng)"}
          </button>
          {geocodePreview && (
            <p className="mt-1 text-[0.625rem] text-olive">✓ {geocodePreview}</p>
          )}
          {geocodeError && (
            <p className="mt-1 text-[0.625rem] text-oxblood">{geocodeError}</p>
          )}
        </div>
        <Field label="Meeting day">
          <select
            value={meetingDay ?? ""}
            onChange={(e) => setMeetingDay(e.target.value)}
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          >
            <option value="">—</option>
            {MEETING_DAYS.map((d) => (
              <option key={d} value={d} className="bg-iron text-bone">
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Meeting time">
          <input
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder="e.g. 6:30 AM"
            className="h-8 w-full border border-stone/20 bg-transparent px-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </Field>
      </div>
      <Field label="Special instructions" className="mt-3">
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={2}
          placeholder="e.g. Park out back. Second door on the right."
          className="block w-full border border-stone/20 bg-transparent px-2 py-1 text-sm text-bone focus:border-brass focus:outline-none"
        />
      </Field>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({
              groupId: initial?.groupId,
              groupName,
              locationName: locationName || undefined,
              specialInstructions,
              locationType,
              address,
              city,
              state,
              zipCode,
              latitude,
              longitude,
              meetingDay,
              meetingTime,
            })
          }
          disabled={!canSave}
          className="lift inline-flex h-8 items-center gap-1.5 bg-brass px-4 text-[0.6875rem] font-medium uppercase tracking-wider text-iron transition-colors hover:bg-gold disabled:opacity-60"
        >
          {initial ? "Save changes" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone/65 transition-colors hover:text-bone"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
        {label}
      </span>
      {children}
    </label>
  );
}

// Suppress unused "format" import warning — used by neither the table
// nor the form right now but exposed for the row's createdAt if needed.
void format;
