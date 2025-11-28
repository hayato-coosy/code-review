"use client";

import { useState, useRef, MouseEvent } from "react";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, X, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnotationCanvasProps {
    targetUrl: string;
    comments: Comment[];
    onAddComment: (
        comment: Omit<Comment, "id" | "createdAt" | "sessionId">
    ) => Promise<void>;
    onUpdateComment?: (commentId: string, updates: Partial<Comment>) => Promise<void>;
    isOverlayMode?: boolean;
    activeCommentId?: string | null;
    onSetActiveComment?: (commentId: string | null) => void;
}

export function AnnotationCanvas({
    targetUrl,
    comments,
    onAddComment,
    onUpdateComment,
    isOverlayMode = false,
    activeCommentId = null,
    onSetActiveComment,
}: AnnotationCanvasProps) {
    const [isPinMode, setIsPinMode] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
    const [tempPin, setTempPin] = useState<{ x: number; y: number; width?: number; height?: number } | null>(null);
    const [newComment, setNewComment] = useState({
        message: "",
        authorName: "",
        category: "coding",
        status: "pending",
    });
    const [localActivePinId, setLocalActivePinId] = useState<string | null>(null);
    const activePinId = activeCommentId !== undefined ? activeCommentId : localActivePinId;
    const setActivePinId = onSetActiveComment || setLocalActivePinId;

    // For moving existing pins/areas
    const [movingCommentId, setMovingCommentId] = useState<string | null>(null);
    const [moveStart, setMoveStart] = useState<{ x: number; y: number } | null>(null);

    // For resizing areas
    const [resizingCommentId, setResizingCommentId] = useState<string | null>(null);
    const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
    const [resizeStart, setResizeStart] = useState<{ x: number; y: number; origPosX: number; origPosY: number; origWidth: number; origHeight: number } | null>(null);
    const [viewport, setViewport] = useState<"responsive" | "desktop" | "mobile">("responsive");

    const handleOverlayMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPinMode) return;
        if (activePinId) {
            setActivePinId(null);
            return;
        }
        if (isAdding) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setIsDragging(true);
        setDragStart({ x, y });
        setDragEnd({ x, y });
    };

    const handleOverlayMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !dragStart) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setDragEnd({ x, y });
    };

    const handleOverlayMouseUp = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !dragStart || !dragEnd) return;

        const width = Math.abs(dragEnd.x - dragStart.x);
        const height = Math.abs(dragEnd.y - dragStart.y);

        // If drag distance is very small, treat as click (pin)
        if (width < 0.01 && height < 0.01) {
            setTempPin({ x: dragStart.x, y: dragStart.y });
        } else {
            // Area selection
            const x = Math.min(dragStart.x, dragEnd.x);
            const y = Math.min(dragStart.y, dragEnd.y);
            setTempPin({ x, y, width, height });
        }

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setIsAdding(true);
    };

    // Handle moving existing comments
    const handleCommentMouseDown = (e: MouseEvent, commentId: string, comment: Comment) => {
        if (!isPinMode) return;
        e.stopPropagation();

        // Get the overlay element (not the pin's parent)
        const overlay = e.currentTarget.closest('.annotation-overlay');
        if (!overlay) return;

        const rect = overlay.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setMovingCommentId(commentId);
        setMoveStart({ x, y });
    };

    const handleCommentMouseMove = (e: MouseEvent) => {
        if (!movingCommentId || !moveStart || !onUpdateComment) return;

        const comment = comments.find(c => c.id === movingCommentId);
        if (!comment) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        const deltaX = currentX - moveStart.x;
        const deltaY = currentY - moveStart.y;

        // Update position
        onUpdateComment(movingCommentId, {
            posX: comment.posX + deltaX,
            posY: comment.posY + deltaY,
        });

        setMoveStart({ x: currentX, y: currentY });
    };

    const handleCommentMouseUp = () => {
        setMovingCommentId(null);
        setMoveStart(null);
    };

    // Handle resizing areas
    const handleResizeMouseDown = (e: MouseEvent, commentId: string, comment: Comment, handle: 'tl' | 'tr' | 'bl' | 'br') => {
        if (!isPinMode || !comment.width || !comment.height) return;
        e.stopPropagation();

        // Get the overlay element (not the handle's parent)
        const overlay = e.currentTarget.closest('.annotation-overlay');
        if (!overlay) return;

        const rect = overlay.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setResizingCommentId(commentId);
        setResizeHandle(handle);
        setResizeStart({
            x,
            y,
            origPosX: comment.posX,
            origPosY: comment.posY,
            origWidth: comment.width,
            origHeight: comment.height,
        });
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        if (!resizingCommentId || !resizeHandle || !resizeStart || !onUpdateComment) return;

        const comment = comments.find(c => c.id === resizingCommentId);
        if (!comment || !comment.width || !comment.height) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        const deltaX = currentX - resizeStart.x;
        const deltaY = currentY - resizeStart.y;

        let newPosX = resizeStart.origPosX;
        let newPosY = resizeStart.origPosY;
        let newWidth = resizeStart.origWidth;
        let newHeight = resizeStart.origHeight;

        // Adjust based on which handle is being dragged
        if (resizeHandle === 'tl') {
            newPosX = resizeStart.origPosX + deltaX;
            newPosY = resizeStart.origPosY + deltaY;
            newWidth = resizeStart.origWidth - deltaX;
            newHeight = resizeStart.origHeight - deltaY;
        } else if (resizeHandle === 'tr') {
            newPosY = resizeStart.origPosY + deltaY;
            newWidth = resizeStart.origWidth + deltaX;
            newHeight = resizeStart.origHeight - deltaY;
        } else if (resizeHandle === 'bl') {
            newPosX = resizeStart.origPosX + deltaX;
            newWidth = resizeStart.origWidth - deltaX;
            newHeight = resizeStart.origHeight + deltaY;
        } else if (resizeHandle === 'br') {
            newWidth = resizeStart.origWidth + deltaX;
            newHeight = resizeStart.origHeight + deltaY;
        }

        // Ensure minimum size
        if (newWidth > 0.02 && newHeight > 0.02) {
            onUpdateComment(resizingCommentId, {
                posX: newPosX,
                posY: newPosY,
                width: newWidth,
                height: newHeight,
            });
        }
    };

    const handleResizeMouseUp = () => {
        setResizingCommentId(null);
        setResizeHandle(null);
        setResizeStart(null);
    };

    const handleSave = async () => {
        if (!tempPin) return;
        await onAddComment({
            message: newComment.message,
            authorName: newComment.authorName,
            category: newComment.category as Comment["category"],
            status: newComment.status as Comment["status"],
            posX: tempPin.x,
            posY: tempPin.y,
            width: tempPin.width,
            height: tempPin.height,
            isCompleted: false,
            viewport: viewport === "mobile" ? "mobile" : "desktop",
        });
        setIsAdding(false);
        setTempPin(null);
        setNewComment({
            message: "",
            authorName: "",
            category: "coding",
            status: "pending",
        });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setTempPin(null);
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
    };

    // Filter out completed comments
    const visibleComments = comments.filter((c) => !c.isCompleted);

    // Calculate modal position to avoid overlap with sidebar and selected area
    const getModalPosition = (comment: typeof tempPin) => {
        if (!comment) return { left: 0, top: 0 };

        const baseLeft = comment.x * 100;
        const baseTop = comment.y * 100;

        // If area is selected, show modal below the area
        if (comment.width && comment.height) {
            const bottomOfArea = (comment.y + comment.height) * 100;

            // If too far right (>60%), show modal on the left side of area
            if (baseLeft > 60) {
                return {
                    right: `${(1 - comment.x) * 100}%`,
                    top: `${bottomOfArea}%`,
                    left: 'auto',
                    marginTop: '8px'
                };
            }

            return {
                left: `${baseLeft}%`,
                top: `${bottomOfArea}%`,
                right: 'auto',
                marginTop: '8px'
            };
        }

        // For pins, check if too far right
        if (baseLeft > 70) {
            return {
                right: `${(1 - comment.x) * 100}%`,
                top: `${baseTop}%`,
                left: 'auto'
            };
        }

        return {
            left: `${baseLeft}%`,
            top: `${baseTop}%`,
            right: 'auto'
        };
    };

    return (
        <div className="flex h-full flex-col bg-gray-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <Button
                        variant={isPinMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsPinMode(!isPinMode)}
                        className="gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        {isPinMode ? "ピンモード: ON" : "ピンモード: OFF"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        {isPinMode ? "クリックまたはドラッグでコメントを追加・移動" : "閲覧モード"}
                    </span>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <Button
                        variant={viewport === "mobile" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewport("mobile")}
                        className="h-7 px-3 text-xs gap-2"
                        title="Mobile (375px)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                        SP
                    </Button>
                    <Button
                        variant={viewport === "desktop" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewport("desktop")}
                        className="h-7 px-3 text-xs gap-2"
                        title="Desktop (1280px)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
                        PC
                    </Button>
                    <Button
                        variant={viewport === "responsive" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewport("responsive")}
                        className="h-7 px-3 text-xs gap-2"
                        title="Responsive (100%)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" /><path d="M9 2v20" /><path d="M15 2v20" /></svg>
                        Full
                    </Button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <div
                    className={cn(
                        "relative mx-auto bg-white shadow-2xl transition-all duration-300 ease-in-out",
                        viewport === "mobile" ? "w-[375px]" : viewport === "desktop" ? "w-[1280px]" : "w-full"
                    )}
                    style={{ height: "3000px" }}
                >
                    {/* Iframe */}
                    <iframe
                        src={targetUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        title="Target Website"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />

                    {/* Dark overlay when overlay mode is on */}
                    {isOverlayMode && (
                        <div
                            className="absolute inset-0 w-full h-full pointer-events-none z-10"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                        />
                    )}

                    {/* Overlay */}
                    <div
                        className="annotation-overlay absolute inset-0 w-full h-full z-20"
                        style={{ cursor: isPinMode ? 'crosshair' : 'default' }}
                        onMouseDown={handleOverlayMouseDown}
                        onMouseMove={(e) => {
                            handleOverlayMouseMove(e);
                            handleCommentMouseMove(e);
                            handleResizeMouseMove(e);
                        }}
                        onMouseUp={(e) => {
                            handleOverlayMouseUp(e);
                            handleCommentMouseUp();
                            handleResizeMouseUp();
                        }}
                    >
                        {/* Drag selection rectangle */}
                        {isDragging && dragStart && dragEnd && (
                            <div
                                className="absolute border-4 border-dashed pointer-events-none"
                                style={{
                                    left: `${Math.min(dragStart.x, dragEnd.x) * 100}%`,
                                    top: `${Math.min(dragStart.y, dragEnd.y) * 100}%`,
                                    width: `${Math.abs(dragEnd.x - dragStart.x) * 100}%`,
                                    height: `${Math.abs(dragEnd.y - dragStart.y) * 100}%`,
                                    borderColor: '#3b82f6',
                                    boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px #3b82f6',
                                }}
                            />
                        )}

                        {/* Existing Pins and Areas */}
                        {visibleComments.map((comment) => (
                            <div key={comment.id}>
                                {comment.width && comment.height ? (
                                    // Area selection with resize handles
                                    <div
                                        className={cn(
                                            "absolute border-4 border-dashed cursor-pointer pointer-events-auto",
                                            resizingCommentId === comment.id && "border-[6px]"
                                        )}
                                        style={{
                                            left: `${comment.posX * 100}%`,
                                            top: `${comment.posY * 100}%`,
                                            width: `${comment.width * 100}%`,
                                            height: `${comment.height * 100}%`,
                                            borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1",
                                            boxShadow: `0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px ${comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1"}`,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActivePinId(activePinId === comment.id ? null : comment.id);
                                        }}
                                    >
                                        {/* Pin at center of area - with white outline for visibility */}
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-move"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleCommentMouseDown(e, comment.id, comment);
                                            }}
                                            style={{ pointerEvents: 'auto' }}
                                        >
                                            <div className="relative">
                                                {/* White outline */}
                                                <MapPin
                                                    className="absolute h-8 w-8 text-white fill-white"
                                                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                                />
                                                {/* Colored pin on top */}
                                                <MapPin
                                                    className={cn(
                                                        "relative h-8 w-8 cursor-move transition-transform hover:scale-110",
                                                        comment.status === "completed"
                                                            ? "text-gray-500 fill-gray-500"
                                                            : comment.status === "in-progress"
                                                                ? "text-sky-500 fill-sky-500"
                                                                : "text-slate-400 fill-slate-400"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Resize handles - with white stroke for visibility */}
                                        {isPinMode && (
                                            <>
                                                {/* Top-left */}
                                                <div
                                                    className="absolute -left-2 -top-2 w-5 h-5 bg-white border-2 cursor-nwse-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                    style={{
                                                        borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1",
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleResizeMouseDown(e, comment.id, comment, 'tl');
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {/* Top-right */}
                                                <div
                                                    className="absolute -right-2 -top-2 w-5 h-5 bg-white border-2 cursor-nesw-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                    style={{
                                                        borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1",
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleResizeMouseDown(e, comment.id, comment, 'tr');
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {/* Bottom-left */}
                                                <div
                                                    className="absolute -left-2 -bottom-2 w-5 h-5 bg-white border-2 cursor-nesw-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                    style={{
                                                        borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1",
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleResizeMouseDown(e, comment.id, comment, 'bl');
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {/* Bottom-right */}
                                                <div
                                                    className="absolute -right-2 -bottom-2 w-5 h-5 bg-white border-2 cursor-nwse-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                    style={{
                                                        borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1",
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleResizeMouseDown(e, comment.id, comment, 'br');
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </>
                                        )}

                                        {activePinId === comment.id && (
                                            <div className="absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border bg-white p-4 shadow-xl" style={{ borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1" }}>
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <select
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1",
                                                            comment.category === "coding"
                                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                                        )}
                                                        value={comment.category}
                                                        onChange={(e) => onUpdateComment?.(comment.id, { category: e.target.value as any })}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="coding">コーディング</option>
                                                        <option value="design">デザイン</option>
                                                    </select>
                                                    <select
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1",
                                                            comment.status === "completed"
                                                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                : comment.status === "in-progress"
                                                                    ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        )}
                                                        value={comment.status}
                                                        onChange={(e) => onUpdateComment?.(comment.id, { status: e.target.value as any })}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="pending">未対応</option>
                                                        <option value="in-progress">対応中</option>
                                                        <option value="completed">完了</option>
                                                    </select>
                                                </div>
                                                <p className="text-base font-medium text-gray-900 mb-2">{comment.message}</p>
                                                {comment.authorName && (
                                                    <p className="text-sm text-gray-600">
                                                        👤 {comment.authorName}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Pin only - with white outline for visibility
                                    <div
                                        className={cn(
                                            "absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto",
                                            movingCommentId === comment.id && "scale-125"
                                        )}
                                        style={{
                                            left: `${comment.posX * 100}%`,
                                            top: `${comment.posY * 100}%`,
                                        }}
                                    >
                                        <div
                                            className="relative w-10 h-10 cursor-move"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActivePinId(activePinId === comment.id ? null : comment.id);
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleCommentMouseDown(e, comment.id, comment);
                                            }}
                                        >
                                            {/* White outline */}
                                            <MapPin
                                                className="absolute inset-0 h-10 w-10 text-white fill-white pointer-events-none"
                                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                            />
                                            {/* Colored pin on top */}
                                            <MapPin
                                                className={cn(
                                                    "absolute inset-0 h-10 w-10 transition-transform hover:scale-110 pointer-events-none",
                                                    comment.status === "completed"
                                                        ? "text-gray-500 fill-gray-500"
                                                        : comment.status === "in-progress"
                                                            ? "text-sky-500 fill-sky-500"
                                                            : "text-slate-400 fill-slate-400"
                                                )}
                                            />
                                        </div>
                                        {activePinId === comment.id && (
                                            <div className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-lg border bg-white p-4 shadow-xl" style={{ borderColor: comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#38bdf8" : "#cbd5e1" }}>
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <select
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1",
                                                            comment.category === "coding"
                                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                                        )}
                                                        value={comment.category}
                                                        onChange={(e) => onUpdateComment?.(comment.id, { category: e.target.value as any })}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="coding">コーディング</option>
                                                        <option value="design">デザイン</option>
                                                    </select>
                                                    <select
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1",
                                                            comment.status === "completed"
                                                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                : comment.status === "in-progress"
                                                                    ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        )}
                                                        value={comment.status}
                                                        onChange={(e) => onUpdateComment?.(comment.id, { status: e.target.value as any })}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="pending">未対応</option>
                                                        <option value="in-progress">対応中</option>
                                                        <option value="completed">完了</option>
                                                    </select>
                                                </div>
                                                <p className="text-base font-medium text-gray-900 mb-2">{comment.message}</p>
                                                {comment.authorName && (
                                                    <p className="text-sm text-gray-600">
                                                        👤 {comment.authorName}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Temp Pin/Area & Modal */}
                        {isAdding && tempPin && (
                            <div className="pointer-events-auto">
                                {/* Show temp area or pin */}
                                {tempPin.width && tempPin.height ? (
                                    <div
                                        className="absolute border-4 border-dashed border-primary"
                                        style={{
                                            left: `${tempPin.x * 100}%`,
                                            top: `${tempPin.y * 100}%`,
                                            width: `${tempPin.width * 100}%`,
                                            height: `${tempPin.height * 100}%`,
                                            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px #3b82f6',
                                        }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <div className="relative">
                                                <MapPin className="absolute h-8 w-8 text-white fill-white animate-bounce" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                                <MapPin className="relative h-8 w-8 text-primary fill-primary animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative -translate-x-1/2 -translate-y-1/2" style={{ left: `${tempPin.x * 100}%`, top: `${tempPin.y * 100}%` }}>
                                        <MapPin className="absolute h-10 w-10 text-white fill-white animate-bounce" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                        <MapPin className="relative h-10 w-10 text-primary fill-primary animate-bounce" />
                                    </div>
                                )}

                                {/* Comment Modal */}
                                <div
                                    className="absolute w-80 rounded-lg border bg-background p-4 shadow-lg bg-white z-20"
                                    style={getModalPosition(tempPin)}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <h4 className="font-semibold">Add Comment</h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={handleCancel}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        <textarea
                                            placeholder="Message"
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={newComment.message}
                                            onChange={(e) =>
                                                setNewComment({ ...newComment, message: e.target.value })
                                            }
                                        />
                                        <Input
                                            placeholder="Your Name (Optional)"
                                            value={newComment.authorName}
                                            onChange={(e) =>
                                                setNewComment({ ...newComment, authorName: e.target.value })
                                            }
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={newComment.category}
                                                onChange={(e) =>
                                                    setNewComment({ ...newComment, category: e.target.value })
                                                }
                                            >
                                                <option value="coding">🟢 コーディング</option>
                                                <option value="design">🟠 デザイン</option>
                                            </select>
                                            <select
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={newComment.status}
                                                onChange={(e) =>
                                                    setNewComment({ ...newComment, status: e.target.value })
                                                }
                                            >
                                                <option value="pending">⚪ 未対応</option>
                                                <option value="in-progress">🔵 対応中</option>
                                                <option value="completed">⚫ 完了</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" onClick={handleSave}>
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
