import { Comment, Session } from "@/types";
import { supabase } from "./supabase";

export const store = {
    sessions: {
        create: async (targetUrl: string): Promise<Session> => {
            const id = Math.random().toString(36).substring(2, 9);
            const newSession: Session = {
                id,
                targetUrl,
                createdAt: new Date().toISOString(),
                canvasHeight: 3000,
            };

            const { error } = await supabase
                .from('sessions')
                .insert({
                    id: newSession.id,
                    target_url: newSession.targetUrl,
                    created_at: newSession.createdAt,
                    canvas_height: newSession.canvasHeight,
                });

            if (error) throw error;
            return newSession;
        },
        getById: async (id: string): Promise<Session | null> => {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (error) return null;
            if (!data) return null;

            return {
                id: data.id,
                targetUrl: data.target_url,
                createdAt: data.created_at,
                canvasHeight: data.canvas_height,
            };
        },
        update: async (id: string, updates: Partial<Session>): Promise<Session | null> => {
            const updateData: any = {};
            if (updates.canvasHeight !== undefined) updateData.canvas_height = updates.canvasHeight;
            if (updates.targetUrl !== undefined) updateData.target_url = updates.targetUrl;

            const { error } = await supabase
                .from('sessions')
                .update(updateData)
                .eq('id', id);

            if (error) return null;

            return store.sessions.getById(id);
        },
    },
    comments: {
        getBySessionId: async (sessionId: string): Promise<Comment[]> => {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error || !data) return [];

            return data.map((row: any) => ({
                id: row.id,
                sessionId: row.session_id,
                message: row.message,
                authorName: row.author_name,
                posX: parseFloat(row.pos_x),
                posY: parseFloat(row.pos_y),
                width: row.width ? parseFloat(row.width) : undefined,
                height: row.height ? parseFloat(row.height) : undefined,
                category: row.category,
                status: row.status,
                viewport: row.viewport,
                isCompleted: row.is_completed,
                createdAt: row.created_at,
            }));
        },
        create: async (data: Omit<Comment, "id" | "createdAt">): Promise<Comment> => {
            const id = Math.random().toString(36).substring(2, 9);
            const newComment: Comment = {
                id,
                createdAt: new Date().toISOString(),
                ...data,
            };

            const { error } = await supabase
                .from('comments')
                .insert({
                    id: newComment.id,
                    session_id: newComment.sessionId,
                    message: newComment.message,
                    author_name: newComment.authorName,
                    pos_x: newComment.posX,
                    pos_y: newComment.posY,
                    width: newComment.width,
                    height: newComment.height,
                    category: newComment.category,
                    status: newComment.status,
                    viewport: newComment.viewport,
                    is_completed: newComment.isCompleted,
                    created_at: newComment.createdAt,
                });

            if (error) throw error;
            return newComment;
        },
        update: async (id: string, updates: any): Promise<Comment | null> => {
            const updateData: any = {};
            if (updates.message !== undefined) updateData.message = updates.message;
            if (updates.category !== undefined) updateData.category = updates.category;
            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
            if (updates.posX !== undefined) updateData.pos_x = updates.posX;
            if (updates.posY !== undefined) updateData.pos_y = updates.posY;
            if (updates.width !== undefined) updateData.width = updates.width;
            if (updates.height !== undefined) updateData.height = updates.height;

            const { error } = await supabase
                .from('comments')
                .update(updateData)
                .eq('id', id);

            if (error) return null;

            // Fetch and return updated comment
            const { data } = await supabase
                .from('comments')
                .select('*')
                .eq('id', id)
                .single();

            if (!data) return null;

            return {
                id: data.id,
                sessionId: data.session_id,
                message: data.message,
                authorName: data.author_name,
                posX: parseFloat(data.pos_x),
                posY: parseFloat(data.pos_y),
                width: data.width ? parseFloat(data.width) : undefined,
                height: data.height ? parseFloat(data.height) : undefined,
                category: data.category,
                status: data.status,
                viewport: data.viewport,
                isCompleted: data.is_completed,
                createdAt: data.created_at,
            };
        },
    },
};
