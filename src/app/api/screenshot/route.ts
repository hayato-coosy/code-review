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

        // Get screenshot service URL from environment variable
        const screenshotServiceUrl = process.env.SCREENSHOT_SERVICE_URL;

        if (!screenshotServiceUrl) {
            return NextResponse.json(
                { error: "Screenshot service not configured. Please set SCREENSHOT_SERVICE_URL environment variable." },
                { status: 500 }
            );
        }

        // Call screenshot service
        const response = await fetch(`${screenshotServiceUrl}/screenshot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetUrl,
                viewport
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { error: errorData.error || 'Screenshot service error', details: errorData.details },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Screenshot proxy error:", error);
        return NextResponse.json(
            { error: "Failed to capture screenshot", details: error.message },
            { status: 500 }
        );
    }
}
