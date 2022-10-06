import { SignalingMessage } from 'dynamojs-net';
import WebSocket from 'ws'

class WSSignaler {
  socket: WebSocket;

  /**
   * WebRTC signaler using the WebSocket interface
   *
   * @param socket WebSocket instance
   */
  constructor(socket: WebSocket) {
    this.socket = socket;
  }

  send(message: SignalingMessage) {
    this.socket.send(JSON.stringify(message));
  }

  listen(handler: (message: SignalingMessage) => void) {
    this.socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      handler(message);
    });
  }
}

/**
 * Define the communication channels
 */
const channelConfigs = {
  default: {
    id: 0,
    ordered: true,
  }
}
type NetworkChannels = keyof typeof channelConfigs;

/**
 * Client to server network events
 */
interface ClientToServerEvents {
  /**
   * Send a message to the server to be broadcast
   */
  message: (message: string) => void;

  /**
   * Tell the server to set name
   */
  setName: (name: string) => void;
}

/**
 * Server to client network events
 */
interface ServerToClientEvents {
  /**
   * Send a message to a client
   */
  message: (message: string) => void;

  /**
   * Tell a client to start sending / receiving messages
   */
  start: (name: string) => void;
}

export { WSSignaler, channelConfigs };
export type { NetworkChannels, ClientToServerEvents, ServerToClientEvents };
