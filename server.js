const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Instagram Reels Downloader API is running! Send a POST request to /download to fetch a reel.');
});

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, message: 'Instagram URL is required' });
    }

    try {
        console.log(`Fetching from RapidAPI... URL: ${url}`);
        // Use the exact RapidAPI provider you are subscribed to
        const response = await axios.get('https://instagram-reels-downloader-api.p.rapidapi.com/download', {
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': '172d89556dmshb888b16d261849ep18c41ejsn831a887c4693',
                'X-RapidAPI-Host': 'instagram-reels-downloader-api.p.rapidapi.com'
            }
        });

        const data = response.data;
        let videoUrl = '';
        let thumbnailUrl = '';
        
        // Dynamically find the video URL depending on how this specific API formats it
        if (data) {
            // Priority check for common JSON fields
            videoUrl = 
              data.video_url || 
              data.download_url || 
              data.url || 
              (data.media && data.media[0] ? data.media[0] : null) ||
              (data.data && data.data.video_url);

            thumbnailUrl = data.thumbnail || data.thumbnail_src || data.cover || '';

            // Extreme fallback: Search entire JSON object for an MP4 link if structure is completely unknown
            if (!videoUrl && typeof data === 'object') {
                const strData = JSON.stringify(data);
                const mp4Match = strData.match(/"(https:\/\/[^"]*\.mp4[^"]*)"/);
                if (mp4Match && mp4Match[1]) {
                    videoUrl = mp4Match[1].replace(/\\u0026/g, "&"); // clean escaped characters
                }
            }
        }

        if (videoUrl) {
            return res.json({
                success: true,
                video_url: videoUrl,
                thumbnail: thumbnailUrl
            });
        } else {
             return res.status(404).json({ 
                 success: false, 
                 message: 'Could not extract video. Raw API response: ' + JSON.stringify(data).substring(0, 100) 
             });
        }
    } catch (error) {
        console.error(`[Error RapidAPI]:`, error.response ? error.response.data : error.message);
        
        return res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || 'An error occurred while fetching via RapidAPI. Verify your subscription.',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend API live at http://localhost:${PORT}`);
});


// const express = require('express');
// const axios = require('axios');
// const cors = require('cors');

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT || 3001;

// // Utility to parse IG URL
// const getShortcode = (url) => {
//     try {
//         const urlObj = new URL(url);
//         const parts = urlObj.pathname.split('/').filter(Boolean);
//         if (parts.length >= 2 && (parts[0] === 'reel' || parts[0] === 'p' || parts[0] === 'tv')) {
//             return parts[1];
//         }
//         return null;
//     } catch (e) {
//         return null;
//     }
// };

// const userAgents = [
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
// ];

// // Helper for scraping public reels
// async function scrapeInstagramReel(shortcode) {
//     const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
//     const url = `https://www.instagram.com/reel/${shortcode}/`;

//     const response = await axios.get(url, {
//         headers: {
//             'User-Agent': userAgent,
//             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//             'Accept-Language': 'en-US,en;q=0.5',
//             'Connection': 'keep-alive',
//             'Upgrade-Insecure-Requests': '1',
//             'Sec-Fetch-Dest': 'document',
//         },
//         timeout: 10000
//     });

//     const html = response.data;

//     // Attempt 1: Look for Open-Graph Video tags
//     let videoMatch = html.match(/<meta property="og:video" content="(.*?)"/);
//     let imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);

//     if (videoMatch && videoMatch[1]) {
//         return {
//             video_url: videoMatch[1].replace(/&amp;/g, '&'),
//             thumbnail: imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : ''
//         };
//     }

//     throw new Error('Video URL not found in meta tags. The content might be private or blocked.');
// }

// app.post('/download', async (req, res) => {
//     const { url } = req.body;

//     if (!url) {
//         return res.status(400).json({ success: false, message: 'Instagram URL is required' });
//     }

//     const shortcode = getShortcode(url);
//     if (!shortcode) {
//         return res.status(400).json({ success: false, message: 'Invalid Instagram URL provided.' });
//     }

//     try {
//         const data = await scrapeInstagramReel(shortcode);

//         return res.json({
//             success: true,
//             video_url: data.video_url,
//             thumbnail: data.thumbnail
//         });
//     } catch (error) {
//         console.error(`[Error]: ${error.message}`);
//         // Often Instagram returns 302/Login page if scraping is detected
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to extract video. Make sure the account is public.'
//         });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Backend API live at http://localhost:${PORT}`);
// });
