"use client";

import * as React from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

type DropzoneProps = {
  accept?: Accept;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  className?: string;
  compact?: boolean;
};

export function Dropzone({
  accept,
  multiple = false,
  maxFiles,
  maxSize,
  disabled,
  onFilesAccepted,
  onFilesRejected,
  label,
  hint,
  inputProps,
  className,
  compact = false,
}: DropzoneProps) {
  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (acceptedFiles.length > 0) onFilesAccepted(acceptedFiles);
      if (rejections.length > 0 && onFilesRejected) onFilesRejected(rejections);
    },
    [onFilesAccepted, onFilesRejected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
    maxSize,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-border bg-surface text-center transition-colors",
        compact ? "px-4 py-3" : "px-6 py-8",
        "hover:border-accent hover:bg-surface-alt",
        isDragActive && "border-accent bg-accent-soft",
        isDragReject && "border-danger",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input {...getInputProps(inputProps)} />
      <UploadCloud
        className={cn("text-text-muted", compact ? "h-4 w-4" : "h-6 w-6")}
        aria-hidden
      />
      {label ? (
        <div className="text-sm font-medium text-text">{label}</div>
      ) : (
        <div className="text-sm font-medium text-text">
          {isDragActive ? "Drop here…" : "Click to choose or drag files here"}
        </div>
      )}
      {hint ? <div className="text-xs text-text-muted">{hint}</div> : null}
    </div>
  );
}
