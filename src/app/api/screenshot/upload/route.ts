import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { folder = 'misc', fileType = 'image/jpeg' } = body;

        // Determine file extension from MIME type
        const extension = fileType.includes('png') ? 'png' : 'jpg';

        // Generate unique filename
        const filename = `${folder}/${uuidv4()}.${extension}`;

        // Create Signed Upload URL with upsert option
        const { data: signedData, error: signedError } = await supabase
            .storage
            .from('screenshots')
            .createSignedUploadUrl(filename, {
                upsert: true
            });

        if (signedError) {
            console.error("Supabase signed url error:", signedError);
            return NextResponse.json(
                { error: "Failed to create upload URL", details: signedError.message },
                { status: 500 }
            );
        }

        // Get public URL (this is deterministic)
        const { data: publicUrlData } = supabase
            .storage
            .from('screenshots')
            .getPublicUrl(filename);

        return NextResponse.json({
            signedUrl: signedData.signedUrl,
            publicUrl: publicUrlData.publicUrl,
            path: filename,
            token: signedData.token
        });

    } catch (error: any) {
        console.error("Upload setup error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
