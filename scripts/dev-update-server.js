const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'C:\\temp\\updates';
const port = Number(process.argv[3] || 9000);

http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, rel);
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
            'Content-Length': data.length,
            'Cache-Control': 'no-store',
        });
        res.end(data);
    });
}).listen(port, () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
