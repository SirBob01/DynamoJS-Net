import WebSocket from 'ws';
import Connection from 'dynamojs-net';
import { channelConfigs, NetworkChannels, ClientToServerEvents, ServerToClientEvents, WSSignaler } from './common';

// Maintain a list of connections
const connections: Map<Connection<NetworkChannels, ClientToServerEvents, ServerToClientEvents>, string> = new Map();

// Create a WebSocket server instance to manage the signaling process
const io = new WebSocket.Server({ port: 8080 });
io.on('connection', (socket) => {
  Connection.createRecv<NetworkChannels, ClientToServerEvents, ServerToClientEvents>(
    new WSSignaler(socket),
    {
      channels: channelConfigs,
      iceServers: [
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
      ]
    }
  )
  .then((connection) => {
    // Handle setting the name of a new connection
    connection.on('default', 'setName', (name) => {
      connections.set(connection, name);
      connections.forEach((_, client) => {
        client.emit('default', 'message', `${name} has joined the chatroom.`);
      });
      connection.emit('default', 'start', name);
    });
    
    // Handle broadcasting a sent message
    connection.on('default', 'message', (message) => {
      const from = connections.get(connection);

      // Broadcast message to all other clients
      connections.forEach((_, client) => {
        if (client !== connection) {
          client.emit('default', 'message', `${from}: ${message}`);
        }
      });
    });
    
    // Handle disconnections
    connection.addDisconnectHandler(() => {
      const name = connections.get(connection);
      connections.delete(connection);
      connections.forEach((_, client) => {
        client.emit('default', 'message', `${name} has left the chatroom.`);
      });
    });
  })
  // eslint-disable-next-line no-console
  .catch(console.error);
});
