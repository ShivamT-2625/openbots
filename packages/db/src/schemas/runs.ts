import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { user } from "./auth.js";
import { conversations } from "./conversations.js";
import { runSteps } from "./run-steps.js";

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "cancelled",
]);

export const runTriggerTypeEnum = pgEnum("run_trigger_type", [
  "manual",
  "schedule",
  "event",
  "webhook",
]);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    status: runStatusEnum("status").notNull().default("queued"),
    triggerType: runTriggerTypeEnum("trigger_type").notNull().default("manual"),
    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("runs_user_id_idx").on(table.userId),
    index("runs_agent_id_idx").on(table.agentId),
    index("runs_conversation_id_idx").on(table.conversationId),
    index("runs_status_idx").on(table.status),
    index("runs_created_at_idx").on(table.createdAt),
  ],
);

export const runsRelations = relations(runs, ({ one, many }) => ({
  user: one(user, {
    fields: [runs.userId],
    references: [user.id],
  }),
  agent: one(agents, {
    fields: [runs.agentId],
    references: [agents.id],
  }),
  conversation: one(conversations, {
    fields: [runs.conversationId],
    references: [conversations.id],
  }),
  steps: many(runSteps),
}));

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
