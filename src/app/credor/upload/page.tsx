"use client";

import { useState } from "react";
import { FileUpload } from "@/components/credor/file-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle, AlertCircle, Download } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Step = "select" | "preview" | "result";

interface PreviewRow {
  cpf: string;
  nome: string;
  valor_original: string;
  [key: string]: string;
}

interface UploadResult {
  total: number;
  inserted: number;
  errors: string[];
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleFileSelect(f: File) {
    setFile(f);

    const fileName = f.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      f.text().then((text) => {
        const parsed = Papa.parse<PreviewRow>(text, {
          header: true,
          skipEmptyLines: true,
        });
        setPreview(parsed.data.slice(0, 10));
        setStep("preview");
      });
    } else {
      f.arrayBuffer().then((buffer) => {
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<PreviewRow>(ws);
        setPreview(rows.slice(0, 10));
        setStep("preview");
      });
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(60);
      const res = await fetch("/api/credor/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(100);
      const data = await res.json();

      if (!res.ok) {
        setResult({
          total: 0,
          inserted: 0,
          errors: [data.error || "Erro desconhecido ao processar o arquivo."],
        });
      } else {
        setResult({
          total: data.total ?? 0,
          inserted: data.inserted ?? 0,
          errors: data.errors ?? [],
        });
      }
      setStep("result");
    } catch {
      setResult({
        total: 0,
        inserted: 0,
        errors: ["Falha na conexão com o servidor. Tente novamente."],
      });
      setStep("result");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setStep("select");
    setFile(null);
    setPreview([]);
    setResult(null);
    setProgress(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upload de Dívidas</h1>
        <a href="/template-dividas.csv" download>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Template CSV
          </Button>
        </a>
      </div>

      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Arquivo</CardTitle>
            <CardDescription>
              Envie um arquivo CSV ou Excel com as dívidas. Use o template como referência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              accept=".csv,.xlsx,.xls"
              onFileSelect={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview - {file?.name}</CardTitle>
            <CardDescription>
              Mostrando as primeiras {preview.length} linhas. Verifique os dados antes de enviar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.length > 0 &&
                      Object.keys(preview[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>{String(val)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {uploading && <Progress value={progress} className="w-full" />}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} disabled={uploading}>
                Voltar
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar Arquivo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.inserted > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {result.inserted > 0 ? "Upload Concluído" : "Falha no Upload"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Total: {result.total}
              </Badge>
              <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                Inseridas: {result.inserted}
              </Badge>
              {result.errors?.length > 0 && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  Erros: {result.errors.length}
                </Badge>
              )}
            </div>

            {result.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Erros encontrados:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>- {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={reset}>Fazer Novo Upload</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
