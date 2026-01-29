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

export default function UploadLeadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const fieldMappings = [
    { field: "Name", column: "" },
    { field: "Phone", column: "" },
    { field: "Email", column: "" },
    { field: "Channel", column: "" },
    { field: "Campaign", column: "" },
    { field: "Status", column: "" },
    { field: "Assigned To", column: "" },
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
            Upload Leads
          </h1>
          <p className="text-muted-foreground">Import leads from a spreadsheet file</p>
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
            <CardTitle className="text-base">Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Template</SelectItem>
                  <SelectItem value="facebook">Facebook Leads</SelectItem>
                  <SelectItem value="google">Google Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload File</Label>
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
                        <p className="text-sm font-medium">Click to upload</p>
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
              Upload and Process
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Column Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your spreadsheet columns to the lead fields
            </p>

            {fieldMappings.map((mapping) => (
              <div key={mapping.field} className="flex items-center gap-4">
                <Label className="w-28 text-sm">{mapping.field}</Label>
                <Select disabled={!file}>
                  <SelectTrigger data-testid={`select-map-${mapping.field.toLowerCase()}`}>
                    <SelectValue placeholder="Select column" />
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
                  Save as template for future uploads
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
