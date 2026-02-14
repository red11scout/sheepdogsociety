export type UserRole = "admin" | "group_leader" | "asst_leader" | "member";
export type UserStatus = "pending" | "active" | "suspended";

export type AppUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

export type ChannelType = "org" | "leaders" | "group" | "dm";

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  description: string | null;
  groupId: string | null;
  isArchived: boolean;
  createdAt: Date;
};

export type Message = {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  author?: AppUser;
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
  replyCount?: number;
};
