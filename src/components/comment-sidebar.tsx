"use client";

import { useState } from "react";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Filter, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentSidebarProps {
    comments: Comment[];
    onToggleComplete: (commentId: string, isCompleted: boolean) => Promise<void>;
    isOverlayMode?: boolean;
    onToggleOverlay?: () => void;
    onCommentClick?: (comment: Comment) => void;
    onUpdateComment?: (commentId: string, updates: Partial<Comment>) => Promise<void>;
    activeTab?: "desktop" | "mobile";
    onTabChange?: (tab: "desktop" | "mobile") => void;
}

export function CommentSidebar({
    comments,
    onToggleComplete,
    isOverlayMode = false,
    onToggleOverlay,
    onCommentClick,
    onUpdateComment,
    activeTab = "desktop",
    onTabChange
}: CommentSidebarProps) {
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [showCompleted, setShowCompleted] = useState<boolean>(false);

    // Sidebar state
    const [width, setWidth] = useState(320);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Resize logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = startX - moveEvent.clientX;
            // Min width 320px to prevent layout breakage
            const newWidth = Math.max(320, Math.min(600, startWidth + deltaX));
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const filteredComments = comments.filter((c) => {
        // Filter by completion status (exclusive: show only completed OR only incomplete)
        const isCompleted = c.status === "completed" || c.isCompleted;
        if (showCompleted && !isCompleted) return false; // Show completed only
        if (!showCompleted && isCompleted) return false; // Show incomplete only

        if (filterCategory !== "all" && c.category !== filterCategory) return false;
        if (filterStatus !== "all" && c.status !== filterStatus) return false;

        // Viewport filtering
        const commentViewport = c.viewport || "desktop"; // Default to desktop for legacy comments
        if (commentViewport !== activeTab) return false;

        return true;
    });

    const completedCount = comments.filter((c) => c.status === "completed").length;
    const pendingCount = comments.length - completedCount;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
    };

    return (
        <div
            className={cn(
                "flex h-full flex-col border-l border-gray-700 bg-[#333] text-white shadow-xl transition-all duration-300 ease-in-out relative",
                // Mobile: Fixed overlay
                // Desktop: Always relative, but with higher z-index to ensure button is clickable
                "fixed right-0 top-0 z-50 md:relative md:z-20 md:inset-auto",
                // Mobile: Show only when overlay mode is on
                // Desktop: Always show
                !isOverlayMode && "hidden md:flex",
                isCollapsed && "w-0 border-l-0"
            )}
            style={{ width: isCollapsed ? 0 : width }}
        >
            {/* Resize Handle (Desktop only) */}
            <div
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 z-50 hidden md:block",
                    isCollapsed && "hidden"
                )}
                onMouseDown={handleMouseDown}
            />

            {/* Collapse/Expand Button */}
            <button
                className="absolute -left-6 top-1/2 -translate-y-1/2 bg-[#333] border border-gray-700 border-r-0 rounded-l-md p-1 text-gray-400 hover:text-white hidden md:flex items-center justify-center h-12 w-6 shadow-md z-40"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                )}
            </button>

            {/* Content Wrapper */}
            <div className={cn("flex-1 flex flex-col w-full overflow-hidden", isCollapsed && "hidden")}>
                <div className="flex items-center justify-between border-b border-gray-700 p-4 min-w-[320px]">
                    <h2 className="text-lg font-semibold text-white">コメント ({comments.length})</h2>
                    {onToggleOverlay && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleOverlay}
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                            title={isOverlayMode ? "暗転解除" : "暗転モード"}
                        >
                            {isOverlayMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                {/* Viewport Tabs */}
                <div className="flex border-b border-gray-700 min-w-[320px]">
                    <Button
                        variant="ghost"
                        size="default"
                        onClick={() => onTabChange?.("desktop")}
                        className={cn(
                            "flex-1 rounded-none py-3 text-base font-medium transition-all",
                            activeTab === "desktop"
                                ? "border-b-2 border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                                : "text-gray-400 hover:text-white hover:bg-[#444]"
                        )}
                    >
                        PC
                    </Button>
                    <Button
                        variant="ghost"
                        size="default"
                        onClick={() => onTabChange?.("mobile")}
                        className={cn(
                            "flex-1 rounded-none py-3 text-base font-medium transition-all",
                            activeTab === "mobile"
                                ? "border-b-2 border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                                : "text-gray-400 hover:text-white hover:bg-[#444]"
                        )}
                    >
                        SP
                    </Button>
                </div>

                <div className="border-b border-gray-700 p-4 space-y-4 min-w-[320px]">
                    <Button
                        variant="outline"
                        className="w-full gap-2 bg-[#444] text-white border-gray-600 hover:bg-[#555] hover:text-white"
                        onClick={handleCopyLink}
                    >
                        <Copy className="h-4 w-4" />
                        Copy Page Link
                    </Button>
                </div>

                <div className="border-b border-gray-600 p-5 space-y-4 min-w-[320px]">
                    <div className="flex items-center gap-2 text-base font-medium text-gray-200">
                        <Filter className="h-5 w-5" />
                        フィルター
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <select
                            className="flex h-9 w-full rounded-md border border-gray-600 bg-[#444] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">依頼先</option>
                            <option value="coding">コーディング</option>
                            <option value="design">デザイン</option>
                        </select>
                        <select
                            className="flex h-9 w-full rounded-md border border-gray-600 bg-[#444] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">対応状況</option>
                            <option value="pending">未対応</option>
                            <option value="in-progress">対応中</option>
                            <option value="completed">完了</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-200">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-600 bg-[#444] checked:bg-blue-500"
                        />
                        Show completed
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[320px]">
                    {filteredComments.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">
                            No comments found.
                        </p>
                    ) : (
                        filteredComments.map((comment) => (
                            <Card
                                key={comment.id}
                                className={cn(
                                    "overflow-hidden bg-[#444] border-gray-600 text-white cursor-pointer hover:bg-[#555] transition-colors",
                                    comment.isCompleted && "opacity-60"
                                )}
                                onClick={() => onCommentClick?.(comment)}
                            >
                                <CardHeader className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <CardTitle className={cn("text-base font-medium text-gray-100 leading-relaxed flex-1", comment.isCompleted && "line-through")}>
                                            {comment.message}
                                        </CardTitle>
                                        <select
                                            className={cn(
                                                "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1 bg-transparent",
                                                comment.status === "completed"
                                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                    : comment.status === "in-progress"
                                                        ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                                                        : "bg-red-900/30 text-red-300 hover:bg-red-900/50"
                                            )}
                                            value={comment.status}
                                            onChange={(e) => onUpdateComment?.(comment.id, { status: e.target.value as any })}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="pending" className="bg-[#333]">未対応</option>
                                            <option value="in-progress" className="bg-[#333]">対応中</option>
                                            <option value="completed" className="bg-[#333]">完了</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{comment.authorName || "Anonymous"}</span>
                                        <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={comment.isCompleted || false}
                                            onChange={(e) => onToggleComplete(comment.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-600 bg-[#555] checked:bg-blue-500"
                                        />
                                        <label className="text-xs text-gray-300 cursor-pointer">
                                            Mark as completed
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
