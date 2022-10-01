/**
 * Configuration for creating RTC data channels
 */
interface ChannelConfiguration {
  /**
   * Unique identifier for the channel
   */
  id: number;

  /**
   * Packets will be retransmitted until they arrive
   * at the other side
   */
  reliable: boolean;

  /**
   * Packets will be received in order
   */
  ordered: boolean;
}

/**
 * Communication channels
 */
type ChannelMap<Channel extends string> = Record<Channel, ChannelConfiguration>;

export type { ChannelConfiguration, ChannelMap };
