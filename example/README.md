# Chatroom Example

A basic chatroom client-server application using `dynamojs-net` and `ws`.

## Installation

At the top level `DynamoJS-Net` directory, you must run the build script `npm run build` or `yarn build` to generate the transpiled source files.

Run `npm i` or `yarn` here to install the necessary dependencies

## Usage

Run `npm run start-server` and `npm run start-client` to run the server and client side processes respectively.

## Code Architecture

`common.ts` includes common types and the `Signaler` interface implementation needed to set up `Connection` objects. The signaler is implemented using the `WebSocket` protocol.

`client.ts` contains the implementation of the chatroom client. This demonstrates how to setup a connection with a remote peer.

`server.ts` contains the implementation of the chatroom server. This demonstrates how to listen for connections and disconnections from remote peers. It also demonstrates how the client-server model can be replicated using the peer-to-peer model used by the `WebRTC` protocol.