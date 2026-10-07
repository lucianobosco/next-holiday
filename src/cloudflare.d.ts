// The two pieces of the Workers runtime that src/middleware.ts uses, typed here rather than
// pulling in @cloudflare/workers-types for the whole project.
declare module "cloudflare:workers" {
  export const cache: { purge(options: { purgeEverything: true }): Promise<unknown> } | undefined;
}
interface CacheStorage {
  readonly default: Cache;
}
