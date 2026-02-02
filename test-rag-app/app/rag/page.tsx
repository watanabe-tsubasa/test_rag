"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Source {
  id: string;
  title: string | null;
  source: string | null;
  tags: string | null;
  content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function RAGPage() {
  // Document registration state
  const [documentContent, setDocumentContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentSource, setDocumentSource] = useState("");
  const [documentTags, setDocumentTags] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfTags, setPdfTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Chat state
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleRegisterDocument = async () => {
    if (!documentContent.trim()) return;

    setIsRegistering(true);
    setRegisterMessage("");

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: documentContent,
          title: documentTitle || undefined,
          source: documentSource || undefined,
          tags: documentTags || undefined,
        }),
      });

      if (res.ok) {
        setRegisterMessage("ドキュメントを登録しました");
        setDocumentContent("");
        setDocumentTitle("");
        setDocumentSource("");
        setDocumentTags("");
      } else {
        const error = await res.json();
        setRegisterMessage(`エラー: ${error.error}`);
      }
    } catch {
      setRegisterMessage("登録に失敗しました");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;

    setIsUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      if (pdfTitle) formData.append("title", pdfTitle);
      if (pdfTags) formData.append("tags", pdfTags);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadMessage(
          `${data.filename} をアップロードしました（${data.textLength}文字）`
        );
        setPdfFile(null);
        setPdfTitle("");
        setPdfTags("");
        // Reset file input
        const fileInput = document.getElementById("pdf-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        const error = await res.json();
        setUploadMessage(`エラー: ${error.error}`);
      }
    } catch {
      setUploadMessage("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const error = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `エラー: ${error.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "回答の取得に失敗しました" },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">RAG Chat</h1>

        {/* Document Registration */}
        <Card>
          <CardHeader>
            <CardTitle>ドキュメント登録</CardTitle>
            <CardDescription>
              RAGの知識ベースに文章を追加します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル（任意）</Label>
                <Input
                  id="title"
                  placeholder="ドキュメントのタイトル"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">ソース（任意）</Label>
                <Input
                  id="source"
                  placeholder="ファイル名やURL"
                  value={documentSource}
                  onChange={(e) => setDocumentSource(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">タグ（任意）</Label>
                <Input
                  id="tags"
                  placeholder="カンマ区切り"
                  value={documentTags}
                  onChange={(e) => setDocumentTags(e.target.value)}
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="document">文章</Label>
              <textarea
                id="document"
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-32 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                placeholder="登録したい文章を入力してください..."
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleRegisterDocument}
                disabled={isRegistering || !documentContent.trim()}
              >
                {isRegistering ? "登録中..." : "登録"}
              </Button>
              {registerMessage && (
                <span
                  className={
                    registerMessage.includes("エラー")
                      ? "text-red-500"
                      : "text-green-500"
                  }
                >
                  {registerMessage}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PDF Upload */}
        <Card>
          <CardHeader>
            <CardTitle>PDFアップロード</CardTitle>
            <CardDescription>
              PDFファイルからテキストを抽出して登録します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pdf-file">PDFファイル</Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdf-title">タイトル（任意）</Label>
                <Input
                  id="pdf-title"
                  placeholder="ドキュメントのタイトル"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdf-tags">タグ（任意）</Label>
                <Input
                  id="pdf-tags"
                  placeholder="カンマ区切り"
                  value={pdfTags}
                  onChange={(e) => setPdfTags(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleUploadPdf}
                disabled={isUploading || !pdfFile}
              >
                {isUploading ? "アップロード中..." : "アップロード"}
              </Button>
              {uploadMessage && (
                <span
                  className={
                    uploadMessage.includes("エラー")
                      ? "text-red-500"
                      : "text-green-500"
                  }
                >
                  {uploadMessage}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle>質問</CardTitle>
            <CardDescription>
              登録されたドキュメントを元に回答します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-4 rounded-md border p-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 border-t pt-2 text-xs opacity-70">
                          <p className="font-semibold">参照元:</p>
                          {msg.sources.map((src, i) => (
                            <div key={i} className="mt-1">
                              {src.title && (
                                <span className="font-medium">{src.title}</span>
                              )}
                              {src.source && (
                                <span className="ml-1 text-muted-foreground">
                                  ({src.source})
                                </span>
                              )}
                              <p className="truncate">{src.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="質問を入力してください..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                disabled={isAsking}
              />
              <Button
                onClick={handleAskQuestion}
                disabled={isAsking || !question.trim()}
              >
                {isAsking ? "送信中..." : "送信"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
