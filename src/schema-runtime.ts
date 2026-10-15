import { z } from "zod";

// Disable capability probes as well as JIT compilation under the production CSP.
z.config({ jitless: true });
