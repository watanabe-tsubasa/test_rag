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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; content: string }[];
}

export default function RAGPage() {
  // Document registration state
  const [documentContent, setDocumentContent] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");

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
        body: JSON.stringify({ content: documentContent }),
      });

      if (res.ok) {
        setRegisterMessage("ドキュメントを登録しました");
        setDocumentContent("");
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
                            <p key={i} className="truncate">
                              {src.content}
                            </p>
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
