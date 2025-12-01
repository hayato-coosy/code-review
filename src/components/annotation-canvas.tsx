"use client";

import { useState, useRef, MouseEvent } from "react";
import { Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, X, PlusCircle, Eye, EyeOff, ArrowDown, Pencil } from "lucide-react";
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
    viewport?: "desktop" | "mobile";
    onViewportChange?: (viewport: "desktop" | "mobile") => void;
    onToggleOverlay?: () => void;
    canvasHeight?: number;
    onCanvasHeightChange?: (height: number) => void;
}

export function AnnotationCanvas({
    targetUrl,
    comments,
    onAddComment,
    onUpdateComment,
    isOverlayMode = false,
    activeCommentId = null,
    onSetActiveComment,
    viewport,
    onViewportChange,
    onToggleOverlay,
    canvasHeight,
    onCanvasHeightChange,
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

    // For moving existing pins/areas
    // For moving existing pins/areas
    const [movingCommentId, setMovingCommentId] = useState<string | null>(null);

    // Refs for performance (avoiding getBoundingClientRect on every move)
    const dragInfoRef = useRef<{
        startX: number;
        startY: number;
        initialCommentX: number;
        initialCommentY: number;
        overlayRect: DOMRect;
        currentX: number;
        currentY: number;
    } | null>(null);

    // For resizing areas
    const [resizingCommentId, setResizingCommentId] = useState<string | null>(null);
    const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

    const resizeInfoRef = useRef<{
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialWidth: number;
        initialHeight: number;
        overlayRect: DOMRect;
        currentX: number;
        currentY: number;
        currentWidth: number;
        currentHeight: number;
    } | null>(null);

    // Helper to get coordinates from mouse or touch event
    const getClientCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY,
            };
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            return {
                clientX: e.changedTouches[0].clientX,
                clientY: e.changedTouches[0].clientY,
            };
        }
        return {
            clientX: (e as any).clientX,
            clientY: (e as any).clientY,
        };
    };

    // Handle clicking on the overlay to add a pin
    const handleOverlayMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPinMode) return;
        if (activePinId) {
            setActivePinId(null);
            return;
        }
        if (isAdding) return;
        // Don't trigger if clicking on a comment or modal
        if ((e.target as HTMLElement).closest('.comment-pin') || (e.target as HTMLElement).closest('.comment-modal')) return;

        const overlay = e.currentTarget;
        const rect = overlay.getBoundingClientRect();
        const { clientX, clientY } = getClientCoordinates(e);
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        setIsDragging(true);
        setDragStart({ x, y });
        setDragEnd({ x, y });
    };

    const handleOverlayMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragStart) return;

        const overlay = e.currentTarget;
        const rect = overlay.getBoundingClientRect();
        const { clientX, clientY } = getClientCoordinates(e);
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

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
    const handleCommentMouseDown = (e: React.MouseEvent | React.TouchEvent, commentId: string, comment: Comment) => {
        console.log('handleCommentMouseDown', commentId);
        if (!isPinMode) {
            console.log('Not in pin mode');
            return;
        }
        e.stopPropagation();

        // Get the overlay element (not the pin's parent)
        let overlay = e.currentTarget.closest('.annotation-overlay');
        if (!overlay) {
            // Fallback: try to find the overlay in the document
            overlay = document.querySelector('.annotation-overlay');
        }
        if (!overlay) {
            console.error('Overlay not found');
            return;
        }

        const rect = overlay.getBoundingClientRect();
        console.log('Overlay rect:', rect);
        const { clientX, clientY } = getClientCoordinates(e);

        // Store initial values in ref
        dragInfoRef.current = {
            startX: clientX,
            startY: clientY,
            initialCommentX: comment.posX,
            initialCommentY: comment.posY,
            overlayRect: rect,
            currentX: comment.posX,
            currentY: comment.posY
        };
        console.log('Drag info set:', dragInfoRef.current);

        setMovingCommentId(commentId);
    };

    const handleCommentMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!movingCommentId) return;

        if (!dragInfoRef.current) {
            console.warn('Missing dragInfoRef during move');
            return;
        }

        const { startX, startY, initialCommentX, initialCommentY, overlayRect } = dragInfoRef.current;
        const { clientX, clientY } = getClientCoordinates(e);

        // Calculate delta in percentage relative to overlay size
        const deltaX = (clientX - startX) / overlayRect.width;
        const deltaY = (clientY - startY) / overlayRect.height;

        const newX = initialCommentX + deltaX;
        const newY = initialCommentY + deltaY;

        // Update ref
        dragInfoRef.current.currentX = newX;
        dragInfoRef.current.currentY = newY;

        // Direct DOM update
        const el = document.getElementById(`comment-${movingCommentId}`);
        if (el) {
            el.style.left = `${newX * 100}%`;
            el.style.top = `${newY * 100}%`;
        }
    };

    const handleCommentMouseUp = () => {
        if (movingCommentId && dragInfoRef.current && onUpdateComment) {
            onUpdateComment(movingCommentId, {
                posX: dragInfoRef.current.currentX,
                posY: dragInfoRef.current.currentY,
            });
        }
        setMovingCommentId(null);
        dragInfoRef.current = null;
    };

    // Handle resizing areas
    const handleResizeMouseDown = (e: React.MouseEvent | React.TouchEvent, commentId: string, comment: Comment, handle: 'tl' | 'tr' | 'bl' | 'br') => {
        if (!isPinMode || !comment.width || !comment.height) return;
        e.stopPropagation();

        // Get the overlay element (not the handle's parent)
        const overlay = e.currentTarget.closest('.annotation-overlay');
        if (!overlay) return;

        const rect = overlay.getBoundingClientRect();
        const { clientX, clientY } = getClientCoordinates(e);

        resizeInfoRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: comment.posX,
            initialY: comment.posY,
            initialWidth: comment.width,
            initialHeight: comment.height,
            overlayRect: rect,
            currentX: comment.posX,
            currentY: comment.posY,
            currentWidth: comment.width,
            currentHeight: comment.height
        };

        setResizingCommentId(commentId);
        setResizeHandle(handle);
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        if (!resizingCommentId || !resizeHandle || !resizeInfoRef.current) return;

        const { startX, startY, initialX, initialY, initialWidth, initialHeight, overlayRect } = resizeInfoRef.current;
        const { clientX, clientY } = getClientCoordinates(e as any);

        const deltaX = (clientX - startX) / overlayRect.width;
        const deltaY = (clientY - startY) / overlayRect.height;

        let newPosX = initialX;
        let newPosY = initialY;
        let newWidth = initialWidth;
        let newHeight = initialHeight;

        // Adjust based on which handle is being dragged
        if (resizeHandle === 'tl') {
            newPosX = initialX + deltaX;
            newPosY = initialY + deltaY;
            newWidth = initialWidth - deltaX;
            newHeight = initialHeight - deltaY;
        } else if (resizeHandle === 'tr') {
            newPosY = initialY + deltaY;
            newWidth = initialWidth + deltaX;
            newHeight = initialHeight - deltaY;
        } else if (resizeHandle === 'bl') {
            newPosX = initialX + deltaX;
            newWidth = initialWidth - deltaX;
            newHeight = initialHeight + deltaY;
        } else if (resizeHandle === 'br') {
            newWidth = initialWidth + deltaX;
            newHeight = initialHeight + deltaY;
        }

        // Ensure minimum size
        if (newWidth > 0.02 && newHeight > 0.02) {
            resizeInfoRef.current.currentX = newPosX;
            resizeInfoRef.current.currentY = newPosY;
            resizeInfoRef.current.currentWidth = newWidth;
            resizeInfoRef.current.currentHeight = newHeight;

            const el = document.getElementById(`comment-${resizingCommentId}`);
            if (el) {
                el.style.left = `${newPosX * 100}%`;
                el.style.top = `${newPosY * 100}%`;
                el.style.width = `${newWidth * 100}%`;
                el.style.height = `${newHeight * 100}%`;
            }
        }
    };

    const handleResizeMouseUp = () => {
        if (resizingCommentId && resizeInfoRef.current && onUpdateComment) {
            onUpdateComment(resizingCommentId, {
                posX: resizeInfoRef.current.currentX,
                posY: resizeInfoRef.current.currentY,
                width: resizeInfoRef.current.currentWidth,
                height: resizeInfoRef.current.currentHeight,
            });
        }
        setResizingCommentId(null);
        setResizeHandle(null);
        resizeInfoRef.current = null;
    };

    const handleSave = async () => {
        if (!tempPin) return;

        // Debug: Log viewport value
        console.log('Current viewport when saving:', viewport);
        const targetViewport = viewport === "mobile" ? "mobile" : "desktop";
        console.log('Saving comment with viewport:', targetViewport);

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
            viewport: targetViewport,
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

    // Filter out completed comments and comments not matching current viewport
    const visibleComments = comments.filter((c) => {
        // Hide completed tasks (check both status and isCompleted for backward compatibility)
        if (c.status === "completed" || c.isCompleted) return false;

        const commentViewport = c.viewport || "desktop";
        const currentViewport = viewport === "mobile" ? "mobile" : "desktop";

        return commentViewport === currentViewport;
    });

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

    const currentHeight = canvasHeight || 3000;

    return (
        <div className="flex h-full flex-col bg-gray-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <Button
                        variant={isPinMode ? "default" : "outline"}
                        size="default"
                        onClick={() => setIsPinMode(!isPinMode)}
                        className="gap-2"
                    >
                        <PlusCircle className="h-5 w-5" />
                        {isPinMode ? "ピンモード: ON" : "ピンモード: OFF"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {isPinMode ? "クリックまたはドラッグでコメントを追加・移動" : "閲覧モード"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isOverlayMode ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleOverlay}
                        className="gap-2 hidden" // Hidden as per request
                        title="Toggle Dark Overlay"
                    >
                        {isOverlayMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        <span className="hidden sm:inline">{isOverlayMode ? "暗転: ON" : "暗転: OFF"}</span>
                    </Button>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewportChange?.("mobile")}
                            className={cn(
                                "h-7 px-3 text-xs gap-2 transition-all",
                                viewport === "mobile"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    : "hover:bg-gray-200"
                            )}
                            title="Mobile (375px)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                            SP <span className={viewport === "mobile" ? "opacity-90" : "opacity-70"}>(375px)</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewportChange?.("desktop")}
                            className={cn(
                                "h-7 px-3 text-xs gap-2 transition-all",
                                viewport === "desktop"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    : "hover:bg-gray-200"
                            )}
                            title="Desktop (1280px)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
                            PC <span className={viewport === "desktop" ? "opacity-90" : "opacity-70"}>(1280px)</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <div
                    className={cn(
                        "relative mx-auto bg-white shadow-2xl transition-all duration-300 ease-in-out",
                        viewport === "mobile" ? "w-[375px]" : "w-[1280px]"
                    )}
                    style={{ height: `${currentHeight}px` }}
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

                    {/* Extend Height Button */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-8 pt-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none z-50">
                        <Button
                            variant="secondary"
                            onClick={() => onCanvasHeightChange?.(currentHeight + 500)}
                            className="gap-2 shadow-lg pointer-events-auto bg-white hover:bg-gray-100 border text-gray-700"
                        >
                            <ArrowDown className="h-4 w-4" />
                            高さを増やす (+500px)
                        </Button>
                    </div>

                    {/* Overlay */}
                    <div
                        className="annotation-overlay absolute inset-0 w-full h-full z-20"
                        style={{ cursor: isPinMode ? 'crosshair' : 'default' }}
                        onMouseDown={handleOverlayMouseDown}
                        onTouchStart={handleOverlayMouseDown}
                        onMouseMove={(e) => {
                            handleOverlayMouseMove(e);
                            handleCommentMouseMove(e);
                            handleResizeMouseMove(e as any);
                        }}
                        onTouchMove={(e) => {
                            handleOverlayMouseMove(e);
                            handleCommentMouseMove(e);
                            handleResizeMouseMove(e as any);
                        }}
                        onMouseUp={(e) => {
                            handleOverlayMouseUp(e);
                            handleCommentMouseUp();
                            handleResizeMouseUp();
                        }}
                        onTouchEnd={(e) => {
                            handleOverlayMouseUp(e as any);
                            handleCommentMouseUp();
                            handleResizeMouseUp();
                        }}
                    >
                        {/* Drag selection rectangle */}
                        {isDragging && dragStart && dragEnd && (
                            <div
                                className="absolute border-2 border-solid pointer-events-none bg-blue-500/10"
                                style={{
                                    left: `${Math.min(dragStart.x, dragEnd.x) * 100}%`,
                                    top: `${Math.min(dragStart.y, dragEnd.y) * 100}%`,
                                    width: `${Math.abs(dragEnd.x - dragStart.x) * 100}%`,
                                    height: `${Math.abs(dragEnd.y - dragStart.y) * 100}%`,
                                    borderColor: '#3b82f6',
                                }}
                            />
                        )}

                        {/* Existing Pins and Areas */}
                        {visibleComments.map((comment) => {
                            const isMoving = movingCommentId === comment.id;
                            const isResizing = resizingCommentId === comment.id;

                            const posX = comment.posX;
                            const posY = comment.posY;
                            const width = comment.width;
                            const height = comment.height;

                            const statusColor = comment.status === "completed" ? "#9ca3af" : comment.status === "in-progress" ? "#3b82f6" : "#ef4444";
                            const statusBg = comment.status === "completed" ? "rgba(156, 163, 175, 0.1)" : comment.status === "in-progress" ? "rgba(59, 130, 246, 0.1)" : "rgba(239, 68, 68, 0.1)";

                            return (
                                <div key={comment.id}>
                                    {width && height ? (
                                        // Area selection with resize handles
                                        <div
                                            id={`comment-${comment.id}`}
                                            className={cn(
                                                "absolute border-2 border-solid cursor-pointer pointer-events-auto transition-colors",
                                                resizingCommentId === comment.id && "border-[3px]"
                                            )}
                                            style={{
                                                left: `${posX * 100}%`,
                                                top: `${posY * 100}%`,
                                                width: `${width * 100}%`,
                                                height: `${height * 100}%`,
                                                borderColor: statusColor,
                                                backgroundColor: statusBg,
                                                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)',
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
                                                onTouchStart={(e) => {
                                                    e.stopPropagation();
                                                    handleCommentMouseDown(e, comment.id, comment);
                                                }}
                                                style={{ pointerEvents: 'auto' }}
                                            >
                                                <div className="relative">
                                                    {/* White outline */}
                                                    <MapPin
                                                        className="absolute w-6 h-6 md:w-8 md:h-8 text-white fill-white"
                                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                                    />
                                                    {/* Colored pin on top */}
                                                    <MapPin
                                                        className={cn(
                                                            "w-6 h-6 md:w-8 md:h-8 drop-shadow-lg",
                                                            comment.status === "completed"
                                                                ? "text-gray-500 fill-gray-500"
                                                                : comment.status === "in-progress"
                                                                    ? "text-blue-600 fill-blue-600"
                                                                    : "text-red-600 fill-red-600"
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
                                                            borderColor: statusColor,
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'tl');
                                                        }}
                                                        onTouchStart={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'tl');
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {/* Top-right */}
                                                    <div
                                                        className="absolute -right-2 -top-2 w-5 h-5 bg-white border-2 cursor-nesw-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                        style={{
                                                            borderColor: statusColor,
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'tr');
                                                        }}
                                                        onTouchStart={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'tr');
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {/* Bottom-left */}
                                                    <div
                                                        className="absolute -left-2 -bottom-2 w-5 h-5 bg-white border-2 cursor-nesw-resize z-10 hover:scale-125 transition-transform rounded-full"
                                                        style={{
                                                            borderColor: statusColor,
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'bl');
                                                        }}
                                                        onTouchStart={(e) => {
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
                                                        onTouchStart={(e) => {
                                                            e.stopPropagation();
                                                            handleResizeMouseDown(e, comment.id, comment, 'br');
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </>
                                            )}

                                            {activePinId === comment.id && (
                                                <div
                                                    className="absolute z-50 w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-2xl cursor-default"
                                                    style={{
                                                        ...getModalPosition({ x: comment.posX, y: comment.posY, width: comment.width, height: comment.height })
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                >
                                                    {/* Header: Author & Actions */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
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
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-900 leading-none">
                                                                    {comment.authorName || "Anonymous"}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 mt-1">
                                                                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {editingCommentId !== comment.id && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                                                    onClick={() => handleStartEdit(comment)}
                                                                    title="Edit comment"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                                                onClick={() => setActivePinId(null)}
                                                                title="Close"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Body: Content */}
                                                    <div className="mb-4">
                                                        {editingCommentId === comment.id ? (
                                                            <div className="space-y-3">
                                                                <textarea
                                                                    className="w-full min-h-[80px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
                                                                    value={editMessage}
                                                                    onChange={(e) => setEditMessage(e.target.value)}
                                                                    autoFocus
                                                                    placeholder="コメントを入力..."
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={handleCancelEdit}
                                                                        className="h-8 px-3 text-gray-500 hover:text-gray-900"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleSaveEdit(comment.id)}
                                                                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md"
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                                {comment.message}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Footer: Metadata Badges */}
                                                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                                        <select
                                                            className={cn(
                                                                "h-7 text-xs font-semibold px-3 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0 appearance-none text-center min-w-[90px]",
                                                                comment.category === "coding"
                                                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                                    : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                                            )}
                                                            value={comment.category}
                                                            onChange={(e) => onUpdateComment?.(comment.id, { category: e.target.value as any })}
                                                        >
                                                            <option value="coding">コーディング</option>
                                                            <option value="design">デザイン</option>
                                                        </select>
                                                        <select
                                                            className={cn(
                                                                "h-7 text-xs font-semibold px-3 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0 appearance-none text-center min-w-[75px]",
                                                                comment.status === "completed"
                                                                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                                                    : comment.status === "in-progress"
                                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                                        : "bg-red-100 text-red-800 hover:bg-red-200"
                                                            )}
                                                            value={comment.status}
                                                            onChange={(e) => onUpdateComment?.(comment.id, { status: e.target.value as any })}
                                                        >
                                                            <option value="pending">未対応</option>
                                                            <option value="in-progress">対応中</option>
                                                            <option value="completed">完了</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Pin only - with white outline for visibility
                                        <div
                                            id={`comment-${comment.id}`}
                                            className={cn(
                                                "absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto",
                                                movingCommentId === comment.id && "scale-125"
                                            )}
                                            style={{
                                                left: `${posX * 100}%`,
                                                top: `${posY * 100}%`,
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
                                                onTouchStart={(e) => {
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
                                                            ? "text-gray-400 fill-gray-400"
                                                            : comment.status === "in-progress"
                                                                ? "text-blue-500 fill-blue-500"
                                                                : "text-red-500 fill-red-500"
                                                    )}
                                                />
                                            </div>
                                            {activePinId === comment.id && (
                                                <div
                                                    className="absolute z-50 w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-2xl cursor-default"
                                                    style={{
                                                        ...getModalPosition({ x: comment.posX, y: comment.posY, width: comment.width, height: comment.height })
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                >
                                                    {/* Header: Author & Actions */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
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
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-900 leading-none">
                                                                    {comment.authorName || "Anonymous"}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 mt-1">
                                                                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {editingCommentId !== comment.id && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                                                    onClick={() => handleStartEdit(comment)}
                                                                    title="Edit comment"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                                                onClick={() => setActivePinId(null)}
                                                                title="Close"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Body: Content */}
                                                    <div className="mb-4">
                                                        {editingCommentId === comment.id ? (
                                                            <div className="space-y-3">
                                                                <textarea
                                                                    className="w-full min-h-[80px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
                                                                    value={editMessage}
                                                                    onChange={(e) => setEditMessage(e.target.value)}
                                                                    autoFocus
                                                                    placeholder="コメントを入力..."
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={handleCancelEdit}
                                                                        className="h-8 px-3 text-gray-500 hover:text-gray-900"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleSaveEdit(comment.id)}
                                                                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md"
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                                {comment.message}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Footer: Metadata Badges */}
                                                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                                        <select
                                                            className={cn(
                                                                "h-7 text-xs font-semibold px-3 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0 appearance-none text-center min-w-[90px]",
                                                                comment.category === "coding"
                                                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                                    : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                                            )}
                                                            value={comment.category}
                                                            onChange={(e) => onUpdateComment?.(comment.id, { category: e.target.value as any })}
                                                        >
                                                            <option value="coding">コーディング</option>
                                                            <option value="design">デザイン</option>
                                                        </select>
                                                        <select
                                                            className={cn(
                                                                "h-7 text-xs font-semibold px-3 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0 appearance-none text-center min-w-[75px]",
                                                                comment.status === "completed"
                                                                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                                                    : comment.status === "in-progress"
                                                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                                        : "bg-red-100 text-red-800 hover:bg-red-200"
                                                            )}
                                                            value={comment.status}
                                                            onChange={(e) => onUpdateComment?.(comment.id, { status: e.target.value as any })}
                                                        >
                                                            <option value="pending">未対応</option>
                                                            <option value="in-progress">対応中</option>
                                                            <option value="completed">完了</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

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
                                                <MapPin className="absolute w-6 h-6 md:w-8 md:h-8 text-white fill-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                                <MapPin className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-400 animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative -translate-x-1/2 -translate-y-1/2" style={{ left: `${tempPin.x * 100}%`, top: `${tempPin.y * 100}%` }}>
                                        <MapPin className="absolute w-8 h-8 md:w-10 md:h-10 text-white fill-white animate-bounce" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                        <MapPin className="relative w-8 h-8 md:w-10 md:h-10 text-primary fill-primary animate-bounce" />
                                    </div>
                                )}


                                {/* Comment Modal */}
                                <div
                                    className="absolute w-96 rounded-xl border border-gray-100 bg-white p-5 shadow-2xl z-20"
                                    style={getModalPosition(tempPin)}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900">Add Comment</h3>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                            onClick={handleCancel}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Message Input */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">
                                                Message
                                            </label>
                                            <textarea
                                                placeholder="コメントを入力..."
                                                className="flex min-h-[100px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
                                                value={newComment.message}
                                                onChange={(e) =>
                                                    setNewComment({ ...newComment, message: e.target.value })
                                                }
                                            />
                                        </div>

                                        {/* Name Input */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">
                                                Your Name <span className="text-gray-400 font-normal">(Optional)</span>
                                            </label>
                                            <Input
                                                placeholder="名前を入力..."
                                                className="rounded-lg border-gray-200 bg-gray-50 focus:bg-white h-10"
                                                value={newComment.authorName}
                                                onChange={(e) =>
                                                    setNewComment({ ...newComment, authorName: e.target.value })
                                                }
                                            />
                                        </div>

                                        {/* Category & Status */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">
                                                Category & Status
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    className={cn(
                                                        "flex-1 h-9 text-sm font-semibold px-4 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0",
                                                        newComment.category === "coding"
                                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                            : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                                    )}
                                                    value={newComment.category}
                                                    onChange={(e) => setNewComment({ ...newComment, category: e.target.value as 'coding' | 'design' })}
                                                >
                                                    <option value="coding">コーディング</option>
                                                    <option value="design">デザイン</option>
                                                </select>
                                                <select
                                                    className={cn(
                                                        "flex-1 h-9 text-sm font-semibold px-4 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-0",
                                                        newComment.status === "completed"
                                                            ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                                            : newComment.status === "in-progress"
                                                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                                : "bg-red-100 text-red-800 hover:bg-red-200"
                                                    )}
                                                    value={newComment.status}
                                                    onChange={(e) => setNewComment({ ...newComment, status: e.target.value as Comment['status'] })}
                                                >
                                                    <option value="pending">未対応</option>
                                                    <option value="in-progress">対応中</option>
                                                    <option value="completed">完了</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                size="default"
                                                onClick={handleCancel}
                                                className="h-9 px-4 text-gray-600 hover:text-gray-900"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="default"
                                                onClick={handleSave}
                                                className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg"
                                            >
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
