"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { Session, Comment } from "@/types";
import { AnnotationCanvas } from "@/components/annotation-canvas";
import { CommentSidebar } from "@/components/comment-sidebar";
import { Loader2 } from "lucide-react";

interface SessionPageProps {
    params: Promise<{ id: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
    const [id, setId] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

    // Unwrap params
    useEffect(() => {
        params.then((p) => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch Session
                const sessionRes = await fetch(`/api/sessions/${id}`);
                if (!sessionRes.ok) {
                    if (sessionRes.status === 404) {
                        setSession(null);
                        setIsLoading(false);
                        return;
                    }
                    throw new Error("Failed to fetch session");
                }
                const sessionData = await sessionRes.json();
                setSession(sessionData);

                // Fetch Comments
                const commentsRes = await fetch(`/api/sessions/${id}/comments`);
                if (!commentsRes.ok) throw new Error("Failed to fetch comments");
                const commentsData = await commentsRes.json();
                setComments(commentsData.comments);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleAddComment = async (
        newComment: Omit<Comment, "id" | "createdAt" | "sessionId">
    ) => {
        if (!id) return;
        try {
            const res = await fetch(`/api/sessions/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newComment),
            });
            if (!res.ok) throw new Error("Failed to add comment");
            const savedComment = await res.json();
            setComments([...comments, savedComment]);
        } catch (error) {
            console.error(error);
            alert("Failed to save comment");
        }
    };

    const handleToggleComplete = async (commentId: string, isCompleted: boolean) => {
        if (!id) return;
        try {
            const res = await fetch(`/api/sessions/${id}/comments`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId, isCompleted }),
            });
            if (!res.ok) throw new Error("Failed to update comment");
            const updatedComment = await res.json();
            setComments(comments.map((c) => (c.id === commentId ? updatedComment : c)));
        } catch (error) {
            console.error(error);
            alert("Failed to update comment");
        }
    };

    const handleUpdateComment = async (commentId: string, updates: Partial<Comment>) => {
        if (!id) return;
        try {
            const res = await fetch(`/api/sessions/${id}/comments`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId, ...updates }),
            });
            if (!res.ok) throw new Error("Failed to update comment");
            const updatedComment = await res.json();
            setComments(comments.map((c) => (c.id === commentId ? updatedComment : c)));
        } catch (error) {
            console.error(error);
        }
    };

    const handleCommentClick = (comment: Comment) => {
        // Scroll to the comment's position
        const scrollContainer = document.querySelector('.flex-1.overflow-auto');
        if (scrollContainer) {
            const scrollPosition = comment.posY * 3000; // 3000px is the iframe container height
            scrollContainer.scrollTo({
                top: scrollPosition - 100, // Offset by 100px to show context above
                behavior: 'smooth'
            });
        }

        // Open the pin tooltip
        setActiveCommentId(comment.id);
    };

    const [viewport, setViewport] = useState<"responsive" | "desktop" | "mobile">("responsive");

    // Map viewport to sidebar tab (responsive -> desktop)
    const activeTab = viewport === "mobile" ? "mobile" : "desktop";

    const handleTabChange = (tab: "desktop" | "mobile") => {
        setViewport(tab);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return notFound();
    }

    return (
        <div className="flex h-screen">
            <div className="flex-1 overflow-hidden">
                <AnnotationCanvas
                    targetUrl={session.targetUrl}
                    comments={comments}
                    onAddComment={handleAddComment}
                    onUpdateComment={handleUpdateComment}
                    isOverlayMode={isOverlayMode}
                    activeCommentId={activeCommentId}
                    onSetActiveComment={setActiveCommentId}
                    viewport={viewport}
                    onViewportChange={setViewport}
                />
            </div>

            <div className="relative">
                <CommentSidebar
                    comments={comments}
                    onToggleComplete={handleToggleComplete}
                    isOverlayMode={isOverlayMode}
                    onToggleOverlay={() => setIsOverlayMode(!isOverlayMode)}
                    onCommentClick={handleCommentClick}
                    onUpdateComment={handleUpdateComment}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </div>
        </div>
    );
}
