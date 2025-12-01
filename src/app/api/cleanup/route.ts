import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Get sessions older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: oldSessions, error: fetchError } = await supabase
            .from('sessions')
            .select('id, screenshot_desktop_url, screenshot_mobile_url')
            .lt('created_at', thirtyDaysAgo.toISOString());

        if (fetchError) throw fetchError;
        if (!oldSessions || oldSessions.length === 0) {
            return NextResponse.json({
                message: 'No old sessions to delete',
                deletedCount: 0
            });
        }

        // Delete images from storage
        const filePaths: string[] = [];
        for (const session of oldSessions) {
            if (session.screenshot_desktop_url) {
                const path = extractPathFromUrl(session.screenshot_desktop_url);
                if (path) filePaths.push(path);
            }
            if (session.screenshot_mobile_url) {
                const path = extractPathFromUrl(session.screenshot_mobile_url);
                if (path) filePaths.push(path);
            }
        }

        if (filePaths.length > 0) {
            const { error: storageError } = await supabase
                .storage
                .from('screenshots')
                .remove(filePaths);

            if (storageError) console.error('Storage deletion error:', storageError);
        }

        // Delete sessions (comments will cascade)
        const sessionIds = oldSessions.map(s => s.id);
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .in('id', sessionIds);

        if (deleteError) throw deleteError;

        return NextResponse.json({
            message: 'Cleanup completed',
            deletedCount: oldSessions.length,
            deletedFiles: filePaths.length
        });

    } catch (error: any) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed', details: error.message },
            { status: 500 }
        );
    }
}

function extractPathFromUrl(url: string): string | null {
    // Extract path from Supabase public URL
    // Example: https://xxx.supabase.co/storage/v1/object/public/screenshots/desktop/uuid.jpg
    // Returns: desktop/uuid.jpg
    const match = url.match(/\/screenshots\/(.+)$/);
    return match ? match[1] : null;
}
