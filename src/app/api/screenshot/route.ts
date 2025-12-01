import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetUrl, viewport = 'desktop' } = body;

        if (!targetUrl) {
            return NextResponse.json(
                { error: "targetUrl is required" },
                { status: 400 }
            );
        }

        // Validate URL and prevent SSRF
        try {
            const url = new URL(targetUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
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
                return NextResponse.json({ error: "Access to local network is restricted" }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // Check for API key
        const apiKey = process.env.SCREENSHOT_ONE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Screenshot service not configured. Please set SCREENSHOT_ONE_API_KEY environment variable." },
                { status: 500 }
            );
        }

        // Configure screenshot parameters
        const isMobile = viewport === 'mobile';
        const width = isMobile ? 375 : 1280;
        const height = 3000;

        // Build ScreenshotOne API URL
        const screenshotApiUrl = new URL('https://api.screenshotone.com/take');
        screenshotApiUrl.searchParams.set('access_key', apiKey);
        screenshotApiUrl.searchParams.set('url', targetUrl);
        screenshotApiUrl.searchParams.set('viewport_width', width.toString());
        screenshotApiUrl.searchParams.set('viewport_height', height.toString());
        screenshotApiUrl.searchParams.set('device_scale_factor', '1');
        screenshotApiUrl.searchParams.set('format', 'jpg');
        screenshotApiUrl.searchParams.set('image_quality', '60');
        screenshotApiUrl.searchParams.set('full_page', 'false');
        screenshotApiUrl.searchParams.set('block_cookie_banners', 'true');
        screenshotApiUrl.searchParams.set('block_chats', 'true');
        screenshotApiUrl.searchParams.set('time_zone', 'Asia/Shanghai');

        // Call ScreenshotOne API
        const screenshotResponse = await fetch(screenshotApiUrl.toString(), {
            method: 'GET',
        });

        if (!screenshotResponse.ok) {
            const errorText = await screenshotResponse.text();
            console.error("ScreenshotOne API error:", errorText);
            return NextResponse.json(
                { error: "Failed to capture screenshot", details: errorText },
                { status: screenshotResponse.status }
            );
        }

        // Get the image directly (binary response)
        const imageBuffer = await screenshotResponse.arrayBuffer();
        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;

        // Assume iframe is allowed (we can't easily check headers from this API)
        const isIframeAllowed = true;

        return NextResponse.json({
            screenshot: base64Image,
            isIframeAllowed,
            width: width,
            height: height
        });

    } catch (error: any) {
        console.error("Screenshot error:", error);
        return NextResponse.json(
            { error: "Failed to capture screenshot", details: error.message },
            { status: 500 }
        );
    }
}
