"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { cn } from "@/lib/utils";
import {
  bulkSoftDeleteMembers,
  bulkUpdateMembers,
  softDeleteMember,
  updateMember,
  type AdminMemberRow,
} from "@/server/admin-members";
import { format } from "date-fns";

interface Props {
  initialRows: AdminMemberRow[];
  groupOptions: { id: string; name: string }[];
  dbError: string;
}

type SortKey =
  | "createdAt"
  | "approvalStatus"
  | "isActive"
  | "role"
  | "firstName"
  | "lastName"
  | "email"
  | "groupName"
  | "locationName";

const APPROVAL_TONE: Record<string, string> = {
  approved: "border-olive/40 bg-olive/10 text-olive",
  pending: "border-brass/40 bg-brass/10 text-brass",
  rejected: "border-oxblood/40 bg-oxblood/10 text-oxblood",
};

const APPROVAL_OPTIONS = ["pending", "approved", "rejected"] as const;

export function MembersTable({ initialRows, groupOptions, dbError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [filterApproval, setFilterApproval] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filterApproval && r.approvalStatus !== filterApproval) return false;
        if (filterActive === "active" && !r.isActive) return false;
        if (filterActive === "inactive" && r.isActive) return false;
        if (filterGroup) {
          if (filterGroup === "_none" && r.groupId) return false;
          if (filterGroup !== "_none" && r.groupId !== filterGroup) return false;
        }
        if (!q) return true;
        const hay = [
          r.firstName,
          r.lastName,
          r.nickname,
          r.email,
          r.phone,
          r.signalAccount,
          r.groupName,
          r.locationName,
          r.city,
          r.state,
          r.shortId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const av = (a[sortKey] ?? "") as string | boolean;
        const bv = (b[sortKey] ?? "") as string | boolean;
        if (av === bv) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        return av > bv ? dir : -dir;
      });
  }, [rows, query, filterApproval, filterActive, filterGroup, sortKey, sortDir]);

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
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }
  function clearFilters() {
    setQuery("");
    setFilterApproval("");
    setFilterActive("");
    setFilterGroup("");
  }

  async function patchRow(id: string, patch: Partial<AdminMemberRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleApproval(id: string, approvalStatus: "pending" | "approved" | "rejected") {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await updateMember({ id, approvalStatus });
        await patchRow(id, { approvalStatus });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  async function handleActive(id: string, isActive: boolean) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await updateMember({ id, isActive });
        await patchRow(id, { isActive });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  async function handleGroup(id: string, groupId: string | null) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await updateMember({ id, groupId });
        const groupName = groupId
          ? groupOptions.find((g) => g.id === groupId)?.name ?? null
          : null;
        await patchRow(id, { groupId, groupName, locationId: null, locationName: null });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Soft-delete this member? This hides them but keeps the row.")) return;
    setErrorMsg("");
    startTransition(async () => {
      try {
        await softDeleteMember(id);
        setRows((prev) => prev.filter((r) => r.id !== id));
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  async function bulkApprove(approvalStatus: "approved" | "rejected") {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkUpdateMembers(ids, { approvalStatus });
        setRows((prev) =>
          prev.map((r) => (selected.has(r.id) ? { ...r, approvalStatus } : r))
        );
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  }
  async function bulkActive(isActive: boolean) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkUpdateMembers(ids, { isActive });
        setRows((prev) =>
          prev.map((r) => (selected.has(r.id) ? { ...r, isActive } : r))
        );
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  }
  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Soft-delete ${selected.size} member${selected.size === 1 ? "" : "s"}?`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkSoftDeleteMembers(ids);
        setRows((prev) => prev.filter((r) => !selected.has(r.id)));
        setSelected(new Set());
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Bulk delete failed");
      }
    });
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="border border-oxblood/40 bg-oxblood/15 p-6 text-sm text-bone">
          <p className="display-xl text-base">Members table can&rsquo;t load.</p>
          <p className="mt-2 text-stone/85">{dbError}</p>
          <p className="mt-3 text-xs text-stone/60">
            Likely cause: migration 0009 hasn&rsquo;t been applied. Run it via the GHA migration runner or paste the SQL into the Neon SQL editor.
          </p>
        </div>
      </div>
    );
  }

  const allSelectedOnPage =
    selected.size > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-12 md:py-14">
      <AdminPageIntro
        kicker="Members"
        title="Approve, assign, manage."
        description="Every man who signed up via /join. Approve or reject, toggle active, assign to a group, edit details. Filters and bulk actions keep this fast at scale."
        hint="Members never log in. They live as DB rows so admins can route email/SMS, assign them to a group, and track their lifecycle. Soft-delete hides without losing data."
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border border-stone/15 bg-iron/30 p-3">
        <label className="relative flex flex-1 min-w-[220px] items-center">
          <Icon name="search" size={14} className="absolute left-3 text-stone/55" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, group, location..."
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
              {s[0].toUpperCase() + s.slice(1)}
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
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="h-9 border border-stone/20 bg-iron/40 px-3 text-xs text-bone focus:border-brass focus:outline-none"
        >
          <option value="">Group: any</option>
          <option value="_none">— Unassigned —</option>
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {(query || filterApproval || filterActive || filterGroup) && (
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
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 border border-brass/40 bg-brass/10 px-4 py-2 text-xs text-bone">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-stone/55">·</span>
          <button
            type="button"
            onClick={() => bulkApprove("approved")}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-olive/40 bg-olive/10 px-2 text-olive transition-colors hover:bg-olive/20"
          >
            <Icon name="check" size={11} /> Approve
          </button>
          <button
            type="button"
            onClick={() => bulkApprove("rejected")}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-oxblood/40 bg-oxblood/10 px-2 text-oxblood transition-colors hover:bg-oxblood/20"
          >
            <Icon name="close" size={11} /> Reject
          </button>
          <button
            type="button"
            onClick={() => bulkActive(true)}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={() => bulkActive(false)}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Deactivate
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-oxblood/40 px-2 text-oxblood transition-colors hover:bg-oxblood/20"
          >
            <Icon name="trash" size={11} /> Soft-delete
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
                  aria-label="Select all"
                />
              </th>
              <SortableTh label="ID" k="email" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("email")} />
              <SortableTh label="Approval" k="approvalStatus" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("approvalStatus")} />
              <SortableTh label="Active" k="isActive" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("isActive")} />
              <SortableTh label="Role" k="role" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("role")} />
              <SortableTh label="First" k="firstName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("firstName")} />
              <SortableTh label="Last" k="lastName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("lastName")} />
              <th className="px-3 py-2 text-left">Nickname</th>
              <SortableTh label="Email" k="email" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("email")} />
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Signal</th>
              <SortableTh label="Group" k="groupName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("groupName")} />
              <SortableTh label="Location" k="locationName" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("locationName")} />
              <SortableTh label="Joined" k="createdAt" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("createdAt")} />
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-6 py-12 text-center text-stone/60">
                  No members match. Adjust filters or wait for the first signup.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <MemberRow
                  key={r.id}
                  row={r}
                  groupOptions={groupOptions}
                  selected={selected.has(r.id)}
                  onToggleSelect={() => toggleSelect(r.id)}
                  onApprove={(s) => handleApproval(r.id, s)}
                  onActive={(a) => handleActive(r.id, a)}
                  onGroup={(g) => handleGroup(r.id, g)}
                  onDelete={() => handleDelete(r.id)}
                  editing={editing === r.id}
                  onEdit={() => setEditing(editing === r.id ? null : r.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[0.6875rem] text-stone/50">
        <Icon name="info" size={12} className="text-stone/40" />
        Click a column header to sort. Inline-edit the badges to update single rows. Select rows for bulk actions. Soft-deleted members stay in the database for audit; restore via SQL.
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
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-bone",
          active && "text-bone"
        )}
      >
        {label}
        {active && (
          <span className="text-[0.5625rem]">{sortDir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}

function MemberRow({
  row,
  groupOptions,
  selected,
  onToggleSelect,
  onApprove,
  onActive,
  onGroup,
  onDelete,
  editing,
  onEdit,
}: {
  row: AdminMemberRow;
  groupOptions: { id: string; name: string }[];
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: (s: "pending" | "approved" | "rejected") => void;
  onActive: (a: boolean) => void;
  onGroup: (g: string | null) => void;
  onDelete: () => void;
  editing: boolean;
  onEdit: () => void;
}) {
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
      <td className="px-3 py-2 font-mono text-[0.6875rem] text-stone/55">
        {row.shortId}
      </td>
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
          {row.isActive ? "Active" : "Inactive"}
        </button>
      </td>
      <td className="px-3 py-2 text-stone/85">{row.role}</td>
      <td className="px-3 py-2 text-bone">{row.firstName ?? "—"}</td>
      <td className="px-3 py-2 text-bone">{row.lastName ?? "—"}</td>
      <td className="px-3 py-2 text-stone/85">{row.nickname ?? ""}</td>
      <td className="px-3 py-2">
        <a href={`mailto:${row.email}`} className="text-bone hover:text-brass">
          {row.email}
        </a>
      </td>
      <td className="px-3 py-2">
        {row.phone ? (
          <a href={`tel:${row.phone}`} className="text-stone/85 hover:text-brass">
            {row.phone}
          </a>
        ) : (
          <span className="text-stone/35">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-stone/85">{row.signalAccount ?? ""}</td>
      <td className="px-3 py-2">
        <select
          value={row.groupId ?? ""}
          onChange={(e) => onGroup(e.target.value || null)}
          className="h-6 max-w-[140px] border border-stone/20 bg-transparent px-1.5 text-[0.6875rem] text-bone focus:border-brass focus:outline-none"
        >
          <option value="" className="bg-iron text-bone">— none —</option>
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id} className="bg-iron text-bone">
              {g.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-stone/65">{row.locationName ?? "—"}</td>
      <td className="px-3 py-2 text-stone/55">
        {format(new Date(row.createdAt), "MMM d, yyyy")}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-none p-1 text-stone/45 transition-colors hover:text-oxblood"
          title="Soft-delete"
        >
          <Icon name="trash" size={12} />
        </button>
      </td>
    </tr>
  );
}
