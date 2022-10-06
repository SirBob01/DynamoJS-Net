/**
 * Configuration for creating RTC data channels
 */
interface ChannelConfiguration {
  /**
   * Unique identifier for the channel
   */
  id: number;

  /**
   * Packets will be received in order
   */
  ordered: boolean;

  /**
   * Maximum times packets will be retransmitted until
   * they arrive at the other side
   *
   * If not provided, there is no upper limit and browser will keep trying
   */
  maxRetransmits?: number;
}

/**
 * Communication channels
 */
type ChannelMap<Channel extends string> = Record<Channel, ChannelConfiguration>;

export type { ChannelConfiguration, ChannelMap };
