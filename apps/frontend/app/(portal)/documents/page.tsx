'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { documentTypeLabels, formatDate } from '@/lib/labels';
import type { Document, DocumentWithUrl, PaginatedResponse } from '@/lib/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<PaginatedResponse<Document>>('/documents?limit=100')
      .then((res) => setDocuments(res.data))
      .finally(() => setIsLoading(false));
  }, []);

  const download = async (documentCode: string) => {
    const doc = await api.get<DocumentWithUrl>(`/documents/${documentCode}/url`);
    window.open(doc.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Header title="Documents" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Documents disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Spinner />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.documentCode}>
                      <TableCell className="font-mono text-xs">{document.documentCode}</TableCell>
                      <TableCell>{documentTypeLabels[document.documentType]}</TableCell>
                      <TableCell>{document.originalFileName}</TableCell>
                      <TableCell>{formatDate(document.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => download(document.documentCode)}
                        >
                          <Download className="mr-2 size-4" /> Télécharger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
