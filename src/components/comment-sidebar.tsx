"use client";

import { useState } from "react";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Filter, Eye, EyeOff, X, Pencil } from "lucide-react";
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

    // Edit state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editMessage, setEditMessage] = useState<string>("");

    const handleStartEdit = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditMessage(comment.message);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditMessage("");
    };

    const handleSaveEdit = async (commentId: string) => {
        if (!editMessage.trim()) return;

        await onUpdateComment?.(commentId, { message: editMessage });
        setEditingCommentId(null);
        setEditMessage("");
    };

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
                "flex h-full flex-col border-l border-gray-200 bg-white text-gray-900 shadow-xl transition-all duration-300 ease-in-out relative",
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
                className="absolute -left-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 border-r-0 rounded-l-md p-1 text-gray-500 hover:text-gray-900 hidden md:flex items-center justify-center h-12 w-6 shadow-md z-40"
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
                <div className="flex items-center justify-between border-b border-gray-200 p-4 min-w-[320px]">
                    <h2 className="text-lg font-semibold text-gray-900">コメント ({comments.length})</h2>
                    {onToggleOverlay && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleOverlay}
                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            title={isOverlayMode ? "暗転解除" : "暗転モード"}
                        >
                            {isOverlayMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                {/* Viewport Tabs */}
                <div className="flex border-b border-gray-200 min-w-[320px]">
                    <Button
                        variant="ghost"
                        size="default"
                        onClick={() => onTabChange?.("desktop")}
                        className={cn(
                            "flex-1 rounded-none py-3 text-sm font-medium transition-all",
                            activeTab === "desktop"
                                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50/50"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        PC
                    </Button>
                    <Button
                        variant="ghost"
                        size="default"
                        onClick={() => onTabChange?.("mobile")}
                        className={cn(
                            "flex-1 rounded-none py-3 text-sm font-medium transition-all",
                            activeTab === "mobile"
                                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50/50"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        SP
                    </Button>
                </div>

                <div className="border-b border-gray-200 p-4 space-y-4 min-w-[320px]">
                    <Button
                        variant="outline"
                        className="w-full gap-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        onClick={handleCopyLink}
                    >
                        <Copy className="h-4 w-4" />
                        Copy Page Link
                    </Button>
                </div>

                <div className="border-b border-gray-200 p-4 space-y-3 min-w-[320px] bg-gray-50/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Filter className="h-4 w-4" />
                        フィルター
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">依頼先</option>
                            <option value="coding">コーディング</option>
                            <option value="design">デザイン</option>
                        </select>
                        <select
                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">対応状況</option>
                            <option value="pending">未対応</option>
                            <option value="in-progress">対応中</option>
                            <option value="completed">完了</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        完了したコメントを表示
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto min-w-[320px]">
                    {filteredComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <p className="text-sm">No comments found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredComments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={cn(
                                        "group flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                                        comment.isCompleted && "opacity-60 bg-gray-50"
                                    )}
                                    onClick={() => onCommentClick?.(comment)}
                                >
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <div
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                                                comment.status === "completed"
                                                    ? "bg-gray-200 text-gray-700 border-gray-400"
                                                    : comment.status === "in-progress"
                                                        ? "bg-blue-100 text-blue-800 border-blue-400"
                                                        : "bg-red-100 text-red-800 border-red-400"
                                            )}
                                        >
                                            {comment.authorName ? comment.authorName.slice(0, 2).toUpperCase() : "AN"}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900 truncate">
                                                    {comment.authorName || "Anonymous"}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Actions (visible on hover or if menu open) */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-gray-400 hover:text-gray-900"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEdit(comment);
                                                    }}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-6 w-6",
                                                        comment.isCompleted ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleComplete(comment.id, !comment.isCompleted);
                                                    }}
                                                    title={comment.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                                                >
                                                    <div className={cn(
                                                        "flex items-center justify-center w-4 h-4 rounded-full border border-current",
                                                        comment.isCompleted && "bg-blue-600 border-blue-600 text-white"
                                                    )}>
                                                        {comment.isCompleted && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                </Button>
                                            </div>
                                        </div>

                                        {editingCommentId === comment.id ? (
                                            <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                                <textarea
                                                    className="w-full min-h-[60px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={editMessage}
                                                    onChange={(e) => setEditMessage(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={handleCancelEdit}
                                                        className="h-7 px-3 text-gray-500 hover:text-gray-900"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveEdit(comment.id)}
                                                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className={cn(
                                                "text-sm text-gray-900 leading-relaxed break-words",
                                                comment.isCompleted && "line-through text-gray-500"
                                            )}>
                                                {comment.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
