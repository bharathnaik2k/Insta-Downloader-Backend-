const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Instagram Reels Downloader (yt-dlp backend) is running!');
});

// Basic validation to prevent abuse 
const isValidInstagramUrl = (url) => {
    const igRegex = /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[\w-]+\/?/;
    return igRegex.test(url);
};

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, message: 'Instagram URL is required' });
    }

    if (!isValidInstagramUrl(url)) {
        return res.status(400).json({ success: false, message: 'Invalid Instagram URL provided.' });
    }

    console.log(`Processing download using yt-dlp for: ${url}`);

    try {
        // spawn helps prevent command injection natively by isolating the arguments
        const ytProcess = spawn('yt-dlp', ['-j', '--no-warnings', url]);

        let stdoutData = '';
        let stderrData = '';

        ytProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        ytProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        // Set a strict timeout to prevent the server from hanging (e.g. 20 seconds)
        const timeoutId = setTimeout(() => {
            ytProcess.kill('SIGKILL');
            if (!res.headersSent) {
                res.status(504).json({ success: false, message: 'Extraction timed out. Instagram might be rate limiting.' });
            }
        }, 20000);

        ytProcess.on('close', (code) => {
            clearTimeout(timeoutId);

            if (res.headersSent) return;

            if (code !== 0) {
                console.error(`yt-dlp error: ${stderrData}`);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to extract video. It might be private or blocked by Instagram.',
                    error: stderrData.slice(0, 200)
                });
            }

            try {
                // Parse the JSON output safely 
                // Using .split('\n') safeguards against playlists returning multiple staggered JSON objects
                const firstJsonString = stdoutData.split('\n').find(line => line.trim().startsWith('{'));
                if (!firstJsonString) throw new Error("No valid JSON found in yt-dlp output.");

                const videoData = JSON.parse(firstJsonString);

                // Build exactly what the Flutter frontend expects
                return res.json({
                    success: true,
                    video_url: videoData.url || (videoData.requested_downloads ? videoData.requested_downloads[0].url : ''),
                    thumbnail: videoData.thumbnail || '',
                    title: videoData.title || videoData.fulltitle || 'Instagram Reel'
                });

            } catch (err) {
                console.error('JSON Parse Error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to parse video info from yt-dlp.' 
                });
            }
        });

        ytProcess.on('error', (err) => {
            clearTimeout(timeoutId);
            if (res.headersSent) return;
            
            console.error('Spawn Error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error: yt-dlp is not installed or failed to start.' 
            });
        });

    } catch (error) {
        console.error(`[Fatal Error]:`, error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'An unexpected server error occurred.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend API live at http://localhost:${PORT}`);
});
