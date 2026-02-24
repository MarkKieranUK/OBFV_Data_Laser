"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { DataPreviewModal } from "@/components/upload/data-preview-modal";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useDatasetStore } from "@/stores/dataset-store";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const { isLoading, error, warning, previewData, processFile, confirmUpload, clearPreview } =
    useFileUpload();
  const isLoaded = useDatasetStore((s) => s.isLoaded);

  const handleConfirm = useCallback(() => {
    confirmUpload();
    router.push("/dashboard");
  }, [confirmUpload, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-8 w-8 text-accent-red" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            OBFV Data Laser
          </h1>
        </div>
        <p className="text-center text-muted-foreground">
          Upload any tabular dataset for instant analysis and visualization
        </p>
      </div>

      <FileDropzone
        onFileSelected={processFile}
        isLoading={isLoading}
        error={error}
        warning={warning}
      />

      {isLoaded && (
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Continue with current dataset
          </Button>
        </div>
      )}

      {previewData && (
        <DataPreviewModal
          open={!!previewData}
          onClose={clearPreview}
          onConfirm={handleConfirm}
          parseResult={previewData.parseResult}
          columns={previewData.columns}
          fileName={previewData.fileName}
        />
      )}
    </div>
  );
}
