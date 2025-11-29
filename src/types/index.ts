export interface Session {
    id: string;
    targetUrl: string;
    createdAt: string;
    canvasHeight?: number;
};

export type Comment = {
    id: string;
    sessionId: string;
    message: string;
    authorName?: string;
    category: "coding" | "design";
    status: "pending" | "in-progress" | "completed";
    viewport?: "desktop" | "mobile";
    posX: number; // 0-1 relative X
    posY: number; // 0-1 relative Y
    width?: number; // 0-1 relative width (for area selection)
    height?: number; // 0-1 relative height (for area selection)
    isCompleted?: boolean;
    createdAt: string;
};
