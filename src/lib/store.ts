import { Comment, Session } from "@/types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

interface DB {
    sessions: Session[];
    comments: Comment[];
}

// Initialize DB
function initDB() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ sessions: [], comments: [] }, null, 2));
    }
}

function getData(): DB {
    initDB();
    try {
        const fileContent = fs.readFileSync(DB_PATH, "utf-8");
        return JSON.parse(fileContent);
    } catch (error) {
        return { sessions: [], comments: [] };
    }
}

function saveData(data: DB) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const store = {
    sessions: {
        create: (targetUrl: string) => {
            const db = getData();
            const newSession: Session = {
                id: Math.random().toString(36).substring(2, 9),
                targetUrl,
                createdAt: new Date().toISOString(),
                canvasHeight: 3000,
            };
            db.sessions.push(newSession);
            saveData(db);
            return newSession;
        },
        getById: (id: string) => {
            const db = getData();
            return db.sessions.find((s) => s.id === id);
        },
        update: (id: string, data: Partial<Session>) => {
            const db = getData();
            const index = db.sessions.findIndex((s) => s.id === id);
            if (index === -1) return null;
            db.sessions[index] = { ...db.sessions[index], ...data };
            saveData(db);
            return db.sessions[index];
        },
    },
    comments: {
        getBySessionId: (sessionId: string) => {
            const db = getData();
            return db.comments.filter((c) => c.sessionId === sessionId);
        },
        create: (data: Omit<Comment, "id" | "createdAt">) => {
            const db = getData();
            const newComment: Comment = {
                id: Math.random().toString(36).substring(2, 9),
                createdAt: new Date().toISOString(),
                ...data,
            };
            db.comments.push(newComment);
            saveData(db);
            return newComment;
        },
        update: (id: string, data: any) => {
            const db = getData();
            const index = db.comments.findIndex((c) => c.id === id);
            if (index === -1) return null;
            db.comments[index] = { ...db.comments[index], ...data };
            saveData(db);
            return db.comments[index];
        },
    },
};
