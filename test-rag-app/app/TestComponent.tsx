"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { conversationWithAI } from "@/lib/actions";
import { type ChangeEvent, useState } from "react";

export function TestComponent() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");

  const onClickButton = async () => {
    const aiResponse = await conversationWithAI(message);
    setResponse(aiResponse);
  }

  const onChangeInput = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg rounded-2xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Test OpenAI RAG App
        </CardTitle>
        <CardDescription>
          Send a message and get AI-powered responses instantly.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Area */}
        <Field className="space-y-2">
          <FieldLabel htmlFor="input-demo">Message for AI</FieldLabel>

          <div className="flex gap-2">
            <Input
              id="input-demo"
              placeholder="Type your question..."
              value={message}
              onChange={onChangeInput}
            />
            <Button onClick={onClickButton}>
              Send
            </Button>
          </div>

          <FieldDescription>
            Input message to send to AI model
          </FieldDescription>
        </Field>

        {/* Response Area */}
        <div className="rounded-xl border bg-muted/40 p-4 text-sm min-h-[80px]">
          <p className="font-medium text-muted-foreground mb-1">
            Response
          </p>

          {response ? (
            <p className="whitespace-pre-wrap">{response}</p>
          ) : (
            <p className="text-muted-foreground italic">
              AI response will appear here...
            </p>
          )}
        </div>
      </CardContent>
    </Card>

  )
}