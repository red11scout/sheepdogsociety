"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  MapPin,
  Clock,
  ArrowLeft,
  Trash2,
  UserPlus,
  Pencil,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvailableUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type GroupMember = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  meetingLocation: string | null;
  maxMembers: number;
  isActive: boolean;
  createdBy: string;
  memberCount: number;
};

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-md ${
        toast.type === "success"
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminGroupManager({
  availableUsers,
}: {
  availableUsers: AvailableUser[];
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formMaxMembers, setFormMaxMembers] = useState(15);

  // Detail view
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Add member
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -----------------------------------------------------------------------
  // Toast helper
  // -----------------------------------------------------------------------

  let toastId = 0;
  function showToast(type: "success" | "error", message: string) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // -----------------------------------------------------------------------
  // Fetch groups (including inactive for admin)
  // -----------------------------------------------------------------------

  const fetchGroups = useCallback(() => {
    setLoading(true);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .catch(() => showToast("error", "Failed to load groups"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // -----------------------------------------------------------------------
  // Fetch members for detail view
  // -----------------------------------------------------------------------

  function fetchMembers(groupId: string) {
    setMembersLoading(true);
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
      })
      .catch(() => showToast("error", "Failed to load members"))
      .finally(() => setMembersLoading(false));
  }

  // -----------------------------------------------------------------------
  // Open detail view
  // -----------------------------------------------------------------------

  function openDetail(group: Group) {
    setSelectedGroup(group);
    setAddMemberUserId("");
    fetchMembers(group.id);
  }

  function closeDetail() {
    setSelectedGroup(null);
    setMembers([]);
  }

  // -----------------------------------------------------------------------
  // Create / Edit dialog helpers
  // -----------------------------------------------------------------------

  function openCreate() {
    setEditingGroup(null);
    setFormName("");
    setFormDesc("");
    setFormSchedule("");
    setFormLocation("");
    setFormMaxMembers(15);
    setDialogOpen(true);
  }

  function openEdit(group: Group) {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDesc(group.description ?? "");
    setFormSchedule(group.meetingSchedule ?? "");
    setFormLocation(group.meetingLocation ?? "");
    setFormMaxMembers(group.maxMembers);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingGroup) {
        // Update existing
        const res = await fetch(`/api/groups/${editingGroup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            meetingSchedule: formSchedule,
            meetingLocation: formLocation,
            maxMembers: formMaxMembers,
          }),
        });
        if (!res.ok) throw new Error("Failed to update group");

        // Optimistic update
        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id
              ? {
                  ...g,
                  name: formName,
                  description: formDesc,
                  meetingSchedule: formSchedule,
                  meetingLocation: formLocation,
                  maxMembers: formMaxMembers,
                }
              : g
          )
        );
        if (selectedGroup?.id === editingGroup.id) {
          setSelectedGroup((prev) =>
            prev
              ? {
                  ...prev,
                  name: formName,
                  description: formDesc,
                  meetingSchedule: formSchedule,
                  meetingLocation: formLocation,
                  maxMembers: formMaxMembers,
                }
              : prev
          );
        }
        showToast("success", "Group updated");
      } else {
        // Create new
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            meetingSchedule: formSchedule,
            meetingLocation: formLocation,
            maxMembers: formMaxMembers,
          }),
        });
        if (!res.ok) throw new Error("Failed to create group");
        showToast("success", "Group created");
        fetchGroups();
      }
      setDialogOpen(false);
    } catch {
      showToast("error", editingGroup ? "Failed to update group" : "Failed to create group");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete group (soft-delete)
  // -----------------------------------------------------------------------

  function confirmDelete(group: Group) {
    setDeletingGroup(group);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingGroup) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${deletingGroup.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to deactivate group");

      // Optimistic removal
      setGroups((prev) => prev.filter((g) => g.id !== deletingGroup.id));
      if (selectedGroup?.id === deletingGroup.id) closeDetail();
      showToast("success", `"${deletingGroup.name}" deactivated`);
      setDeleteDialogOpen(false);
      setDeletingGroup(null);
    } catch {
      showToast("error", "Failed to deactivate group");
    } finally {
      setDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Add member
  // -----------------------------------------------------------------------

  async function handleAddMember() {
    if (!selectedGroup || !addMemberUserId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add member");
      }
      showToast("success", "Member added");
      setAddMemberUserId("");
      fetchMembers(selectedGroup.id);

      // Update member count optimistically
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id
            ? { ...g, memberCount: g.memberCount + 1 }
            : g
        )
      );
      setSelectedGroup((prev) =>
        prev ? { ...prev, memberCount: prev.memberCount + 1 } : prev
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add member";
      showToast("error", message);
    } finally {
      setAddingMember(false);
    }
  }

  // -----------------------------------------------------------------------
  // Remove member
  // -----------------------------------------------------------------------

  async function handleRemoveMember(userId: string) {
    if (!selectedGroup) return;
    try {
      const res = await fetch(
        `/api/groups/${selectedGroup.id}/members?userId=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove member");

      // Optimistic update
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id
            ? { ...g, memberCount: Math.max(0, g.memberCount - 1) }
            : g
        )
      );
      setSelectedGroup((prev) =>
        prev ? { ...prev, memberCount: Math.max(0, prev.memberCount - 1) } : prev
      );
      showToast("success", "Member removed");
    } catch {
      showToast("error", "Failed to remove member");
    }
  }

  // -----------------------------------------------------------------------
  // Filter available users to exclude current members
  // -----------------------------------------------------------------------

  const memberUserIds = new Set(members.map((m) => m.userId));
  const filteredUsers = availableUsers.filter((u) => !memberUserIds.has(u.id));

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="relative">
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastNotification key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </div>
      )}

      {/* --- Detail view --- */}
      {selectedGroup ? (
        <div>
          <button
            onClick={closeDetail}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to groups
          </button>

          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
                <Badge variant={selectedGroup.isActive ? "default" : "destructive"}>
                  {selectedGroup.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {selectedGroup.description && (
                <p className="mt-1 text-muted-foreground">{selectedGroup.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedGroup.memberCount}/{selectedGroup.maxMembers} members
                </span>
                {selectedGroup.meetingSchedule && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedGroup.meetingSchedule}
                  </span>
                )}
                {selectedGroup.meetingLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedGroup.meetingLocation}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(selectedGroup)}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => confirmDelete(selectedGroup)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Deactivate
              </Button>
            </div>
          </div>

          {/* Add member */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Add Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <select
                  value={addMemberUserId}
                  onChange={(e) => setAddMemberUserId(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a user...</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleAddMember}
                  disabled={!addMemberUserId || addingMember}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  {addingMember ? "Adding..." : "Add"}
                </Button>
              </div>
              {filteredUsers.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  All active users are already in this group.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Members list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <p className="text-sm text-muted-foreground">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => {
                    const initials =
                      (m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "");
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-1">
                        <Avatar>
                          <AvatarFallback className="text-xs">
                            {initials || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {m.role.replace("_", " ")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(m.userId)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* --- Group list view --- */
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Groups</h1>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              New Group
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading groups...</p>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <Users className="h-12 w-12 text-bronze" />
                <p className="text-muted-foreground">
                  No groups yet. Create one to get started.
                </p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <Card
                  key={g.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => openDetail(g)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bronze/10">
                      <Users className="h-5 w-5 text-bronze" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{g.name}</span>
                        <Badge
                          variant={g.isActive ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {g.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {g.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {g.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {g.memberCount}/{g.maxMembers}
                        </span>
                        {g.meetingSchedule && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {g.meetingSchedule}
                          </span>
                        )}
                        {g.meetingLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {g.meetingLocation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(g)}
                        title="Edit group"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => confirmDelete(g)}
                        title="Deactivate group"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Create / Edit dialog --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create a Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Men of Valor"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="A group for men pursuing..."
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meeting Schedule</label>
              <Input
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
                placeholder="Tuesdays at 7 PM"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meeting Location</label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Fellowship Hall, Room 203"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Max Members</label>
              <Input
                type="number"
                min={2}
                max={50}
                value={formMaxMembers}
                onChange={(e) => setFormMaxMembers(Number(e.target.value))}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || saving}
              className="w-full"
            >
              {saving
                ? editingGroup
                  ? "Saving..."
                  : "Creating..."
                : editingGroup
                  ? "Save Changes"
                  : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Delete confirmation dialog --- */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate{" "}
            <span className="font-medium text-foreground">
              {deletingGroup?.name}
            </span>
            ? The group will be hidden from members but data will be preserved.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
