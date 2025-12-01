import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

export const maxDuration = 60; // Increase timeout to 60 seconds
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

        // Launch puppeteer
        let browser;
        let page;

        try {
            if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
                // Production (Vercel/Lambda)
                // Configure sparticuz/chromium
                chromium.setGraphicsMode = false;

                browser = await puppeteerCore.launch({
                    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security', '--ignore-certificate-errors'],
                    executablePath: await chromium.executablePath(),
                    headless: true,
                });
            } else {
                // Local development
                const puppeteer = await import("puppeteer");
                browser = await puppeteer.default.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }

            page = await browser.newPage();
        } catch (launchError: any) {
            console.error("Browser launch failed:", launchError);
            return NextResponse.json(
                { error: "Failed to initialize browser", details: launchError.message },
                { status: 500 }
            );
        }

        // Set viewport based on requested device
        const isMobile = viewport === 'mobile';
        await page.setViewport({
            width: isMobile ? 375 : 1280,
            height: 800,
            deviceScaleFactor: 2,
            isMobile: isMobile,
            hasTouch: isMobile
        });

        // Navigate to URL
        const response = await page.goto(targetUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        if (!response) {
            await browser.close();
            return NextResponse.json(
                { error: "Failed to load page" },
                { status: 500 }
            );
        }

        // Wait for fonts to be ready
        await page.evaluate(() => document.fonts.ready);

        // Additional wait for dynamic content
        await new Promise(r => setTimeout(r, 2000));

        // Check headers for iframe compatibility
        const headers = response.headers();
        const xFrameOptions = headers['x-frame-options'];
        const csp = headers['content-security-policy'];

        let isIframeAllowed = true;
        if (xFrameOptions && (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase() === 'sameorigin')) {
            isIframeAllowed = false;
        }
        // Simplified CSP check - in reality parsing CSP is more complex
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

        // Take screenshot
        const base64Body = await page.screenshot({
            fullPage: true,
            type: 'jpeg',
            quality: 80,
            encoding: 'base64'
        });

        await browser.close();

        // Convert to base64 data URI
        const base64Image = `data:image/jpeg;base64,${base64Body}`;

        return NextResponse.json({
            screenshot: base64Image,
            isIframeAllowed,
            width: dimensions.width,
            height: dimensions.height
        });

    } catch (error: any) {
        console.error("Screenshot error:", error);
        return NextResponse.json(
            { error: "Failed to capture screenshot", details: error.message },
            { status: 500 }
        );
    }
}
