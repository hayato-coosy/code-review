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
        const height = 3000; // Max height to prevent memory issues

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
        screenshotApiUrl.searchParams.set('response_type', 'json');
        screenshotApiUrl.searchParams.set('store', 'false');

        if (isMobile) {
            screenshotApiUrl.searchParams.set('device_type', 'mobile');
        }

        // Call ScreenshotOne API
        const screenshotResponse = await fetch(screenshotApiUrl.toString(), {
            method: 'GET',
        });

        if (!screenshotResponse.ok) {
            const errorText = await screenshotResponse.text();
            console.error("ScreenshotOne API error:", errorText);
            return NextResponse.json(
                { error: "Failed to capture screenshot", details: errorText },
                { status: 500 }
            );
        }

        // Get the JSON response which contains the image URL
        const screenshotData = await screenshotResponse.json();

        if (!screenshotData.screenshot) {
            return NextResponse.json(
                { error: "Screenshot URL not found in response" },
                { status: 500 }
            );
        }

        // Fetch the actual image from the URL
        const imageResponse = await fetch(screenshotData.screenshot);
        if (!imageResponse.ok) {
            return NextResponse.json(
                { error: "Failed to fetch screenshot image" },
                { status: 500 }
            );
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;

        // Check if iframe is allowed (based on headers if available)
        let isIframeAllowed = true;
        // Note: We can't easily check X-Frame-Options without making another request
        // For simplicity, we'll assume it's allowed and let the frontend handle it

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
