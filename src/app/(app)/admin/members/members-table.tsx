"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { cn } from "@/lib/utils";
import {
  bulkSoftDeleteMembers,
  bulkUpdateMembers,
  createMember,
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
  | "subscribed"
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

const INTENT_LABEL: Record<string, string> = {
  join: "Join",
  start: "Start",
  just_keep_posted: "Posted",
};

const TIMELINE_LABEL: Record<string, string> = {
  now: "Ready now",
  three_months: "Within three months",
  exploring: "Just exploring",
};

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
  { value: "asst_leader", label: "Assistant leader" },
] as const;

type NewMemberForm = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  signalAccount: string;
  groupId: string;
  role: string;
};

const EMPTY_NEW_MEMBER: NewMemberForm = {
  firstName: "",
  lastName: "",
  nickname: "",
  email: "",
  phone: "",
  signalAccount: "",
  groupId: "",
  role: "member",
};

const NEW_MEMBER_FIELDS: {
  key: keyof NewMemberForm;
  label: string;
  type: string;
  placeholder?: string;
}[] = [
  { key: "firstName", label: "First name", type: "text" },
  { key: "lastName", label: "Last name", type: "text" },
  { key: "nickname", label: "Nickname", type: "text" },
  { key: "email", label: "Email", type: "email", placeholder: "optional" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "optional" },
  { key: "signalAccount", label: "Signal", type: "text", placeholder: "optional" },
];

export function MembersTable({ initialRows, groupOptions, dbError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [filterApproval, setFilterApproval] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState<NewMemberForm>(EMPTY_NEW_MEMBER);
  const [newSubscribed, setNewSubscribed] = useState(true);
  const [addError, setAddError] = useState("");

  const canSubmitNew =
    !!newMember.firstName.trim() ||
    !!newMember.lastName.trim() ||
    !!newMember.nickname.trim();

  function setField(key: keyof NewMemberForm, value: string) {
    setNewMember((prev) => ({ ...prev, [key]: value }));
  }

  function cancelAdd() {
    setNewMember(EMPTY_NEW_MEMBER);
    setNewSubscribed(true);
    setAddError("");
    setShowAdd(false);
  }

  function handleCreate() {
    setAddError("");
    if (!canSubmitNew) {
      setAddError("Add at least a first name, last name, or nickname.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createMember({
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          nickname: newMember.nickname,
          email: newMember.email,
          phone: newMember.phone,
          signalAccount: newMember.signalAccount,
          groupId: newMember.groupId || null,
          role: newMember.role,
          subscribed: newSubscribed,
        });
        setRows((prev) => [created, ...prev]);
        setNewMember(EMPTY_NEW_MEMBER);
        setNewSubscribed(true);
        setShowAdd(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Could not add member.");
      }
    });
  }

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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
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

  async function handleSubscribed(id: string, subscribed: boolean) {
    setErrorMsg("");
    startTransition(async () => {
      try {
        await updateMember({ id, subscribed });
        await patchRow(id, { subscribed });
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
  async function bulkSubscribed(subscribed: boolean) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkUpdateMembers(ids, { subscribed });
        setRows((prev) =>
          prev.map((r) => (selected.has(r.id) ? { ...r, subscribed } : r))
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

      {/* Add member */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => (showAdd ? cancelAdd() : setShowAdd(true))}
          className="lift inline-flex h-9 items-center gap-2 border border-bone bg-bone px-4 text-sm font-medium text-iron transition-colors hover:bg-stone"
        >
          <Icon name={showAdd ? "close" : "plus"} size={13} />
          {showAdd ? "Cancel" : "Add member"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 border border-brass/30 bg-iron/30 p-4">
          <p className="section-mark mb-4 text-brass">§ New member</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {NEW_MEMBER_FIELDS.map((f) => (
              <label
                key={f.key}
                className="flex flex-col gap-1 text-xs text-stone/70"
              >
                <span className="section-mark text-stone/55">{f.label}</span>
                <input
                  type={f.type}
                  value={newMember[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-9 border border-stone/20 bg-transparent px-3 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-stone/70">
              <span className="section-mark text-stone/55">Group</span>
              <select
                value={newMember.groupId}
                onChange={(e) => setField("groupId", e.target.value)}
                className="h-9 border border-stone/20 bg-iron/40 px-3 text-sm text-bone focus:border-brass focus:outline-none"
              >
                <option value="">— Unassigned —</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone/70">
              <span className="section-mark text-stone/55">Role</span>
              <select
                value={newMember.role}
                onChange={(e) => setField("role", e.target.value)}
                className="h-9 border border-stone/20 bg-iron/40 px-3 text-sm text-bone focus:border-brass focus:outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone/70">
              <span className="section-mark text-stone/55">Weekly letter</span>
              <span className="inline-flex h-9 items-center gap-2 border border-stone/20 px-3">
                <input
                  type="checkbox"
                  checked={newSubscribed}
                  onChange={(e) => setNewSubscribed(e.target.checked)}
                  className="h-3.5 w-3.5 accent-brass"
                />
                <span className="text-sm text-bone">Subscribed</span>
              </span>
            </label>
          </div>
          <p className="mt-3 max-w-3xl text-xs text-stone/55">
            Contact info is optional. Add any mix of email, phone, and Signal,
            or none at all. At least one of first name, last name, or nickname is
            required. New members are added approved and marked as admin-added.
          </p>
          {addError && (
            <p className="mt-3 border border-oxblood/40 bg-oxblood/10 px-3 py-2 text-xs text-oxblood">
              {addError}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy || !canSubmitNew}
              className="lift inline-flex h-9 items-center gap-2 border border-olive/50 bg-olive/15 px-4 text-sm font-medium text-olive transition-colors hover:bg-olive/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="check" size={13} /> {busy ? "Adding…" : "Add member"}
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              className="text-xs text-stone/65 underline-offset-4 hover:text-brass hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            onClick={() => bulkSubscribed(true)}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Subscribe
          </button>
          <button
            type="button"
            onClick={() => bulkSubscribed(false)}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 border border-stone/30 px-2 transition-colors hover:border-brass hover:text-brass"
          >
            Unsubscribe
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

      {/* 375px card list (< md) — the SAME filtered rows and handlers as the
          table below; only the presentation changes at the breakpoint. */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="border border-stone/15 px-6 py-12 text-center text-xs text-stone/60">
            No members match. Adjust filters or wait for the first signup.
          </p>
        ) : (
          filtered.map((r) => (
            <MemberCard
              key={r.id}
              row={r}
              groupOptions={groupOptions}
              selected={selected.has(r.id)}
              onToggleSelect={() => toggleSelect(r.id)}
              onApprove={(s) => handleApproval(r.id, s)}
              onActive={(a) => handleActive(r.id, a)}
              onSubscribed={(v) => handleSubscribed(r.id, v)}
              onGroup={(g) => handleGroup(r.id, g)}
              onDelete={() => handleDelete(r.id)}
            />
          ))
        )}
      </div>

      {/* Table (≥ md) */}
      <div className="hidden overflow-x-auto border border-stone/15 md:block">
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
              <th className="w-8 px-2 py-2"></th>
              <SortableTh label="ID" k="email" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("email")} />
              <SortableTh label="Approval" k="approvalStatus" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("approvalStatus")} />
              <SortableTh label="Active" k="isActive" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("isActive")} />
              <SortableTh label="Letter" k="subscribed" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("subscribed")} />
              <th className="px-3 py-2 text-left">Intent</th>
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
                <td colSpan={18} className="px-6 py-12 text-center text-stone/60">
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
                  expanded={expanded.has(r.id)}
                  onToggleExpand={() => toggleExpand(r.id)}
                  onToggleSelect={() => toggleSelect(r.id)}
                  onApprove={(s) => handleApproval(r.id, s)}
                  onActive={(a) => handleActive(r.id, a)}
                  onSubscribed={(v) => handleSubscribed(r.id, v)}
                  onGroup={(g) => handleGroup(r.id, g)}
                  onDelete={() => handleDelete(r.id)}
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
  expanded,
  onToggleExpand,
  onToggleSelect,
  onApprove,
  onActive,
  onSubscribed,
  onGroup,
  onDelete,
}: {
  row: AdminMemberRow;
  groupOptions: { id: string; name: string }[];
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onApprove: (s: "pending" | "approved" | "rejected") => void;
  onActive: (a: boolean) => void;
  onSubscribed: (v: boolean) => void;
  onGroup: (g: string | null) => void;
  onDelete: () => void;
}) {
  return (
    <>
    <tr className={cn("hover:bg-iron/30", selected && "bg-brass/5")}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 accent-brass"
        />
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1 text-stone/50 transition-colors hover:text-brass"
          title={expanded ? "Hide details" : "Show everything he submitted"}
          aria-expanded={expanded}
        >
          <Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} />
        </button>
      </td>
      <td className="px-3 py-2 font-mono text-[0.6875rem] text-stone/55">
        {row.shortId}
      </td>
      <td className="px-3 py-2">
        <ApprovalSelect value={row.approvalStatus} onApprove={onApprove} className="h-6" />
      </td>
      <td className="px-3 py-2">
        <ActiveToggle isActive={row.isActive} onActive={onActive} className="h-6" />
      </td>
      <td className="px-3 py-2">
        <SubscribedCheckbox subscribed={row.subscribed} onSubscribed={onSubscribed} />
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "border px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider",
            row.intent === "start"
              ? "border-brass/40 bg-brass/10 text-brass"
              : "border-stone/25 text-stone/70"
          )}
        >
          {INTENT_LABEL[row.intent] ?? row.intent}
        </span>
      </td>
      <td className="px-3 py-2 text-stone/85">{row.role}</td>
      <td className="px-3 py-2 text-bone">{row.firstName ?? "—"}</td>
      <td className="px-3 py-2 text-bone">{row.lastName ?? "—"}</td>
      <td className="px-3 py-2 text-stone/85">{row.nickname ?? ""}</td>
      <td className="px-3 py-2">
        {row.email ? (
          <a href={`mailto:${row.email}`} className="text-bone hover:text-brass">
            {row.email}
          </a>
        ) : (
          <span className="text-stone/40">—</span>
        )}
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
        <GroupSelect
          value={row.groupId}
          groupOptions={groupOptions}
          onGroup={onGroup}
          className="h-6 max-w-[140px]"
        />
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
    {expanded && (
      <tr className="bg-iron/20">
        <td colSpan={18} className="px-6 py-3">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[0.6875rem] sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Intent" value={INTENT_LABEL[row.intent] ?? row.intent} />
            <DetailItem
              label="Location given"
              value={[row.city, row.state, row.zip].filter(Boolean).join(", ") || null}
            />
            <DetailItem
              label="Timeline"
              value={row.timeline ? TIMELINE_LABEL[row.timeline] ?? row.timeline : null}
            />
            <DetailItem label="Source" value={row.source} />
            <DetailItem
              label="Joined"
              value={format(new Date(row.createdAt), "MMM d, yyyy h:mm a")}
            />
            <DetailItem label="Weekly letter" value={row.subscribed ? "Subscribed" : "Unsubscribed"} />
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="His note" value={row.note} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="Admin note" value={row.adminNote} />
            </div>
          </dl>
        </td>
      </tr>
    )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 uppercase tracking-wider text-stone/50">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-stone/85">
        {value || "—"}
      </dd>
    </div>
  );
}

/* Shared row/card controls. The table cell and the mobile card render the
   exact same markup; only the size class differs — h-6 in the dense table,
   h-11 on the card so every tap target clears 44px. */

function ApprovalSelect({
  value,
  onApprove,
  className,
}: {
  value: string;
  onApprove: (s: "pending" | "approved" | "rejected") => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onApprove(e.target.value as "pending" | "approved" | "rejected")}
      className={cn(
        "border bg-transparent px-1.5 text-[0.6875rem] uppercase tracking-wider focus:outline-none",
        APPROVAL_TONE[value] ?? APPROVAL_TONE.pending,
        className
      )}
    >
      {APPROVAL_OPTIONS.map((s) => (
        <option key={s} value={s} className="bg-iron text-bone">
          {s}
        </option>
      ))}
    </select>
  );
}

function ActiveToggle({
  isActive,
  onActive,
  className,
}: {
  isActive: boolean;
  onActive: (a: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onActive(!isActive)}
      className={cn(
        "border px-2 text-[0.6875rem] uppercase tracking-wider transition-colors",
        isActive
          ? "border-olive/40 bg-olive/10 text-olive hover:bg-olive/20"
          : "border-stone/30 bg-stone/10 text-stone/65 hover:bg-stone/20",
        className
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}

/** The weekly-letter checkbox — check is yes, uncheck is no. */
function SubscribedCheckbox({
  subscribed,
  onSubscribed,
}: {
  subscribed: boolean;
  onSubscribed: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={subscribed}
      onChange={(e) => onSubscribed(e.target.checked)}
      className="h-3.5 w-3.5 accent-brass"
      aria-label={subscribed ? "Subscribed to the weekly letter" : "Not subscribed"}
      title={subscribed ? "Gets the weekly letter" : "Does not get the weekly letter"}
    />
  );
}

function GroupSelect({
  value,
  groupOptions,
  onGroup,
  className,
}: {
  value: string | null;
  groupOptions: { id: string; name: string }[];
  onGroup: (g: string | null) => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onGroup(e.target.value || null)}
      className={cn(
        "border border-stone/20 bg-transparent px-1.5 text-[0.6875rem] text-bone focus:border-brass focus:outline-none",
        className
      )}
    >
      <option value="" className="bg-iron text-bone">— none —</option>
      {groupOptions.map((g) => (
        <option key={g.id} value={g.id} className="bg-iron text-bone">
          {g.name}
        </option>
      ))}
    </select>
  );
}

/* < md card — full triage parity with MemberRow: bulk-select checkbox,
   approval select, active toggle, group assignment, soft-delete. Same
   handlers, same shared controls, sized for thumbs. */
function MemberCard({
  row,
  groupOptions,
  selected,
  onToggleSelect,
  onApprove,
  onActive,
  onSubscribed,
  onGroup,
  onDelete,
}: {
  row: AdminMemberRow;
  groupOptions: { id: string; name: string }[];
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: (s: "pending" | "approved" | "rejected") => void;
  onActive: (a: boolean) => void;
  onSubscribed: (v: boolean) => void;
  onGroup: (g: string | null) => void;
  onDelete: () => void;
}) {
  return (
    <article className={cn("border border-stone/15 p-4", selected && "bg-brass/5")}>
      <div className="flex items-start gap-3">
        {/* Bulk-select checkbox, card corner — 44px tap target via the label */}
        <label className="flex h-11 w-11 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 accent-brass"
            aria-label={`Select ${row.email ?? row.shortId}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-bone">
            {[row.firstName, row.lastName].filter(Boolean).join(" ") ||
              row.nickname ||
              "—"}
          </p>
          <p className="truncate text-xs text-stone/70">
            {row.email ?? row.phone ?? row.signalAccount ?? "—"}
          </p>
          <p className="mt-0.5 text-[0.625rem] uppercase tracking-wider text-stone/55">
            {[
              INTENT_LABEL[row.intent] ?? row.intent,
              [row.city, row.state].filter(Boolean).join(", "),
              format(new Date(row.createdAt), "MMM d, yyyy"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {row.note && (
            <p className="mt-1 line-clamp-3 text-xs text-stone/70">{row.note}</p>
          )}
        </div>
        {/* Status pill: the table's status cell renders the approval select
            styled as a pill — reused verbatim here as pill AND action. */}
        <ApprovalSelect
          value={row.approvalStatus}
          onApprove={onApprove}
          className="h-11 shrink-0"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActiveToggle isActive={row.isActive} onActive={onActive} className="h-11 px-3" />
        <label className="inline-flex h-11 items-center gap-2 border border-stone/20 px-3 text-[0.6875rem] uppercase tracking-wider text-stone/85">
          <input
            type="checkbox"
            checked={row.subscribed}
            onChange={(e) => onSubscribed(e.target.checked)}
            className="h-3.5 w-3.5 accent-brass"
          />
          Letter
        </label>
        <div className="flex min-w-[180px] flex-1 items-center gap-1.5">
          <span className="text-[0.625rem] uppercase tracking-wider text-stone/55">
            Group
          </span>
          <GroupSelect
            value={row.groupId}
            groupOptions={groupOptions}
            onGroup={onGroup}
            className="h-11 min-w-0 flex-1"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-11 items-center gap-1.5 border border-oxblood/40 px-3 text-[0.6875rem] uppercase tracking-wider text-oxblood transition-colors hover:bg-oxblood/20"
        >
          <Icon name="trash" size={11} /> Soft-delete
        </button>
      </div>
    </article>
  );
}
