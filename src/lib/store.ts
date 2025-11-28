import { Comment, Session } from "@/types";

// In-memory stores
const sessions: Session[] = [];
const comments: Comment[] = [];

export const store = {
    sessions: {
        create: (targetUrl: string) => {
            const newSession: Session = {
                id: Math.random().toString(36).substring(2, 9),
                targetUrl,
                createdAt: new Date().toISOString(),
            };
            sessions.push(newSession);
            return newSession;
        },
        getById: (id: string) => sessions.find((s) => s.id === id),
    },
    comments: {
        getBySessionId: (sessionId: string) =>
            comments.filter((c) => c.sessionId === sessionId),
        create: (data: Omit<Comment, "id" | "createdAt">) => {
            const newComment: Comment = {
                id: Math.random().toString(36).substring(2, 9),
                createdAt: new Date().toISOString(),
                ...data,
            };
            comments.push(newComment);
            return newComment;
        },
        update: (id: string, data: any) => {
            const index = comments.findIndex((c) => c.id === id);
            if (index === -1) return null;
            comments[index] = { ...comments[index], ...data };
            return comments[index];
        },
    },
};
