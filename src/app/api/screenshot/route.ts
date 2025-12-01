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

        // Configure screenshot parameters
        const isMobile = viewport === 'mobile';
        const width = isMobile ? 375 : 1280;
        const height = isMobile ? 667 : 720;

        // Build Microlink API URL
        const microlinkApiUrl = new URL('https://api.microlink.io');
        microlinkApiUrl.searchParams.set('url', targetUrl);
        microlinkApiUrl.searchParams.set('screenshot', 'true');
        microlinkApiUrl.searchParams.set('meta', 'false');
        microlinkApiUrl.searchParams.set('embed', 'screenshot.url');
        microlinkApiUrl.searchParams.set('viewport.width', width.toString());
        microlinkApiUrl.searchParams.set('viewport.height', height.toString());
        // microlinkApiUrl.searchParams.set('viewport.deviceScaleFactor', '2'); // Reduce load
        microlinkApiUrl.searchParams.set('fullPage', 'true');
        // microlinkApiUrl.searchParams.set('headers.Accept-Language', 'ja'); // Requires Pro plan
        // Microlink doesn't support time_zone directly in free tier easily without overlay, 
        // but Accept-Language is key for fonts.

        // Call Microlink API
        const screenshotResponse = await fetch(microlinkApiUrl.toString(), {
            method: 'GET',
        });

        if (!screenshotResponse.ok) {
            const errorText = await screenshotResponse.text();
            console.error("Microlink API error:", errorText);
            return NextResponse.json(
                { error: "Failed to capture screenshot", details: errorText },
                { status: screenshotResponse.status }
            );
        }

        // Get the image directly (binary response)
        const imageBuffer = await screenshotResponse.arrayBuffer();
        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;

        // Assume iframe is allowed
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
