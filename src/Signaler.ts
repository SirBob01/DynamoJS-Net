import wrtc from 'isomorphic-webrtc';

/**
 * RTC signaling events to be handled by the caller
 */
interface SignalingActions {
  /**
   * Receive an offer
   */
  offer: wrtc.RTCSessionDescription | null;

  /**
   * Receive an answer
   */
  answer: wrtc.RTCSessionDescriptionInit;

  /**
   * Receive an ICE candidate
   */
  ice: wrtc.RTCIceCandidate;
}

/**
 * Message passed and received by the signaler
 */
interface SignalingMessage {
  /**
   * Action to be taken
   */
  action: keyof SignalingActions;

  /**
   * Payload
   */
  data: SignalingActions[keyof SignalingActions];
}

/**
 * Signaler service needs to provide reliable bi-direcetional communication (e.g., WebSocket)
 */
interface Signaler {
  /**
   * Send a network event
   *
   * @param message Signaling message
   */
  send(message: SignalingMessage): void;

  /**
   * Listen for network events
   *
   * @param handler Handler function to process received message
   */
  listen(handler: (message: SignalingMessage) => void): void;
}

export type { Signaler, SignalingMessage };
