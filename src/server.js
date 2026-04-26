const app = require("./app");
const http = require("http");
const socketSetup = require("./sockets/leaderboardSocket");

const server = http.createServer(app);

socketSetup(server);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});