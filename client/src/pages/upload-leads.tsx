import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Template columns ────────────────────────────────────────────────
const TEMPLATE_COLUMNS_AR = [
  "الاسم",
  "الهاتف",
  "هاتف 2",
  "البريد الإلكتروني",
  "القناة",
  "الحملة",
  "الميزانية",
  "الملاحظات",
];

const TEMPLATE_SAMPLE_AR = [
  "أحمد محمد",
  "0501234567",
  "0509876543",
  "ahmed@example.com",
  "فيسبوك",
  "حملة رمضان",
  "500,000",
  "مهتم بشقة في التجمع",
];

// ── Generate and download Excel template ───────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet with headers + one sample row
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS_AR, TEMPLATE_SAMPLE_AR]);

  // Column widths
  ws["!cols"] = TEMPLATE_COLUMNS_AR.map(() => ({ wch: 22 }));

  // Style header row (xlsx doesn't support full styling, but we add a note)
  XLSX.utils.book_append_sheet(wb, ws, "الليدز");

  XLSX.writeFile(wb, "leads_template.xlsx");
}

// ── Parse uploaded file into row objects ──────────────────────────
function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

type ImportResult = {
  imported: number;
  errors: { row: number; reason: string }[];
  total: number;
};

export default function UploadLeadsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Import mutation ──────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Import failed");
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (data.errors.length === 0) {
        toast({ title: t.importSuccess, description: t.importedRows.replace("{count}", String(data.imported)) });
      } else {
        toast({
          title: t.importSuccess,
          description: `${t.importedRows.replace("{count}", String(data.imported))} | ${t.failedRows.replace("{count}", String(data.errors.length))}`,
          variant: "default",
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: t.uploadError, description: err.message, variant: "destructive" });
    },
  });

  // ── Handle file selection ────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    try {
      const rows = await parseFile(f);
      if (rows.length > 0) {
        setHeaders(Object.keys(rows[0]));
        setPreview(rows.slice(0, 8));
      }
    } catch {
      toast({ title: t.uploadError, description: "تعذّر قراءة الملف", variant: "destructive" });
    }
  }, [toast, t]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-upload-title">
            {t.uploadLeadsTitle}
          </h1>
          <p className="text-muted-foreground text-sm">{t.uploadLeadsSubtitle}</p>
        </div>
      </div>

      {/* ── Step 1: Download Template ── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.downloadTemplateBtn}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.templateNote}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t.templateCols}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t.downloadTemplateBtn}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Upload / Result ── */}
      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t.uploadFile}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
                ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
                data-testid="input-file-upload"
              />
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <FileSpreadsheet className={`h-12 w-12 ${isDragging ? "text-primary" : "text-muted-foreground/40"}`} />
                {file ? (
                  <>
                    <p className="font-semibold text-primary">{file.name}</p>
                    <Badge variant="secondary">{preview.length} {t.leads}</Badge>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t.dragDropHere}</span>{" "}
                      <span className="text-primary underline underline-offset-2">{t.browseFile}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">CSV, XLS, XLSX — max 10MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Preview table */}
            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.previewData}</span>
                  <Badge variant="outline" className="text-xs">{t.leads}: {preview.length}+</Badge>
                </div>
                <div className="rounded-md border overflow-auto max-h-56">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((h) => (
                            <TableCell key={h} className="text-xs max-w-[140px] truncate">{row[h]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {file && (
                <Button
                  variant="ghost"
                  onClick={reset}
                  data-testid="button-reset"
                  disabled={importMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t.resetUpload}
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!file || importMutation.isPending}
                onClick={() => file && importMutation.mutate(file)}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                    {t.importingLeads}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t.confirmImport}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── Result Card ── */
        <Card>
          <CardContent className="py-8 space-y-6">
            {/* Summary */}
            <div className="text-center space-y-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              ) : (
                <AlertTriangle className="h-14 w-14 text-yellow-500 mx-auto" />
              )}
              <h2 className="text-xl font-bold">{t.importSuccess}</h2>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{t.importedRows.replace("{count}", String(result.imported))}</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{t.failedRows.replace("{count}", String(result.errors.length))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Errors table */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">{t.importErrors}</p>
                <div className="rounded-md border overflow-auto max-h-52">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">{t.rowNumber}</TableHead>
                        <TableHead>{t.errorReason}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{err.row}</TableCell>
                          <TableCell className="text-sm text-red-600">{err.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={reset} data-testid="button-upload-new">
                <RefreshCw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t.resetUpload}
              </Button>
              <Link href="/leads">
                <Button data-testid="button-view-leads">{t.leads}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
