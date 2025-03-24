const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server running');
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Test server running on http://localhost:3001');
}); 