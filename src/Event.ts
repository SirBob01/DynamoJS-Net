/**
 * Communication events
 */
type EventMap = Record<string, any>;

/**
 * Message type
 */
interface Message<Event extends EventMap> {
  /**
   * Name of the event
   */
  event: keyof Event;

  /**
   * Data for the event
   */
  data: any[];
}

export type { EventMap, Message };
