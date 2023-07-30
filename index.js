import { io } from "socket.io-client";

let socket;

const urls = {
  80001: "wss://mumbai.vrf.sh",
  42161: "wss://arb-one.vrf.sh",
  42170: "wss://nova.vrf.sh",
  421613: "wss://arb-goerli.vrf.sh"
}

const connect = (chainId) => {
  if (urls[chainId] === undefined) throw new Error(`Randomizer Sequencer: Chain ID ${chainId} not supported`)
  socket = io(urls[chainId]);
  return socket;
}
/**
 * Listens for a result preview emitted by the Randomizer Sequencer websocket.
 * 
 * @async
 * @function listenForPreview
 * @param {number} id - The Randomizer request id to listen for
 * @param {number} chainId - The numerical chain id to connect to the right Sequencer server
 * @return {Promise<string>}
 */
export const listenForPreview = async (id, chainId) => {
  return new Promise((resolve, reject) => {
    if (!socket) socket = connect(chainId);
    socket.on("connect", () => {
      console.log("connected");
    });

    socket.emit("listenForPreview", id);
    socket.on("complete", (data) => {
      if (data.id === id) {
        resolve(data.result);
      }
    });
  });
}