import dgram, { RemoteInfo } from "dgram";
import { AddressInfo } from "net";

export function createUdpServer(port: number = 8888) {
  const socket = dgram.createSocket("udp4");

  socket.on("listening", () => {
    const address = socket.address() as AddressInfo;
    console.log(`UDP socket listening on ${address.address}:${address.port}`);
  });

  socket.on("message", (message: Buffer, remote: RemoteInfo) => {
    try {
      const msg = message.length ? JSON.parse(message.toString()) : {};

      if (msg.type === "presence") {
        console.log(`Presence from ${remote.address}`);
        socket.send(
          Buffer.from(JSON.stringify({ type: "ack" })),
          8889,
          remote.address
        );
      }
    } catch (error) {
      // Ignore JSON parsing errors
      console.error("UDP message parsing error:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("UDP socket error:", error);
  });

  socket.bind(port);

  return socket;
}
