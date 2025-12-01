"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    MousePointer2,
    MapPin,
    Monitor,
    Smartphone,
    Camera,
    Upload,
    Eye,
    EyeOff,
    Globe,
    ImageIcon,
    Loader2
} from "lucide-react";
import { useRef } from "react";

interface AnnotationToolbarProps {
    // State
    mode: "live" | "screenshot";
    onModeChange: (mode: "live" | "screenshot") => void;
    viewport: "desktop" | "mobile";
    onViewportChange: (viewport: "desktop" | "mobile") => void;
    isPinMode: boolean;
    onPinModeChange: (isPin: boolean) => void;
    isOverlayMode: boolean;
    onToggleOverlay: () => void;

    // Screenshot Actions
    isTakingScreenshot: boolean;
    onTakeScreenshot: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, folder: 'desktop' | 'mobile') => void;

    // Data
    hasDesktopScreenshot: boolean;
    hasMobileScreenshot: boolean;
}

export function AnnotationToolbar({
    mode,
    onModeChange,
    viewport,
    onViewportChange,
    isPinMode,
    onPinModeChange,
    isOverlayMode,
    onToggleOverlay,
    isTakingScreenshot,
    onTakeScreenshot,
    onFileUpload,
    hasDesktopScreenshot,
    hasMobileScreenshot
}: AnnotationToolbarProps) {
    const desktopInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
            {/* Main Toolbar */}
            <div className="flex items-center p-1.5 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-lg shadow-gray-200/20 rounded-2xl transition-all duration-300 hover:shadow-xl hover:border-gray-300/50">

                {/* Mode Switcher */}
                <div className="flex bg-gray-100/80 p-1 rounded-xl mr-3">
                    <button
                        onClick={() => onModeChange("live")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                            mode === "live"
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 font-semibold"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <Globe className={cn("w-4 h-4", mode === "live" ? "text-blue-600" : "text-gray-400")} />
                        Live
                    </button>
                    <button
                        onClick={() => onModeChange("screenshot")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                            mode === "screenshot"
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 font-semibold"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <ImageIcon className={cn("w-4 h-4", mode === "screenshot" ? "text-blue-600" : "text-gray-400")} />
                        Review
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-200 mr-3" />

                {/* Center Controls */}
                <div className="flex items-center gap-2">
                    {/* Viewport Toggle */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewportChange("desktop")}
                            className={cn(
                                "h-8 px-3 text-xs gap-1.5 transition-all",
                                viewport === "desktop"
                                    ? "bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-200/50"
                            )}
                        >
                            <Monitor className="w-3.5 h-3.5" />
                            PC
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewportChange("mobile")}
                            className={cn(
                                "h-8 px-3 text-xs gap-1.5 transition-all",
                                viewport === "mobile"
                                    ? "bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-200/50"
                            )}
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            SP
                        </Button>
                    </div>

                    {mode === "screenshot" && (
                        <>
                            <div className="w-px h-6 bg-gray-200 mx-1" />

                            {/* Tools */}
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPinModeChange(false)}
                                    className={cn(
                                        "h-8 px-3 text-xs gap-1.5 transition-all",
                                        !isPinMode
                                            ? "bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-800 font-medium"
                                            : "text-gray-500 hover:bg-gray-200/50"
                                    )}
                                >
                                    <MousePointer2 className="w-3.5 h-3.5" />
                                    Navigate
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPinModeChange(true)}
                                    className={cn(
                                        "h-8 px-3 text-xs gap-1.5 transition-all",
                                        isPinMode
                                            ? "bg-red-100 text-red-700 shadow-sm hover:bg-red-200 hover:text-red-800 font-medium"
                                            : "text-gray-500 hover:bg-gray-200/50"
                                    )}
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                    Comment
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-px h-8 bg-gray-200 mx-3" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {mode === "screenshot" ? (
                        <>
                            {/* Upload / Capture */}
                            <div className="flex items-center gap-1">
                                <input
                                    type="file"
                                    ref={desktopInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => onFileUpload(e, 'desktop')}
                                />
                                <input
                                    type="file"
                                    ref={mobileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => onFileUpload(e, 'mobile')}
                                />

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewport === 'desktop' ? desktopInputRef.current?.click() : mobileInputRef.current?.click()}
                                    disabled={isTakingScreenshot}
                                    className="h-9 px-3 text-xs gap-2 border-dashed hover:bg-gray-50"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload {viewport === 'desktop' ? 'PC' : 'SP'}
                                </Button>

                                <Button
                                    onClick={onTakeScreenshot}
                                    disabled={isTakingScreenshot}
                                    size="sm"
                                    className={cn(
                                        "h-9 px-3 text-xs gap-2 bg-gray-900 text-white hover:bg-gray-800 shadow-sm",
                                        isTakingScreenshot && "opacity-80"
                                    )}
                                >
                                    {isTakingScreenshot ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Camera className="w-3.5 h-3.5" />
                                    )}
                                    Auto
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleOverlay}
                            className={cn(
                                "h-9 w-9 rounded-lg transition-all",
                                isOverlayMode
                                    ? "bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-100"
                            )}
                            title="Toggle Overlay"
                        >
                            {isOverlayMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Helper Text */}
            {mode === "screenshot" && !hasDesktopScreenshot && !hasMobileScreenshot && (
                <div className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg animate-bounce">
                    まずは画像をアップロードするか、自動撮影してください
                </div>
            )}
        </div>
    );
}
