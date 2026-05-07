# مدرسہ مینجمنٹ سسٹم

Next.js App Router، Supabase Auth/Database/Storage-ready، Tailwind CSS، shadcn-style components، Excel export، اور jsPDF receipt sharing کے ساتھ اردو موبائل فرسٹ مدرسہ سسٹم۔

## چلانے کا طریقہ

```bash
npm install
npm run dev
```

`.env.example` کو `.env.local` میں کاپی کریں اور Supabase keys شامل کریں۔

## Supabase setup

1. Supabase project بنائیں۔
2. `supabase/schema.sql` کو SQL editor میں run کریں۔
3. Authentication میں Email provider فعال کریں۔
4. Storage میں `receipts` bucket بنا سکتے ہیں؛ موجودہ UI رسید PDF local generate کرتا ہے اور mobile share/WhatsApp fallback دیتا ہے۔

## شامل ماڈیولز

- ایڈمن اور عملہ کردار
- طلباء، عملہ، حاضری، چھٹی درخواست، کلیکشن، عطیات، اخراجات
- مکمل اور جزوی handover، handover history، approval tracking
- Finance summary: کل کلیکشن، کل اخراجات، بیلنس
- رپورٹس: collection، expense، attendance، salary، handover
- Excel export اور PDF receipt/share

ابتدائی اسکرین demo data کے ساتھ چلتی ہے تاکہ Supabase keys کے بغیر بھی UI دیکھی جا سکے۔ Auth route `/auth` Supabase credentials کے ساتھ sign in/sign up استعمال کرتا ہے۔
