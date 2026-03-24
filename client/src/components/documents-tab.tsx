import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  File,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { Document } from "@shared/schema";

interface DocumentsTabProps {
  entityType: "lead" | "client";
  entityId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

export function DocumentsTab({ entityType, entityId }: DocumentsTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const apiPath = entityType === "lead"
    ? `/api/leads/${entityId}/documents`
    : `/api/clients/${entityId}/documents`;

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: [apiPath],
    enabled: !!entityId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (label) formData.append("label", label);
      const res = await fetch(apiPath, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      setLabel("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: t.documentUploadSuccess });
    },
    onError: (err: Error) => {
      toast({ title: err.message || t.documentUploadError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      setDeletingId(null);
      toast({ title: t.documentDeleteSuccess });
    },
    onError: () => {
      setDeletingId(null);
      toast({ title: t.documentDeleteError, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(file.type)) {
      toast({ title: t.documentFileTypeError, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t.documentFileSizeError, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate();
  };

  const handleDownload = (doc: Document) => {
    window.open(`/api/documents/${doc.id}/download`, "_blank");
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.deleteDocumentConfirm)) return;
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.uploadDocument}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input
              placeholder={t.documentLabelPlaceholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              data-testid="input-document-label"
            />
            <div className="flex gap-2 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                data-testid="input-document-file"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 justify-start text-muted-foreground"
                data-testid="button-select-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : t.selectDocumentFile}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                data-testid="button-upload-document"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.documentUploading}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t.uploadDocument}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-md border gap-3"
                  data-testid={`card-document-${doc.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      <FileIcon mimeType={doc.mimeType} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate" data-testid={`text-document-name-${doc.id}`}>
                          {doc.originalName}
                        </p>
                        {doc.label && (
                          <Badge variant="secondary" className="shrink-0" data-testid={`badge-document-label-${doc.id}`}>
                            {doc.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span data-testid={`text-document-size-${doc.id}`}>{formatFileSize(doc.fileSize)}</span>
                        {doc.createdAt && (
                          <span data-testid={`text-document-date-${doc.id}`}>
                            {format(new Date(doc.createdAt), "MMM dd, yyyy")}
                          </span>
                        )}
                        {doc.uploadedByName && (
                          <span data-testid={`text-document-uploader-${doc.id}`}>
                            {doc.uploadedByName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleDownload(doc)}
                      title={t.download}
                      data-testid={`button-download-document-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title={t.deleteDocument}
                      data-testid={`button-delete-document-${doc.id}`}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              {t.noDocuments}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
