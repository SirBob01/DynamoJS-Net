import WebSocket from 'ws';
import Connection from 'dynamojs-net';
import { createInterface } from 'readline';
import { channelConfigs, NetworkChannels, ServerToClientEvents, ClientToServerEvents, WSSignaler } from './common';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Create a new connection
const socket = new WebSocket('ws://localhost:8080');
Connection.createCall<NetworkChannels, ServerToClientEvents, ClientToServerEvents>(
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
  // Input handler
  const handleInput = () => {
    readline.question('>> ', (answer) => {
      connection.emit('default', 'message', answer);
      readline.prompt(true);
      handleInput();
    });
  }

  // Add network event listeners
  connection.on('default', 'message', (message) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    // eslint-disable-next-line no-console
    console.log(message);
    readline.prompt(true);
  });
  connection.on('default', 'start', () => {
    handleInput();
  });

  // Begin
  readline.question('What is your name? ', (answer) => {
    connection.emit('default', 'setName', answer);
    readline.prompt(true);
  });
})
// eslint-disable-next-line no-console
.catch(console.error);
