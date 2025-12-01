import { store } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetUrl } = body;

        if (!targetUrl) {
            return NextResponse.json(
                { error: "targetUrl is required" },
                { status: 400 }
            );
        }

        try {
            const url = new URL(targetUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid URL format" },
                { status: 400 }
            );
        }

        const session = await store.sessions.create(targetUrl);
        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
