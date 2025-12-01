import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { image, folder = 'misc' } = body;

        if (!image) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename
        const filename = `${folder}/${uuidv4()}.jpg`;

        // Upload to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('screenshots')
            .upload(filename, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error("Supabase upload error:", error);
            return NextResponse.json(
                { error: "Failed to upload image", details: error.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('screenshots')
            .getPublicUrl(filename);

        return NextResponse.json({
            url: publicUrlData.publicUrl,
            path: filename
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
