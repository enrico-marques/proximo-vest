import { AsyncLocalStorage } from "node:async_hooks";

// The Next.js server runtime installs this global; some next/* modules expect it at import time.
const g = globalThis as typeof globalThis & { AsyncLocalStorage?: typeof AsyncLocalStorage };
g.AsyncLocalStorage ??= AsyncLocalStorage;
