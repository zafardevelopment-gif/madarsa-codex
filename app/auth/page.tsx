"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "");
    const role = String(formData.get("role") || "staff") as UserRole;

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("لاگ اِن کامیاب ہو گیا۔");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } }
        });
        if (error) throw error;
        if (data.user) {
          await (supabase.from("users") as any).insert({
            id: data.user.id,
            name,
            email,
            role,
            base_salary: 0
          });
        }
        setMessage("اکاؤنٹ بن گیا۔ ای میل تصدیق فعال ہو تو پہلے تصدیق کریں۔");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "عمل مکمل نہیں ہو سکا۔");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f8] p-4">
      <Card className="w-full max-w-md p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">مدرسہ لاگ اِن</h1>
            <p className="text-sm text-muted-foreground">ایڈمن اور عملہ کے لئے محفوظ رسائی</p>
          </div>
          {mode === "signin" ? <LogIn className="h-6 w-6 text-primary" /> : <UserPlus className="h-6 w-6 text-primary" />}
        </div>
        <form onSubmit={submit} className="grid gap-3">
          {mode === "signup" && (
            <>
              <Label>نام</Label>
              <Input name="name" required />
              <Label>کردار</Label>
              <Select name="role" defaultValue="staff">
                <option value="staff">عملہ</option>
                <option value="admin">ایڈمن</option>
              </Select>
            </>
          )}
          <Label>ای میل</Label>
          <Input name="email" type="email" required />
          <Label>پاس ورڈ</Label>
          <Input name="password" type="password" required minLength={6} />
          <Button type="submit">{mode === "signin" ? "لاگ اِن" : "اکاؤنٹ بنائیں"}</Button>
        </form>
        <Button
          className="mt-3 w-full"
          type="button"
          variant="ghost"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "نیا اکاؤنٹ بنائیں" : "پہلے سے اکاؤنٹ ہے؟ لاگ اِن"}
        </Button>
        {message && <div className="mt-3 rounded-md bg-muted p-3 text-sm">{message}</div>}
      </Card>
    </main>
  );
}
