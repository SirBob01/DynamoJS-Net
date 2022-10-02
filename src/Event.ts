/**
 * Communication events
 */
type EventMap = Record<string, any>;

/**
 * Message type
 */
type Message<Event extends EventMap> = [keyof Event, any[]];

export type { EventMap, Message };
