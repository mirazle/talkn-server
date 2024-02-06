import net from 'net';

export const getOpenPort = (startingPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const checkPort = (port: number) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => {
          resolve(port);
        });
        server.close();
      });

      server.on('error', (err: { code: string }) => {
        if (err.code === 'EADDRINUSE') {
          checkPort(port + 1);
        } else {
          throw 'ERROR: BAD IO PORT.';
        }
      });
    };
    checkPort(startingPort);
  });
};
