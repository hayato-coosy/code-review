export type Session = {
    id: string;
    targetUrl: string;
    createdAt: string;
};

export type Comment = {
    id: string;
    sessionId: string;
    message: string;
    authorName?: string;
    category: "layout" | "text" | "ui" | "bug" | "idea" | "other";
    severity: "INFO" | "MINOR" | "MAJOR";
    posX: number; // 0-1 relative X
    posY: number; // 0-1 relative Y
    width?: number; // 0-1 relative width (for area selection)
    height?: number; // 0-1 relative height (for area selection)
    isCompleted?: boolean;
    createdAt: string;
};
