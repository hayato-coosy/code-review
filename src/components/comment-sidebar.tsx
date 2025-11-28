"use client";

import { useState } from "react";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Filter, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentSidebarProps {
    comments: Comment[];
    onToggleComplete: (commentId: string, isCompleted: boolean) => Promise<void>;
    isOverlayMode?: boolean;
    onToggleOverlay?: () => void;
    onCommentClick?: (comment: Comment) => void;
}

export function CommentSidebar({
    comments,
    onToggleComplete,
    isOverlayMode = false,
    onToggleOverlay,
    onCommentClick
}: CommentSidebarProps) {
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");
    const [showCompleted, setShowCompleted] = useState(false);

    const filteredComments = comments.filter((c) => {
        if (!showCompleted && c.isCompleted) return false;
        if (filterCategory !== "all" && c.category !== filterCategory) return false;
        if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
        return true;
    });

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="flex h-full flex-col border-l bg-[#333] text-white">
            <div className="border-b border-gray-600 p-4 space-y-2">
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
                        <option value="all">All Categories</option>
                        <option value="layout">Layout</option>
                        <option value="text">Text</option>
                        <option value="ui">UI</option>
                        <option value="bug">Bug</option>
                        <option value="idea">Idea</option>
                        <option value="other">Other</option>
                    </select>
                    <select
                        className="flex h-9 w-full rounded-md border border-gray-600 bg-[#444] text-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                        <option value="all">All Severities</option>
                        <option value="INFO">Info</option>
                        <option value="MINOR">Minor</option>
                        <option value="MAJOR">Major</option>
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
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase text-gray-300">
                                        {comment.category}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-xs font-bold",
                                            comment.severity === "MAJOR"
                                                ? "text-red-400"
                                                : comment.severity === "MINOR"
                                                    ? "text-yellow-400"
                                                    : "text-blue-400"
                                        )}
                                    >
                                        {comment.severity}
                                    </span>
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
