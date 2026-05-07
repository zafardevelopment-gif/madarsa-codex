"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc("almahad_login", {
        p_username: username.toLowerCase().trim(),
        p_password: password,
      });
      if (error) throw error;
      if (!data || (data as any[]).length === 0) {
        throw new Error("wrong credentials");
      }
      const user = (data as any[])[0];
      // Store session in localStorage
      localStorage.setItem("almahad_user", JSON.stringify(user));
      window.location.href = "/";
    } catch {
      setError("غلط username یا password — Wrong username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d2b2b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f7c948]">
            <ShieldCheck className="h-8 w-8 text-[#0d2b2b]" />
          </div>
          <h1 className="text-2xl font-bold text-white">مدرسہ نظام</h1>
          <p className="mt-1 text-sm text-white/50">Madarsa Management System</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-bold">لاگ اِن کریں</h2>
            <p className="text-xs text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>یوزر نیم · Username</Label>
              <Input
                className="mt-1"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                dir="ltr"
              />
            </div>

            <div>
              <Label>پاس ورڈ · Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> لاگ اِن ہو رہا ہے...</>
              ) : (
                "لاگ اِن · Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          صرف منتظم اکاؤنٹ بنا سکتا ہے · Only admin can create accounts
        </p>
      </div>
    </main>
  );
}
