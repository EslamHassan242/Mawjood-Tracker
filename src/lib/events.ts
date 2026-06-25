import { EventEmitter } from "events";

// Avoid creating multiple event emitters in development due to hot reloading
const globalForEvents = global as unknown as {
  events: EventEmitter;
};

export const events = globalForEvents.events || new EventEmitter();

// Increase max listeners to handle multiple simultaneous admin dashboard connections
events.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.events = events;
}
