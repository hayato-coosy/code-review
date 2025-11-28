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
        category: "other",
        severity: "INFO",
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
            severity: newComment.severity as Comment["severity"],
            posX: tempPin.x,
            posY: tempPin.y,
            width: tempPin.width,
            height: tempPin.height,
            isCompleted: false,
        });
        setIsAdding(false);
        setTempPin(null);
        setNewComment({
            message: "",
            authorName: "",
            category: "other",
            severity: "INFO",
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
        <div className="relative h-full w-full overflow-auto bg-white">
            {/* Toggle Pin Mode Button */}
            <div className="sticky top-4 left-4 z-30 inline-block">
                <Button
                    variant={isPinMode ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setIsPinMode(!isPinMode)}
                    className="gap-2 shadow-lg"
                >
                    <PlusCircle className="h-4 w-4" />
                    {isPinMode ? "Pin Mode: ON (Drag to Move/Resize)" : "Pin Mode: OFF"}
                </Button>
            </div>

            {/* Iframe Container with fixed height */}
            <div className="relative w-full" style={{ height: "3000px" }}>
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
                                        borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6",
                                        boxShadow: `0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px ${comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6"}`,
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
                                                    comment.severity === "MAJOR"
                                                        ? "text-red-500 fill-red-500"
                                                        : comment.severity === "MINOR"
                                                            ? "text-yellow-500 fill-yellow-500"
                                                            : "text-blue-500 fill-blue-500"
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
                                                    borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6",
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
                                                    borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6",
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
                                                    borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6",
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
                                                    borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6",
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
                                        <div className="absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border-2 bg-white p-4 shadow-2xl" style={{ borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6" }}>
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase px-2 py-1 rounded" style={{
                                                    backgroundColor: comment.severity === "MAJOR" ? "#fee2e2" : comment.severity === "MINOR" ? "#fef3c7" : "#dbeafe",
                                                    color: comment.severity === "MAJOR" ? "#991b1b" : comment.severity === "MINOR" ? "#78350f" : "#1e3a8a"
                                                }}>
                                                    {comment.category}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "text-sm font-bold px-2 py-1 rounded",
                                                        comment.severity === "MAJOR"
                                                            ? "bg-red-100 text-red-800"
                                                            : comment.severity === "MINOR"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-blue-100 text-blue-800"
                                                    )}
                                                >
                                                    {comment.severity}
                                                </span>
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
                                                comment.severity === "MAJOR"
                                                    ? "text-red-500 fill-red-500"
                                                    : comment.severity === "MINOR"
                                                        ? "text-yellow-500 fill-yellow-500"
                                                        : "text-blue-500 fill-blue-500"
                                            )}
                                        />
                                    </div>
                                    {activePinId === comment.id && (
                                        <div className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-lg border-2 bg-white p-4 shadow-2xl" style={{ borderColor: comment.severity === "MAJOR" ? "#ef4444" : comment.severity === "MINOR" ? "#eab308" : "#3b82f6" }}>
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase px-2 py-1 rounded" style={{
                                                    backgroundColor: comment.severity === "MAJOR" ? "#fee2e2" : comment.severity === "MINOR" ? "#fef3c7" : "#dbeafe",
                                                    color: comment.severity === "MAJOR" ? "#991b1b" : comment.severity === "MINOR" ? "#78350f" : "#1e3a8a"
                                                }}>
                                                    {comment.category}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "text-sm font-bold px-2 py-1 rounded",
                                                        comment.severity === "MAJOR"
                                                            ? "bg-red-100 text-red-800"
                                                            : comment.severity === "MINOR"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-blue-100 text-blue-800"
                                                    )}
                                                >
                                                    {comment.severity}
                                                </span>
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
                                            <option value="layout">Layout</option>
                                            <option value="text">Text</option>
                                            <option value="ui">UI</option>
                                            <option value="bug">Bug</option>
                                            <option value="idea">Idea</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={newComment.severity}
                                            onChange={(e) =>
                                                setNewComment({ ...newComment, severity: e.target.value })
                                            }
                                        >
                                            <option value="INFO">Info</option>
                                            <option value="MINOR">Minor</option>
                                            <option value="MAJOR">Major</option>
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
    );
}
