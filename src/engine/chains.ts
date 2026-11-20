// Event chains: stories in three steps, where the second and third depend on what was chosen before.
// A step schedules the next with later(...) from eventkit.ts; steps after the first have chance 0.
import type { EventDef } from './eventkit';

export const CHAIN_EVENTS: EventDef[] = [];
