const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Screenshot endpoint
app.post('/screenshot', async (req, res) => {
    let browser;
    try {
        const { targetUrl, viewport = 'desktop' } = req.body;

        if (!targetUrl) {
            return res.status(400).json({ error: 'targetUrl is required' });
        }

        // Validate URL
        try {
            const url = new URL(targetUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ error: 'Invalid protocol' });
            }

            const hostname = url.hostname;
            // Basic SSRF protection
            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '::1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)
            ) {
                return res.status(403).json({ error: 'Access to local network is restricted' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set viewport
        const isMobile = viewport === 'mobile';
        const width = isMobile ? 375 : 1280;
        const MAX_HEIGHT = 3000;

        await page.setViewport({
            width: width,
            height: 800,
            deviceScaleFactor: 1,
            isMobile: isMobile,
            hasTouch: isMobile
        });

        // Navigate to URL
        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        if (!response) {
            await browser.close();
            return res.status(500).json({ error: 'Failed to load page' });
        }

        // Check headers for iframe compatibility
        const headers = response.headers();
        const xFrameOptions = headers['x-frame-options'];
        const csp = headers['content-security-policy'];

        let isIframeAllowed = true;
        if (xFrameOptions && (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase() === 'sameorigin')) {
            isIframeAllowed = false;
        }
        if (csp && csp.includes("frame-ancestors 'none'")) {
            isIframeAllowed = false;
        }

        // Get page dimensions
        const dimensions = await page.evaluate(() => {
            return {
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
            };
        });

        // Limit height
        const captureHeight = Math.min(dimensions.height, MAX_HEIGHT);

        // Resize viewport to capture content
        await page.setViewport({
            width: width,
            height: captureHeight,
            deviceScaleFactor: 1,
            isMobile: isMobile,
            hasTouch: isMobile
        });

        // Take screenshot
        const screenshotBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 60,
            encoding: 'binary',
            clip: {
                x: 0,
                y: 0,
                width: width,
                height: captureHeight
            }
        });

        await browser.close();

        // Convert to base64
        const base64Image = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

        res.json({
            screenshot: base64Image,
            isIframeAllowed,
            width: width,
            height: captureHeight
        });

    } catch (error) {
        console.error('Screenshot error:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({
            error: 'Failed to capture screenshot',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Screenshot service running on port ${PORT}`);
});
