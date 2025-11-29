import { store } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const comments = await store.comments.getBySessionId(id);
    return NextResponse.json({ comments });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { message, authorName, category, status, posX, posY, width, height, viewport } = body;

        if (!message || posX === undefined || posY === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const comment = await store.comments.create({
            sessionId: id,
            message,
            authorName,
            category,
            status,
            posX,
            posY,
            width,
            height,
            viewport,
            isCompleted: false,
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { commentId, isCompleted, posX, posY, width, height, category, status } = body;

        console.log("PATCH request - Session ID:", id, "Comment ID:", commentId, "Updates:", { isCompleted, posX, posY, width, height, category, status });

        if (!commentId) {
            return NextResponse.json(
                { error: "Comment ID is required" },
                { status: 400 }
            );
        }

        const updates: any = {};
        if (isCompleted !== undefined) updates.isCompleted = isCompleted;
        if (posX !== undefined) updates.posX = posX;
        if (posY !== undefined) updates.posY = posY;
        if (width !== undefined) updates.width = width;
        if (height !== undefined) updates.height = height;
        if (category !== undefined) updates.category = category;
        if (status !== undefined) updates.status = status;

        const updated = await store.comments.update(commentId, updates as Partial<Comment>);
        if (!updated) {
            console.error("Comment not found:", commentId);
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        console.log("Updated comment:", updated);
        return NextResponse.json(updated);
    } catch (error) {
        console.error("PATCH error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
