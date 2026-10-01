import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { agentTools, connections, db } from "@openbots/db";
import { jsonSchema, tool } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

function parseArithmetic(expr: string): number {
  let pos = 0;

  function peek(): string {
    while (pos < expr.length && expr[pos] === " ") pos++;
    return expr[pos] ?? "";
  }

  function get(): string {
    while (pos < expr.length && expr[pos] === " ") pos++;
    return expr[pos++] ?? "";
  }

  function parsePrimary(): number {
    const ch = peek();
    if (ch === "+") {
      get();
      return parsePrimary();
    }
    if (ch === "-") {
      get();
      return -parsePrimary();
    }
    if (ch === "(") {
      get();
      const val = parseExpr();
      if (peek() === ")") {
        get();
      } else {
        throw new Error("Mismatched parentheses: expected ')'");
      }
      return val;
    }
    let numStr = "";
    while (peek() && /[0-9.]/.test(peek())) {
      numStr += get();
    }
    if (!numStr) {
      throw new Error(`Unexpected character in expression: '${peek()}'`);
    }
    const n = Number(numStr);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid number: '${numStr}'`);
    }
    return n;
  }

  function parsePower(): number {
    let left = parsePrimary();
    while (peek() === "^") {
      get();
      const right = parsePower();
      left = left ** right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = get();
      const right = parsePower();
      if (op === "*") {
        left *= right;
      } else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      } else if (op === "%") {
        if (right === 0) throw new Error("Modulo by zero");
        left %= right;
      }
    }
    return left;
  }

  function parseExpr(): number {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = get();
      const right = parseTerm();
      if (op === "+") left += right;
      else if (op === "-") left -= right;
    }
    return left;
  }

  const result = parseExpr();
  while (pos < expr.length && expr[pos] === " ") pos++;
  if (pos < expr.length) {
    throw new Error(
      `Unexpected token at position ${pos}: '${expr.slice(pos)}'`,
    );
  }
  return result;
}

export const getCurrentTime = tool({
  description:
    "Get the current date and time with timezone and calendar breakdown. Use this whenever the user asks for the current time, date, day of the week, or year.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe(
        "Optional IANA timezone name (e.g. 'UTC', 'America/New_York', 'Asia/Tokyo'). Defaults to UTC.",
      ),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    const tz = timezone ?? "UTC";
    return {
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: tz,
      formatted: now.toLocaleString("en-US", { timeZone: tz }),
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      seconds: now.getUTCSeconds(),
    };
  },
});

export const calculate = tool({
  description:
    "Safely evaluate a mathematical arithmetic expression without using code evaluation. Supports +, -, *, /, %, ^, parentheses, and decimals.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "Mathematical arithmetic expression to evaluate, e.g. '15 * 3 + 2' or '(100 - 25) / 5'",
      ),
  }),
  execute: async ({ expression }) => {
    try {
      const result = parseArithmetic(expression);
      return {
        expression,
        result,
      };
    } catch (err) {
      return {
        expression,
        error: err instanceof Error ? err.message : "Calculation failed",
      };
    }
  },
});

export const internalTools: Record<string, any> = {
  get_current_time: getCurrentTime,
  calculate: calculate,
};

export interface ResolvedTools {
  tools: Record<string, any>;
  cleanup: () => Promise<void>;
}

export async function buildAgentTools(params: {
  userId: string;
  agentId: string;
}): Promise<ResolvedTools> {
  const { userId, agentId } = params;
  const configuredTools = await db
    .select()
    .from(agentTools)
    .where(and(eq(agentTools.agentId, agentId), eq(agentTools.enabled, true)));

  const activeTools: Record<string, any> = {};
  const cleanupTasks: Array<() => Promise<void>> = [];

  for (const config of configuredTools) {
    if (config.provider === "internal") {
      const found = internalTools[config.toolName];
      if (found) {
        activeTools[config.toolName] = found;
      }
    } else if (config.provider === "composio") {
      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) {
        throw new Error(
          `COMPOSIO_API_KEY is required to execute Composio tool '${config.toolName}'`,
        );
      }

      const composio = new Composio({
        apiKey,
        provider: new VercelProvider(),
      });

      const [existingConn] = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.userId, userId),
            eq(connections.provider, "composio"),
            eq(connections.status, "active"),
          ),
        );

      let session: any = null;
      if (existingConn?.externalAccountId) {
        try {
          session = await composio.use(existingConn.externalAccountId);
        } catch {
          session = null;
        }
      }

      if (!session) {
        session = await composio.create(userId, {
          sandbox: { enable: false },
          manageConnections: true,
        });

        if (existingConn) {
          await db
            .update(connections)
            .set({
              externalAccountId: session.sessionId,
              updatedAt: new Date(),
            })
            .where(eq(connections.id, existingConn.id));
        } else {
          await db.insert(connections).values({
            userId,
            provider: "composio",
            externalAccountId: session.sessionId,
            status: "active",
          });
        }
      }

      const composioTools = (await session.tools()) as Record<
        string,
        ReturnType<typeof tool>
      >;
      const matched = composioTools[config.toolName];
      if (matched) {
        activeTools[config.toolName] = matched;
      }
    } else if (config.provider === "mcp") {
      const mcpConfig = config.config as { url?: string } | null;
      if (!mcpConfig?.url) {
        throw new Error(
          `MCP tool '${config.toolName}' requires a server URL in configuration`,
        );
      }

      const client = new Client({
        name: "openbots-agent",
        version: "1.0.0",
      });

      const transport = new StreamableHTTPClientTransport(
        new URL(mcpConfig.url),
      );
      await client.connect(transport);
      cleanupTasks.push(async () => {
        try {
          await client.close();
        } catch {
          // Ignore transport close errors
        }
      });

      const { tools: mcpToolsList } = await client.listTools();
      const targetMcpTool = mcpToolsList.find(
        (t) => t.name === config.toolName,
      );

      if (targetMcpTool) {
        activeTools[config.toolName] = tool({
          description: targetMcpTool.description ?? "",
          inputSchema: jsonSchema(targetMcpTool.inputSchema as any),
          execute: async (args: any) => {
            const callRes = await client.callTool({
              name: targetMcpTool.name,
              arguments: args,
            });
            return callRes;
          },
        });
      }
    }
  }

  return {
    tools: activeTools,
    cleanup: async () => {
      for (const cleanup of cleanupTasks) {
        await cleanup();
      }
    },
  };
}
