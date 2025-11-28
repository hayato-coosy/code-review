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
    const [showCompleted, setShowCompleted] = useState<boolean>(true);

    const filteredComments = comments.filter((c) => {
        if (!showCompleted && c.status === "completed") return false;
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
        <div className={cn(
            "flex h-full w-80 flex-col border-l border-gray-700 bg-[#333] text-white shadow-xl transition-transform duration-300 ease-in-out",
            // Mobile: Fixed overlay controlled by isOverlayMode
            // Desktop: Always relative and visible
            isOverlayMode ? "fixed right-0 top-0 z-50 md:relative md:z-0 md:inset-auto" : "hidden md:flex"
        )}>
            <div className="flex items-center justify-between border-b border-gray-700 p-4">
                <h2 className="text-lg font-semibold text-white">コメント ({comments.length})</h2>
                {isOverlayMode && (
                    <Button variant="ghost" size="icon" onClick={onToggleOverlay} className="text-gray-400 hover:text-white hover:bg-gray-700 md:hidden">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Viewport Tabs */}
            <div className="flex border-b border-gray-700">
                <button
                    className={cn(
                        "flex-1 py-2 text-sm font-medium transition-colors",
                        activeTab === "desktop"
                            ? "border-b-2 border-blue-500 text-blue-400 bg-[#444]"
                            : "text-gray-400 hover:text-white hover:bg-[#444]"
                    )}
                    onClick={() => onTabChange?.("desktop")}
                >
                    PC
                </button>
                <button
                    className={cn(
                        "flex-1 py-2 text-sm font-medium transition-colors",
                        activeTab === "mobile"
                            ? "border-b-2 border-blue-500 text-blue-400 bg-[#444]"
                            : "text-gray-400 hover:text-white hover:bg-[#444]"
                    )}
                    onClick={() => onTabChange?.("mobile")}
                >
                    SP
                </button>
            </div>

            <div className="border-b border-gray-700 p-4 space-y-4">
                <Button
                    variant="outline"
                    className="w-full gap-2 bg-[#444] text-white border-gray-600 hover:bg-[#555] hover:text-white"
                    onClick={handleCopyLink}
                >
                    <Copy className="h-4 w-4" />
                    Copy Page Link
                </Button>

                {onToggleOverlay && (
                    <Button
                        variant={isOverlayMode ? "default" : "outline"}
                        className={cn(
                            "w-full gap-2",
                            isOverlayMode
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-[#444] text-white border-gray-600 hover:bg-[#555] hover:text-white"
                        )}
                        onClick={onToggleOverlay}
                    >
                        {isOverlayMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {isOverlayMode ? "Overlay Mode: ON" : "Overlay Mode: OFF"}
                    </Button>
                )}
            </div>

            <div className="border-b border-gray-600 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    <Filter className="h-4 w-4" />
                    Filters
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select
                        className="flex h-9 w-full rounded-md border border-gray-600 bg-[#444] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">すべてのカテゴリ</option>
                        <option value="coding">🟢 コーディング</option>
                        <option value="design">🟠 デザイン</option>
                    </select>
                    <select
                        className="flex h-9 w-full rounded-md border border-gray-600 bg-[#444] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">すべてのステータス</option>
                        <option value="pending">⚪ 未対応</option>
                        <option value="in-progress">🔵 対応中</option>
                        <option value="completed">⚫ 完了</option>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            <CardHeader className="p-3 pb-0">
                                <div className="flex items-center justify-between gap-2">
                                    <select
                                        className={cn(
                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1 bg-transparent",
                                            comment.category === "coding"
                                                ? "bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50"
                                                : "bg-orange-900/30 text-orange-300 hover:bg-orange-900/50"
                                        )}
                                        value={comment.category}
                                        onChange={(e) => onUpdateComment?.(comment.id, { category: e.target.value as any })}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="coding" className="bg-[#333]">コーディング</option>
                                        <option value="design" className="bg-[#333]">デザイン</option>
                                    </select>
                                    <select
                                        className={cn(
                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1 bg-transparent",
                                            comment.status === "completed"
                                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                : comment.status === "in-progress"
                                                    ? "bg-sky-900/30 text-sky-300 hover:bg-sky-900/50"
                                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
                            </CardHeader>
                            <CardContent className="p-3 pt-2">
                                <p className={cn("text-sm text-gray-100", comment.isCompleted && "line-through")}>
                                    {comment.message}
                                </p>
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                                    <span>{comment.authorName || "Anonymous"}</span>
                                    <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
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
    );
}
