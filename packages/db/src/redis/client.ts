import { Redis } from "@upstash/redis";

function getRedisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required",
    );
  }
  return { url, token };
}

let instance: Redis | null = null;

export function getRedis(): Redis {
  if (!instance) {
    const { url, token } = getRedisCredentials();
    instance = new Redis({ url, token });
  }
  return instance;
}

export type { Redis };
