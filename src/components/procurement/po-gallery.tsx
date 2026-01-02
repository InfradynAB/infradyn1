"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Images,
    VideoCamera,
    FileText,
    Download,
    MagnifyingGlassPlus,
    X,
    CaretLeft,
    CaretRight,
    Calendar,
    User,
    Tag,
} from "@phosphor-icons/react";
import { format } from "date-fns";

// --- Types ---
interface MediaItem {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    documentType?: string;
    uploadedBy?: string;
    uploadedAt: Date;
    milestoneTitle?: string;
}

interface POGalleryProps {
    purchaseOrderId: string;
    poNumber: string;
    media: MediaItem[];
    className?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    INVOICE: "Invoice",
    PACKING_LIST: "Packing List",
    CMR: "CMR",
    NCR_REPORT: "NCR Report",
    EVIDENCE: "Evidence",
    PROGRESS_REPORT: "Progress Report",
    OTHER: "Other",
};

/**
 * PO Media Gallery Component
 * Displays all photos, videos, and documents uploaded for a purchase order.
 * Supports filtering by document type and full-screen preview.
 */
export function POGallery({ purchaseOrderId, poNumber, media, className }: POGalleryProps) {
    const [filter, setFilter] = useState<string>("ALL");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Filter media based on type
    const filteredMedia = filter === "ALL"
        ? media
        : media.filter((m) => {
            if (filter === "IMAGES") return m.mimeType?.startsWith("image/");
            if (filter === "VIDEOS") return m.mimeType?.startsWith("video/");
            if (filter === "DOCUMENTS") return m.mimeType?.includes("pdf") || m.mimeType?.includes("document");
            return m.documentType === filter;
        });

    const isImage = (mimeType?: string) => mimeType?.startsWith("image/");
    const isVideo = (mimeType?: string) => mimeType?.startsWith("video/");

    const openPreview = (index: number) => setSelectedIndex(index);
    const closePreview = () => setSelectedIndex(null);
    const goNext = () => setSelectedIndex((prev) => prev !== null ? (prev + 1) % filteredMedia.length : 0);
    const goPrev = () => setSelectedIndex((prev) => prev !== null ? (prev - 1 + filteredMedia.length) % filteredMedia.length : 0);

    const selectedItem = selectedIndex !== null ? filteredMedia[selectedIndex] : null;

    // Count by type
    const counts = {
        images: media.filter((m) => isImage(m.mimeType)).length,
        videos: media.filter((m) => isVideo(m.mimeType)).length,
        documents: media.filter((m) => !isImage(m.mimeType) && !isVideo(m.mimeType)).length,
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Images className="h-5 w-5 text-muted-foreground" weight="duotone" />
                    <h3 className="font-semibold">Media Gallery</h3>
                    <span className="text-sm text-muted-foreground">({media.length} files)</span>
                </div>

                {/* Filter */}
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Files</SelectItem>
                        <SelectItem value="IMAGES">
                            <span className="flex items-center gap-2">
                                <Images className="h-4 w-4" /> Photos ({counts.images})
                            </span>
                        </SelectItem>
                        <SelectItem value="VIDEOS">
                            <span className="flex items-center gap-2">
                                <VideoCamera className="h-4 w-4" /> Videos ({counts.videos})
                            </span>
                        </SelectItem>
                        <SelectItem value="DOCUMENTS">
                            <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Documents ({counts.documents})
                            </span>
                        </SelectItem>
                        <SelectItem value="EVIDENCE">Evidence Photos</SelectItem>
                        <SelectItem value="PROGRESS_REPORT">Progress Reports</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Grid */}
            {filteredMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredMedia.map((item, index) => (
                        <div
                            key={item.id}
                            className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-pointer border hover:border-blue-500 transition-all"
                            onClick={() => openPreview(index)}
                        >
                            {isImage(item.mimeType) ? (
                                <Image
                                    src={item.fileUrl}
                                    alt={item.fileName}
                                    fill
                                    className="object-cover"
                                />
                            ) : isVideo(item.mimeType) ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <VideoCamera className="h-10 w-10 text-white/70" weight="duotone" />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="h-10 w-10 text-muted-foreground" weight="duotone" />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <MagnifyingGlassPlus className="h-8 w-8 text-white" />
                            </div>

                            {/* Type Badge */}
                            {item.documentType && (
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                                    {DOCUMENT_TYPE_LABELS[item.documentType] || item.documentType}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 rounded-xl border border-dashed">
                    <Images className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No media files yet</p>
                    <p className="text-sm text-muted-foreground/70">
                        {filter !== "ALL" ? "Try a different filter" : "Upload files to see them here"}
                    </p>
                </div>
            )}

            {/* Full-Screen Preview Modal */}
            <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && closePreview()}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    {selectedItem && (
                        <>
                            {/* Close Button */}
                            <button
                                onClick={closePreview}
                                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Navigation */}
                            {filteredMedia.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <CaretLeft className="h-6 w-6" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <CaretRight className="h-6 w-6" />
                                    </button>
                                </>
                            )}

                            {/* Media */}
                            <div className="relative aspect-video bg-black flex items-center justify-center">
                                {isImage(selectedItem.mimeType) ? (
                                    <Image
                                        src={selectedItem.fileUrl}
                                        alt={selectedItem.fileName}
                                        fill
                                        className="object-contain"
                                    />
                                ) : isVideo(selectedItem.mimeType) ? (
                                    <video
                                        src={selectedItem.fileUrl}
                                        controls
                                        className="max-h-full max-w-full"
                                    />
                                ) : (
                                    <div className="text-center text-white">
                                        <FileText className="h-16 w-16 mx-auto mb-4" />
                                        <p>{selectedItem.fileName}</p>
                                    </div>
                                )}
                            </div>

                            {/* Info Bar */}
                            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="font-medium">{selectedItem.fileName}</p>
                                    <div className="flex items-center gap-4 text-sm text-white/70">
                                        {selectedItem.documentType && (
                                            <span className="flex items-center gap-1">
                                                <Tag className="h-4 w-4" />
                                                {DOCUMENT_TYPE_LABELS[selectedItem.documentType]}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {format(new Date(selectedItem.uploadedAt), "MMM d, yyyy")}
                                        </span>
                                        {selectedItem.uploadedBy && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                {selectedItem.uploadedBy}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href={selectedItem.fileUrl}
                                    download={selectedItem.fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button variant="secondary" size="sm" className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </a>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
