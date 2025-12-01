"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url }),
      });

      if (!res.ok) throw new Error("Failed to create session");
      const session = await res.json();
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to create session");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Web Page Annotation Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                Enter URL to Annotate
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Open Page"
              )}
            </Button>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-xs text-amber-800">
                <strong>⚠️ 保存期間について:</strong> セッションは作成から30日後に自動的に削除されます。
                長期保存が必要な場合は、画像を個別にダウンロードしてください。
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Note: Some websites may block embedding via iframe.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
