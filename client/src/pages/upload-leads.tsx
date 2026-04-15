import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, RotateCcw, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ImportResult = {
  imported: number;
  errors: { row: number; reason: string }[];
  total: number;
};

export default function UploadLeadsPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback((f: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(f.type) && !f.name.endsWith(".csv") && !f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      toast({ title: "نوع الملف غير مدعوم. يرجى استخدام Excel أو CSV", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<ImportResult>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || "فشل الرفع"));
            } catch {
              reject(new Error("فشل الرفع"));
            }
          }
        });
        xhr.addEventListener("error", () => reject(new Error("فشل الاتصال")));
        xhr.open("POST", "/api/leads/import");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      const data = await uploadPromise;
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: `تم استيراد ${data.imported} من ${data.total} ليد` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "فشل في رفع الملف";
      toast({ title: message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const headers = ["الاسم", "الهاتف", "هاتف 2", "البريد الإلكتروني", "القناة", "الحملة", "الميزانية", "الملاحظات"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="space-y-6" data-testid="page-upload-leads">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">رفع الليدز</h1>
          <p className="text-muted-foreground">رفع ملف Excel أو CSV يحتوي على بيانات الليدز</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
          <Download className="h-4 w-4 mr-2" />
          تحميل القالب
        </Button>
      </div>

      <Card className="text-sm text-muted-foreground">
        <CardContent className="pt-4">
          <p>الأعمدة المطلوبة: <strong>الاسم*</strong> | الهاتف | هاتف 2 | البريد الإلكتروني | القناة | الحملة | الميزانية | الملاحظات</p>
          <p className="mt-1">يمكن استخدام أسماء الأعمدة بالعربية أو الإنجليزية</p>
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              data-testid="dropzone-upload"
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <div className="space-y-3">
                  <p className="font-medium" data-testid="text-file-name">{file.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-file-size">{(file.size / 1024).toFixed(1)} KB</p>
                  {uploading && (
                    <div className="max-w-xs mx-auto space-y-2" data-testid="upload-progress">
                      <Progress value={uploadProgress} className="h-2" />
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جاري الرفع... {uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center gap-3">
                    <Button onClick={handleUpload} disabled={uploading} data-testid="button-upload">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "جاري الرفع..." : "رفع الملف"}
                    </Button>
                    <Button variant="outline" onClick={reset} disabled={uploading} data-testid="button-reset-file">إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">اسحب الملف هنا أو</p>
                  <label>
                    <Button variant="outline" asChild>
                      <span>
                        اختر ملف
                        <input
                          type="file"
                          className="hidden"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                          data-testid="input-file-upload"
                        />
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                نتيجة الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-imported-count">{result.imported}</div>
                  <p className="text-sm text-muted-foreground">تم استيرادهم</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-errors-count">{result.errors.length}</div>
                  <p className="text-sm text-muted-foreground">أخطاء</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold" data-testid="text-total-count">{result.total}</div>
                  <p className="text-sm text-muted-foreground">إجمالي الصفوف</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  أخطاء الاستيراد ({result.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-start py-2 px-3 font-medium">رقم الصف</th>
                        <th className="text-start py-2 px-3 font-medium">السبب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-b last:border-0" data-testid={`row-error-${i}`}>
                          <td className="py-2 px-3"><Badge variant="outline">{err.row}</Badge></td>
                          <td className="py-2 px-3 text-muted-foreground">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={reset} variant="outline" data-testid="button-upload-new">
            <RotateCcw className="h-4 w-4 mr-2" />
            رفع ملف جديد
          </Button>
        </div>
      )}
    </div>
  );
}
