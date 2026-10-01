import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { runs } from "./runs.js";

export const runStepTypeEnum = pgEnum("run_step_type", ["model", "tool"]);

export const runStepStatusEnum = pgEnum("run_step_status", [
  "running",
  "completed",
  "failed",
]);

export const runSteps = pgTable(
  "run_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    type: runStepTypeEnum("type").notNull(),
    status: runStepStatusEnum("status").notNull().default("running"),
    model: text("model"),
    input: jsonb("input"),
    output: jsonb("output"),
    toolName: text("tool_name"),
    toolCallId: text("tool_call_id"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("run_steps_run_id_step_number_idx").on(table.runId, table.stepNumber),
    unique("run_steps_run_id_step_number_unique").on(
      table.runId,
      table.stepNumber,
    ),
  ],
);

export const runStepsRelations = relations(runSteps, ({ one }) => ({
  run: one(runs, {
    fields: [runSteps.runId],
    references: [runs.id],
  }),
}));

export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;
