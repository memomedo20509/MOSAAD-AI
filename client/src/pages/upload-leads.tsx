import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";

export default function UploadLeadsPage() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const fieldMappings = [
    { field: t.name, column: "" },
    { field: t.phone, column: "" },
    { field: t.email, column: "" },
    { field: t.channel, column: "" },
    { field: t.campaign, column: "" },
    { field: t.status, column: "" },
    { field: t.assignedTo, column: "" },
  ];

  return (
    <div className="space-y-6">
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
          <p className="text-muted-foreground">{t.uploadLeadsSubtitle}</p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Please remove the header row from your file before uploading. The system will map
          columns based on the order you specify below.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.uploadFile}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder={t.selectFile} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Template</SelectItem>
                  <SelectItem value="facebook">{t.facebook}</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.uploadFile}</Label>
              <div className="border-2 border-dashed rounded-md p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                    {file ? (
                      <p className="text-sm font-medium">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{t.selectFile}</p>
                        <p className="text-xs text-muted-foreground">
                          CSV, XLS, or XLSX (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!file}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t.uploadFile}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.filters}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.uploadLeadsSubtitle}
            </p>

            {fieldMappings.map((mapping) => (
              <div key={mapping.field} className="flex items-center gap-4">
                <Label className="w-28 text-sm">{mapping.field}</Label>
                <Select disabled={!file}>
                  <SelectTrigger data-testid={`select-map-${mapping.field.toLowerCase()}`}>
                    <SelectValue placeholder={t.selectFile} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Column A</SelectItem>
                    <SelectItem value="B">Column B</SelectItem>
                    <SelectItem value="C">Column C</SelectItem>
                    <SelectItem value="D">Column D</SelectItem>
                    <SelectItem value="E">Column E</SelectItem>
                    <SelectItem value="F">Column F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="save-template" className="rounded" />
                <Label htmlFor="save-template" className="text-sm">
                  {t.downloadTemplate}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
