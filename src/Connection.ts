import { encode, decode } from 'msgpack-lite';
import { ChannelMap } from './Channel';
import { EventMap, Message } from './Event';
import wrtc from 'isomorphic-webrtc';
import { Signaler } from './Signaler';

/**
 * Configuration for setting up a connection
 */
interface ConnectionConfiguration<Channel extends string> {
  iceServers: wrtc.RTCIceServer[] | undefined;
  channels: ChannelMap<Channel>;
}

class Connection<
  Channel extends string,
  ListenEvent extends EventMap,
  EmitEvent extends EventMap
> {
  /**
   * Peer connection
   */
  private peer: wrtc.RTCPeerConnection;

  /**
   * Data channels
   */
  private channels: Map<Channel, wrtc.RTCDataChannel>;

  /**
   * Handlers to remove event listeners
   */
  private removeListenerHandlers: Map<
    Channel,
    Map<keyof ListenEvent, Map<ListenEvent[keyof ListenEvent], () => void>>
  >;

  /**
   * Create a new connection instance
   */
  protected constructor(
    iceServers: wrtc.RTCIceServer[] | undefined,
    channelConfigs: ChannelMap<Channel>,
    onReady: (connection: Connection<Channel, ListenEvent, EmitEvent>) => void
  ) {
    this.peer = new wrtc.RTCPeerConnection({ iceServers });
    this.channels = new Map();
    this.removeListenerHandlers = new Map();

    const statuses = new Map<Channel, boolean>();
    for (const name in channelConfigs) {
      const { id, reliable, ordered } = channelConfigs[name];
      const negotiated = true;
      const maxRetransmits = reliable ? undefined : 0;
      const channel = this.peer.createDataChannel(name, {
        ordered,
        maxRetransmits,
        negotiated,
        id,
      });
      this.channels.set(name, channel);
      statuses.set(name, false);
    }

    // Calls onReady once all channels are open
    this.channels.forEach((channel, name) => {
      channel.addEventListener('open', () => {
        statuses.set(name, true);

        let allOpen = true;
        statuses.forEach((status) => {
          allOpen &&= status;
        });
        if (allOpen) onReady(this);
      });
    });
  }

  /**
   * Create a new connection caller
   *
   * @param signaler Signaling service
   * @param config   Connection configuration
   */
  static createCall<
    Channel extends string,
    ListenEvent extends EventMap = EventMap,
    EmitEvent extends EventMap = EventMap
  >(signaler: Signaler, config: ConnectionConfiguration<Channel>) {
    return new Promise(
      (
        resolve: (
          connection: Connection<Channel, ListenEvent, EmitEvent>
        ) => void,
        reject: (error: Error | undefined) => void
      ) => {
        const connection = new Connection(
          config.iceServers,
          config.channels,
          resolve
        );

        // Attach signaling listeners
        signaler.listen(async (message) => {
          if (message.action === 'offer' && message.data) {
            const sdp = message.data;
            const description = new wrtc.RTCSessionDescription(sdp);
            connection.peer.setRemoteDescription(description);

            const answer = await connection.peer.createAnswer();
            connection.peer.setLocalDescription(answer);
            signaler.send({
              action: 'answer',
              data: answer,
            });
          } else if (message.action === 'ice') {
            const candidate = message.data;
            try {
              await connection.peer.addIceCandidate(candidate);
            } catch (err) {
              reject(new Error('Could not add ICE candidate'));
            }
          }
        });

        // Attach RTC listeners
        connection.peer.addEventListener('connectionstatechange', () => {
          switch (connection.peer.connectionState) {
            case 'failed':
              reject(new Error('Failed to establish RTC connection'));
              break;
            default:
              break;
          }
        });
        connection.peer.addEventListener(
          'icecandidate',
          (event: wrtc.RTCPeerConnectionIceEvent) => {
            const { candidate } = event;
            if (candidate) {
              signaler.send({
                action: 'ice',
                data: candidate,
              });
            }
          }
        );
      }
    );
  }

  /**
   * Create a new connection receiver
   *
   * @param signaler Signaling service
   * @param config   Connection configuration
   */
  static createRecv<
    Channel extends string,
    ListenEvent extends EventMap = EventMap,
    EmitEvent extends EventMap = EventMap
  >(signaler: Signaler, config: ConnectionConfiguration<Channel>) {
    return new Promise(
      (
        resolve: (
          connection: Connection<Channel, ListenEvent, EmitEvent>
        ) => void,
        reject: (error: Error | undefined) => void
      ) => {
        const connection = new Connection(
          config.iceServers,
          config.channels,
          resolve
        );

        // Attach signaler events
        signaler.listen(async (message) => {
          if (message.action === 'answer') {
            const answer = message.data;
            const description = new wrtc.RTCSessionDescription(answer);
            await connection.peer.setRemoteDescription(description);
          } else if (message.action === 'ice') {
            const candidate = message.data;
            try {
              await connection.peer.addIceCandidate(candidate);
            } catch (err) {
              reject(new Error('Could not add ICE candidate'));
            }
          }
        });

        // Attach RTC listeners
        connection.peer.addEventListener('connectionstatechange', () => {
          switch (connection.peer.connectionState) {
            case 'failed':
              reject(new Error('Failed to establish RTC connection'));
              break;
            default:
              break;
          }
        });
        connection.peer.addEventListener(
          'icecandidate',
          (event: wrtc.RTCPeerConnectionIceEvent) => {
            const { candidate } = event;
            if (candidate) {
              signaler.send({
                action: 'ice',
                data: candidate,
              });
            }
          }
        );

        // Initiate the signaling process by sending an offer to the server
        connection.peer
          .createOffer()
          .then((offer: wrtc.RTCLocalSessionDescriptionInit) => {
            return connection.peer.setLocalDescription(offer);
          })
          .then(() => {
            signaler.send({
              action: 'offer',
              data: connection.peer.localDescription,
            });
          });
      }
    );
  }

  /**
   * Remove all network event listeners
   */
  private removeAllListeners() {
    this.removeListenerHandlers.forEach((eventMap) => {
      eventMap.forEach((handlerMap) => {
        handlerMap.forEach((remove) => remove());
        handlerMap.clear();
      });
    });
  }

  /**
   * Remove all network event listeners from a channel
   *
   * @param channel Name of channel to clear
   */
  private removeAllListenersChannel(channel: Channel) {
    this.removeListenerHandlers.get(channel)?.forEach((handlerMap) => {
      handlerMap.forEach((remove) => remove());
      handlerMap.clear();
    });
  }

  /**
   * Remove all network event listeners from a channel and event
   *
   * @param channel Name of channel to clear
   * @param event   Name of network event to clear
   */
  private removeAllListenersChannelEvent<Event extends keyof ListenEvent>(
    channel: Channel,
    event: Event
  ) {
    const handlerMap = this.removeListenerHandlers.get(channel)?.get(event);
    handlerMap?.forEach((remove) => remove());
    handlerMap?.clear();
  }

  /**
   * Get the wrtc.RTCDataChannel
   *
   * @param name
   */
  getChannel(name: Channel) {
    return this.channels.get(name);
  }

  /**
   * Emit an event via a channel
   *
   * @param channel Name of the data channel to send through
   * @param event   Name of the event
   * @param data    Any data related to this event
   */
  emit<Event extends keyof EmitEvent>(
    channel: Channel,
    event: Event,
    ...data: Parameters<EmitEvent[Event]>
  ) {
    const message = encode({ event, data });
    this.getChannel(channel)?.send(message);
  }

  /**
   * Listen for an event
   *
   * @param event   Name of the event
   * @param handler Received data handler function
   */
  on<Event extends keyof ListenEvent>(
    channel: Channel,
    event: Event,
    handler: ListenEvent[Event]
  ) {
    const channelObject = this.getChannel(channel);
    if (!channelObject) return;

    // Attach the listener
    const listener = (ev: { data: Buffer }) => {
      const message: Message<ListenEvent> = decode(new Uint8Array(ev.data));
      if (event === message.event) {
        handler(...message.data);
      }
    };
    channelObject.addEventListener('message', listener);

    // Register a remove listener handler
    let eventMap = this.removeListenerHandlers.get(channel);
    if (!eventMap) {
      eventMap = new Map();
      this.removeListenerHandlers.set(channel, eventMap);
    }
    let handlerMap = eventMap.get(event);
    if (!handlerMap) {
      handlerMap = new Map();
      eventMap.set(event, handlerMap);
    }
    handlerMap.set(handler, () => {
      channelObject.removeEventListener('message', listener);
    });
  }

  /**
   * Remove network event listeners
   *
   * Ommitting the handler will remove all listeners under channel -> event
   * Ommitting handler and event will remove all listeners under channel
   * Ommitting channel, event, and handler will remove all listeners on this connection
   *
   * @param channel Name of data channel listened on
   * @param event   Name of the event
   * @param handler Received data handler function
   */
  removeListener<Event extends keyof ListenEvent>(
    channel?: Channel,
    event?: Event,
    handler?: ListenEvent[Event]
  ) {
    if (!channel) {
      // Remove all listeners
      this.removeAllListeners();
    } else if (!event) {
      // Remove all listeners under channel
      this.removeAllListenersChannel(channel);
    } else if (!handler) {
      // Remove all listeners under (channel -> event)
      this.removeAllListenersChannelEvent(channel, event);
    } else {
      // Remove specific listener (channel -> event -> handler)
      const handlerMap = this.removeListenerHandlers.get(channel)?.get(event);
      handlerMap?.get(handler)?.();
      handlerMap?.delete(handler);
    }
  }
}

export default Connection;