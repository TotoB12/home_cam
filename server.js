/****************************************************
 * server.js
 ****************************************************/

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Route for homepage
app.get('/', (req, res) => {
  // Render the HTML (you could also just rely on express.static, but this is fine)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for streaming the webcam
app.get('/stream', (req, res) => {
  // HTTP headers for MJPEG streaming
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
  });

  // Spawn an FFmpeg process
  // This command:
  //    - Takes input from the webcam at /dev/video0 (adjust if yours differs)
  //    - Scales it to 640x480 (change as needed)
  //    - Outputs an MJPEG stream to stdout
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'v4l2',
    '-i', '/dev/video0',
    '-vf', 'scale=640:480',
    '-f', 'mjpeg',
    'pipe:1'
  ]);

  // When FFmpeg provides data (a chunk of the MJPEG stream), write it to the response
  ffmpeg.stdout.on('data', (chunk) => {
    res.write(`--frame\r\n`);
    res.write(`Content-Type: image/jpeg\r\n`);
    res.write(`Content-Length: ${chunk.length}\r\n`);
    res.write('\r\n');
    res.write(chunk, 'binary');
    res.write('\r\n');
  });

  // If FFmpeg outputs any errors, log them
  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
  });

  // When the client closes the connection, stop FFmpeg
  req.on('close', () => {
    ffmpeg.kill('SIGINT');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Use CTRL+C to stop the server.`);
});
