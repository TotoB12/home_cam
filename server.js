const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
    });

    const ffmpeg = spawn('ffmpeg', [
        '-f', 'v4l2',
        '-i', '/dev/video0',
        '-vf', 'scale=640:480',
        '-f', 'mjpeg',
        'pipe:1'
    ]);

    ffmpeg.stdout.on('data', (chunk) => {
        res.write(`--frame\r\n`);
        res.write(`Content-Type: image/jpeg\r\n`);
        res.write(`Content-Length: ${chunk.length}\r\n`);
        res.write('\r\n');
        res.write(chunk, 'binary');
        res.write('\r\n');
    });

    ffmpeg.stderr.on('data', (data) => {
        console.error(`FFmpeg stderr: ${data}`);
    });

    req.on('close', () => {
        ffmpeg.kill('SIGINT');
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Use CTRL+C to stop the server.`);
});
