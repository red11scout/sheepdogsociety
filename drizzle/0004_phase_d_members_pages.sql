CREATE TYPE "public"."member_intent" AS ENUM('join', 'start', 'just_keep_posted');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('new', 'reviewed', 'contacted', 'connected', 'needs_followup', 'not_a_fit', 'archived');--> statement-breakpoint
CREATE TYPE "public"."member_timeline" AS ENUM('now', 'three_months', 'exploring');--> statement-breakpoint
CREATE TYPE "public"."page_status_v2" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "admin_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tour_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"last_seen_changelog" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_notification_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"wants_newsletter" boolean DEFAULT true NOT NULL,
	"wants_events" boolean DEFAULT true NOT NULL,
	"wants_sms" boolean DEFAULT false NOT NULL,
	"sms_consent_at" timestamp with time zone,
	"sms_consent_ip" text,
	"sms_consent_user_agent" text,
	"sms_consent_text_shown" text,
	"sms_double_opt_in_at" timestamp with time zone,
	"email_unsubscribe_token" text NOT NULL,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_notification_prefs_email_unsubscribe_token_unique" UNIQUE("email_unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"intent" "member_intent" NOT NULL,
	"group_id" uuid,
	"city" text,
	"state" text,
	"zip" text,
	"timeline" "member_timeline",
	"status" "member_status" DEFAULT 'new' NOT NULL,
	"source" text,
	"note" text,
	"admin_note" text,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"blocks" jsonb NOT NULL,
	"seo" jsonb NOT NULL,
	"saved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "page_status_v2" DEFAULT 'draft' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "admin_prefs" ADD CONSTRAINT "admin_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notification_prefs" ADD CONSTRAINT "member_notification_prefs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_saved_by_users_id_fk" FOREIGN KEY ("saved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_active_unique" ON "members" USING btree ("email") WHERE "members"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_group_idx" ON "members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "members_created_idx" ON "members" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_active_unique" ON "pages" USING btree ("slug") WHERE "pages"."deleted_at" IS NULL;