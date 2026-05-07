"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  BarChart3,
  CalendarCheck,
  Camera as CameraIcon,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  FileText,
  Home,
  Landmark,
  LogIn,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload as UploadIcon,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type {
  AttendanceStatus,
  CollectionType,
  DonationType,
  HandoverStatus,
  LeaveStatus,
  SalaryMode,
  UserRole
} from "@/lib/supabase/types";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  baseSalary: number;
};

type Student = {
  id: string;
  name: string;
  guardianName: string;
  phone: string;
  monthlyFee: number;
};

type Collection = {
  id: string;
  studentId?: string;
  name: string;
  amount: number;
  date: string;
  type: CollectionType;
  donationType?: DonationType;
  collectedBy: string;
  handedOverAmount: number;
};

type Handover = {
  id: string;
  collectionId: string;
  staffId: string;
  amount: number;
  status: HandoverStatus;
  date: string;
  note: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paidTo: string;
};

type Attendance = {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
};

type Leave = {
  id: string;
  userId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
};

type Payroll = {
  id: string;
  staffId: string;
  month: string;
  baseSalary: number;
  totalCollection: number;
  salaryMode: SalaryMode;
  finalSalary: number;
};

const today = new Date().toISOString().slice(0, 10);

const navItems = [
  { key: "dashboard", labelUr: "ڈیش بورڈ", labelEn: "Dashboard", icon: Home },
  { key: "staff", labelUr: "عملہ", labelEn: "Staff", icon: Users },
  { key: "students", labelUr: "طلباء", labelEn: "Students", icon: ClipboardList },
  { key: "finance", labelUr: "مالیات", labelEn: "Finance", icon: Landmark },
  { key: "attendance", labelUr: "حاضری", labelEn: "Attendance", icon: CalendarCheck },
  { key: "payroll", labelUr: "تنخواہ", labelEn: "Payroll", icon: WalletCards },
  { key: "reports", labelUr: "رپورٹس", labelEn: "Reports", icon: BarChart3 }
] as const;

const donationLabels: Record<DonationType, { ur: string; en: string }> = {
  sadqa: { ur: "صدقہ", en: "Sadqa" },
  zakat: { ur: "زکوٰۃ", en: "Zakat" },
  fitrah: { ur: "فطرہ", en: "Fitrah" },
  general: { ur: "جنرل", en: "General" }
};

const typeLabels: Record<CollectionType, { ur: string; en: string }> = {
  monthly_fee: { ur: "ماہانہ فیس", en: "Monthly Fee" },
  donation: { ur: "عطیہ", en: "Donation" }
};

const statusLabels: Record<AttendanceStatus | LeaveStatus | HandoverStatus, { ur: string; en: string }> = {
  present: { ur: "حاضر", en: "Present" },
  absent: { ur: "غائب", en: "Absent" },
  pending: { ur: "زیر التوا", en: "Pending" },
  approved: { ur: "منظور", en: "Approved" },
  rejected: { ur: "مسترد", en: "Rejected" }
};

function DualLabel({ ur, en }: { ur: string; en: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{ur}</span>
      <span className="text-[10px] font-normal opacity-60 tracking-wide">{en}</span>
    </span>
  );
}

function handleFormSubmit(
  event: React.FormEvent<HTMLFormElement>,
  handler: (formData: FormData) => void | Promise<void>
) {
  event.preventDefault();
  void handler(new FormData(event.currentTarget));
  event.currentTarget.reset();
}

const initialStaff: Staff[] = [];
const initialStudents: Student[] = [];
const initialCollections: Collection[] = [];
const initialExpenses: Expense[] = [];
const initialHandovers: Handover[] = [];

export function MadarsaApp() {
  const [active, setActive] = useState<(typeof navItems)[number]["key"]>("dashboard");
  const [role, setRole] = useState<UserRole>("admin");
  const [currentStaffId, setCurrentStaffId] = useState("");
  const [staff, setStaff] = useState(initialStaff);
  const [students, setStudents] = useState(initialStudents);
  const [collections, setCollections] = useState(initialCollections);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [handovers, setHandovers] = useState(initialHandovers);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const supabaseRef = useRef<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffMsg, setStaffMsg] = useState("");
  const [query, setQuery] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const visibleStaffId = role === "staff" ? currentStaffId : filterStaff;
  const filteredCollections = useMemo(() => {
    return collections.filter((item) => {
      const matchesQuery = item.name.includes(query);
      const matchesStaff = visibleStaffId === "all" || item.collectedBy === visibleStaffId;
      const matchesType = filterType === "all" || item.type === filterType;
      const matchesFrom = !fromDate || item.date >= fromDate;
      const matchesTo = !toDate || item.date <= toDate;
      return matchesQuery && matchesStaff && matchesType && matchesFrom && matchesTo;
    });
  }, [collections, filterType, fromDate, query, toDate, visibleStaffId]);

  const totalCollection = filteredCollections.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = role === "admin" ? expenses.reduce((sum, item) => sum + item.amount, 0) : 0;
  const totalHandover = filteredCollections.reduce((sum, item) => sum + item.handedOverAmount, 0);
  const remainingAmount = filteredCollections.reduce(
    (sum, item) => sum + Math.max(item.amount - item.handedOverAmount, 0),
    0
  );
  const balance = totalCollection - totalExpenses;
  const activeStaff = staff.find((item) => item.id === currentStaffId) ?? staff[1];

  useEffect(() => {
    const stored = localStorage.getItem("almahad_user");
    if (!stored) {
      window.location.href = "/auth";
      return;
    }
    try {
      const user = JSON.parse(stored);
      setRole(user.role as UserRole);
      setCurrentStaffId(user.id);
      setAuthChecked(true);
      const client = createClient();
      supabaseRef.current = client;
      loadSupabaseData(client).catch((err) => console.error("loadSupabaseData error:", err));
    } catch (err) {
      console.error("Auth parse error:", err);
      localStorage.removeItem("almahad_user");
      window.location.href = "/auth";
    }
  }, []);

  async function loadSupabaseData(client: any) {
    const [usersResult, studentsResult, collectionsResult, expensesResult, handoversResult, attendanceResult, leavesResult, payrollResult] =
      await Promise.all([
        client.from("almahad_accounts").select("*"),
        client.from("almahad_students").select("*"),
        client.from("almahad_collections").select("*"),
        client.from("almahad_expenses").select("*"),
        client.from("almahad_handovers").select("*"),
        client.from("almahad_attendance").select("*"),
        client.from("almahad_leaves").select("*"),
        client.from("almahad_payroll").select("*")
      ]);

    if (usersResult.error) console.error("accounts:", usersResult.error.message);
    if (collectionsResult.error) console.error("collections:", collectionsResult.error.message);
    if (studentsResult.error) console.error("students:", studentsResult.error.message);

    const usersData = (usersResult.data ?? []) as any[];
    const studentsData = (studentsResult.data ?? []) as any[];
    const collectionsData = (collectionsResult.data ?? []) as any[];
    const expensesData = (expensesResult.data ?? []) as any[];
    const handoversData = (handoversResult.data ?? []) as any[];
    const attendanceData = (attendanceResult.data ?? []) as any[];
    const leavesData = (leavesResult.data ?? []) as any[];
    const payrollData = (payrollResult.data ?? []) as any[];

    if (usersData.length) {
      setStaff(usersData.map((item) => ({ id: item.id, name: item.name, email: item.username ?? item.email ?? "", role: item.role, baseSalary: Number(item.base_salary) })));
    }
    if (studentsData.length) {
      setStudents(studentsData.map((item) => ({ id: item.id, name: item.name, guardianName: item.guardian_name, phone: item.phone, monthlyFee: Number(item.monthly_fee) })));
    }
    if (collectionsData.length) {
      setCollections(collectionsData.map((item) => ({ id: item.id, studentId: item.student_id ?? undefined, name: item.name, amount: Number(item.amount), date: item.date, type: item.type, donationType: item.donation_type ?? undefined, collectedBy: item.collected_by, handedOverAmount: Number(item.handed_over_amount) })));
    }
    if (expensesData.length) {
      setExpenses(expensesData.map((item) => ({ id: item.id, description: item.description, amount: Number(item.amount), date: item.date, paidTo: item.paid_to })));
    }
    if (handoversData.length) {
      setHandovers(handoversData.map((item) => ({ id: item.id, collectionId: item.collection_id, staffId: item.staff_id, amount: Number(item.amount), status: item.status, date: item.created_at.slice(0, 10), note: item.note ?? "" })));
    }
    if (attendanceData.length) {
      setAttendance(attendanceData.map((item) => ({ id: item.id, userId: item.user_id, date: item.date, status: item.status })));
    }
    if (leavesData.length) {
      setLeaves(leavesData.map((item) => ({ id: item.id, userId: item.user_id, fromDate: item.from_date, toDate: item.to_date, reason: item.reason, status: item.status })));
    }
    if (payrollData.length) {
      setPayroll(payrollData.map((item) => ({ id: item.id, staffId: item.staff_id, month: item.month, baseSalary: Number(item.base_salary), totalCollection: Number(item.total_collection), salaryMode: item.salary_mode, finalSalary: Number(item.final_salary) })));
    }
  }

  function staffName(id: string) {
    return staff.find((item) => item.id === id)?.name ?? "نامعلوم";
  }

  async function addCollection(formData: FormData) {
    const type = formData.get("type") as CollectionType;
    const amount = Number(formData.get("amount") || 0);
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      studentId: (formData.get("studentId") as string) || undefined,
      name: String(formData.get("name") || ""),
      amount,
      date: String(formData.get("date") || today),
      type,
      donationType: type === "donation" ? (formData.get("donationType") as DonationType) : undefined,
      collectedBy: currentStaffId,
      handedOverAmount: 0
    };
    setCollections((items) => [newCollection, ...items]);
    const { error } = await supabaseRef.current?.from("almahad_collections").insert({
      student_id: newCollection.studentId ?? null,
      name: newCollection.name,
      amount: newCollection.amount,
      date: newCollection.date,
      type: newCollection.type,
      donation_type: newCollection.donationType ?? null,
      collected_by: newCollection.collectedBy,
      handed_over_amount: 0,
      remaining_amount: newCollection.amount,
      is_handed_over: false
    }) ?? {};
    if (error) console.error("addCollection DB error:", error);
  }

  async function addExpense(formData: FormData) {
    const newExpense = {
      id: crypto.randomUUID(),
      description: String(formData.get("description") || ""),
      amount: Number(formData.get("amount") || 0),
      date: String(formData.get("date") || today),
      paidTo: String(formData.get("paidTo") || "")
    };
    setExpenses((items) => [newExpense, ...items]);
    await supabaseRef.current?.from("almahad_expenses").insert({ description: newExpense.description, amount: newExpense.amount, date: newExpense.date, paid_to: newExpense.paidTo });
  }

  async function addStaff(formData: FormData) {
    const username = String(formData.get("username") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "");
    const mobile = String(formData.get("mobile") || "");
    const baseSalary = Number(formData.get("baseSalary") || 0);

    setStaffMsg("");
    try {
      if (supabaseRef.current) {
        const { data, error } = await supabaseRef.current.rpc("almahad_create_account", {
          p_username: username,
          p_password: password,
          p_name: name,
          p_mobile: mobile || null,
          p_role: "staff",
          p_base_salary: baseSalary,
        });
        if (error) throw error;
        const uid = data?.id ?? crypto.randomUUID();
        const newStaff = { id: uid, name, email: username, role: "staff" as UserRole, baseSalary };
        setStaff((items) => [newStaff, ...items]);
        setStaffMsg(`✓ ${name} کا اکاؤنٹ بن گیا · Account created`);
      } else {
        const newStaff = { id: crypto.randomUUID(), name, email: username, role: "staff" as UserRole, baseSalary };
        setStaff((items) => [newStaff, ...items]);
        setStaffMsg(`✓ ${name} شامل ہو گئے (demo mode)`);
      }
    } catch (err) {
      setStaffMsg(err instanceof Error ? err.message : "خرابی آ گئی · Error");
    }
  }

  async function changePassword(targetId: string, newPassword: string): Promise<string> {
    if (!supabaseRef.current) return "خرابی · No connection";
    const { error } = await supabaseRef.current.rpc("almahad_change_password", {
      p_id: targetId,
      p_new_password: newPassword,
    });
    if (error) return error.message;
    return "ok";
  }

  async function addStudent(formData: FormData) {
    const newStudent = {
      id: crypto.randomUUID(),
      name: String(formData.get("name") || ""),
      guardianName: String(formData.get("guardianName") || ""),
      phone: String(formData.get("phone") || ""),
      monthlyFee: Number(formData.get("monthlyFee") || 0)
    };
    setStudents((items) => [newStudent, ...items]);
    await supabaseRef.current?.from("almahad_students").insert({ name: newStudent.name, guardian_name: newStudent.guardianName, phone: newStudent.phone, monthly_fee: newStudent.monthlyFee });
  }

  async function markAttendance(status: AttendanceStatus) {
    setAttendance((items) => [
      { id: crypto.randomUUID(), userId: currentStaffId, date: today, status },
      ...items.filter((item) => !(item.userId === currentStaffId && item.date === today))
    ]);
    await supabaseRef.current?.from("almahad_attendance").upsert({ user_id: currentStaffId, date: today, status });
  }

  async function applyLeave(formData: FormData) {
    const newLeave: Leave = {
      id: crypto.randomUUID(),
      userId: currentStaffId,
      fromDate: String(formData.get("fromDate") || today),
      toDate: String(formData.get("toDate") || today),
      reason: String(formData.get("reason") || ""),
      status: "pending"
    };
    setLeaves((items) => [newLeave, ...items]);
    await supabaseRef.current?.from("almahad_leaves").insert({ user_id: newLeave.userId, from_date: newLeave.fromDate, to_date: newLeave.toDate, reason: newLeave.reason, status: newLeave.status });
  }

  async function updateLeave(id: string, status: LeaveStatus) {
    setLeaves((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    await supabaseRef.current?.from("almahad_leaves").update({ status }).eq("id", id);
  }

  async function createHandover(collectionId: string, mode: "full" | "partial", partialAmount = 0) {
    const collection = collections.find((item) => item.id === collectionId);
    if (!collection) return;
    const remaining = collection.amount - collection.handedOverAmount;
    const amount = mode === "full" ? remaining : Math.min(partialAmount, remaining);
    if (amount <= 0) return;
    const newHandover: Handover = {
      id: crypto.randomUUID(),
      collectionId,
      staffId: collection.collectedBy,
      amount,
      status: role === "admin" ? "approved" : "pending",
      date: today,
      note: mode === "full" ? "مکمل حوالگی" : "جزوی حوالگی"
    };
    setHandovers((items) => [newHandover, ...items]);
    if (role === "admin") {
      setCollections((items) =>
        items.map((item) =>
          item.id === collectionId ? { ...item, handedOverAmount: item.handedOverAmount + amount } : item
        )
      );
    }
    await supabaseRef.current?.from("almahad_handovers").insert({ collection_id: newHandover.collectionId, staff_id: newHandover.staffId, amount: newHandover.amount, status: newHandover.status, note: newHandover.note });
    if (role === "admin") {
      await supabaseRef.current?.from("almahad_collections").update({
        handed_over_amount: collection.handedOverAmount + amount,
        remaining_amount: Math.max(collection.amount - collection.handedOverAmount - amount, 0),
        is_handed_over: collection.amount - collection.handedOverAmount - amount <= 0
      }).eq("id", collectionId);
    }
  }

  async function approveHandover(id: string, status: HandoverStatus) {
    const handover = handovers.find((item) => item.id === id);
    if (!handover) return;
    setHandovers((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    if (status === "approved") {
      setCollections((items) =>
        items.map((item) =>
          item.id === handover.collectionId
            ? { ...item, handedOverAmount: Math.min(item.amount, item.handedOverAmount + handover.amount) }
            : item
        )
      );
    }
    await supabaseRef.current?.from("almahad_handovers").update({ status, approved_at: new Date().toISOString() }).eq("id", id);
    if (status === "approved") {
      const collection = collections.find((item) => item.id === handover.collectionId);
      if (collection) {
        await supabaseRef.current?.from("almahad_collections").update({
          handed_over_amount: Math.min(collection.amount, collection.handedOverAmount + handover.amount),
          remaining_amount: Math.max(collection.amount - collection.handedOverAmount - handover.amount, 0),
          is_handed_over: collection.amount - collection.handedOverAmount - handover.amount <= 0
        }).eq("id", handover.collectionId);
      }
    }
  }

  async function generatePayroll(formData: FormData) {
    const staffId = String(formData.get("staffId") || currentStaffId);
    const salaryMode = String(formData.get("salaryMode") || "fixed") as SalaryMode;
    const person = staff.find((item) => item.id === staffId);
    const staffCollection = collections.filter((item) => item.collectedBy === staffId).reduce((sum, item) => sum + item.amount, 0);
    const baseSalary = Number(formData.get("baseSalary") || person?.baseSalary || 0);
    const newPayroll: Payroll = {
      id: crypto.randomUUID(),
      staffId,
      month: String(formData.get("month") || new Date().toISOString().slice(0, 7)),
      baseSalary,
      totalCollection: staffCollection,
      salaryMode,
      finalSalary: salaryMode === "collection_based" ? staffCollection : baseSalary
    };
    setPayroll((items) => [newPayroll, ...items]);
    await supabaseRef.current?.from("almahad_payroll").insert({ staff_id: newPayroll.staffId, month: newPayroll.month, base_salary: newPayroll.baseSalary, total_collection: newPayroll.totalCollection, salary_mode: newPayroll.salaryMode, final_salary: newPayroll.finalSalary });
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = filteredCollections.map((item) => ({
      "نام / Name": item.name,
      "رقم / Amount": item.amount,
      "تاریخ / Date": item.date,
      "قسم / Type": typeLabels[item.type].en,
      "عطیہ / Donation": item.donationType ? donationLabels[item.donationType].en : "",
      "عملہ / Staff": staffName(item.collectedBy),
      "حوالہ / Handover": item.handedOverAmount,
      "باقی / Remaining": item.amount - item.handedOverAmount
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, "madarsa-report.xlsx");
  }

  function sendReceipt(collection: Collection) {
    const typeLabel = collection.type === "monthly_fee"
      ? "ماہانہ فیس · Monthly Fee"
      : `عطیہ · ${collection.donationType === "zakat" ? "زکوٰۃ · Zakat" : collection.donationType === "sadqa" ? "صدقہ · Sadqa" : collection.donationType === "fitrah" ? "فطرہ · Fitrah" : "جنرل · General"}`;
    const collectorName = staffName(collection.collectedBy);
    const receiptNo = collection.id.slice(-6).toUpperCase();
    const html = `<!DOCTYPE html><html dir="rtl" lang="ur"><head><meta charset="UTF-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif;background:#f0f0f0;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:20px;}
  .page{width:160mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.15);}
  .outer{border:4px double #1a3a6c;margin:4px;}
  .inner{border:1.5px solid #1a3a6c;margin:3px;}

  /* Top decorative band */
  .top-band{background:#1a3a6c;color:#fff;text-align:center;padding:16px 10px 12px;}
  .arabic-name{font-family:'Amiri','Traditional Arabic','Times New Roman',serif;font-size:30px;font-weight:700;line-height:1.5;direction:rtl;}
  .en-name{font-size:10px;letter-spacing:2px;opacity:0.85;margin-top:4px;font-family:Arial,sans-serif;}

  /* Gold divider */
  .gold-band{background:linear-gradient(90deg,#1a3a6c,#c9a84c,#1a3a6c);height:4px;}

  /* Address bar */
  .addr-bar{background:#eef2f8;text-align:center;padding:8px 10px;color:#1a3a6c;border-bottom:1px solid #c5cfe0;}
  .addr-ur{font-size:13px;font-weight:600;margin-bottom:2px;}
  .addr-en{font-size:10px;font-family:Arial,sans-serif;color:#444;letter-spacing:0.3px;}

  /* Receipt header row */
  .meta-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#f7f9fc;border-bottom:1px solid #dde3ef;font-size:11px;font-family:Arial,sans-serif;}
  .meta-row .badge{background:#1a3a6c;color:#fff;padding:3px 10px;border-radius:3px;font-size:11px;letter-spacing:0.5px;}

  /* Body */
  .body{padding:12px 16px;}
  .field{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dashed #d0d8e8;}
  .field:last-of-type{border-bottom:none;}
  .field-label{color:#555;font-size:12px;display:flex;align-items:center;gap:6px;}
  .field-label .dot{width:6px;height:6px;background:#1a3a6c;border-radius:50%;display:inline-block;}
  .field-value{font-weight:700;font-size:13px;color:#1a1a1a;}

  /* Amount section */
  .amount-section{margin:14px 0;text-align:center;}
  .amount-label{font-size:11px;color:#888;margin-bottom:6px;font-family:Arial,sans-serif;}
  .amount-box{display:inline-block;border:2.5px solid #1a3a6c;padding:10px 36px;font-size:22px;font-weight:700;color:#1a3a6c;font-family:Arial,sans-serif;letter-spacing:1px;position:relative;}
  .amount-box::before,.amount-box::after{content:'✦';position:absolute;top:50%;transform:translateY(-50%);font-size:12px;color:#c9a84c;}
  .amount-box::before{right:-18px;} .amount-box::after{left:-18px;}

  /* Signatures */
  .sig-section{display:flex;justify-content:space-between;padding:16px 20px 8px;border-top:1px solid #dde3ef;margin-top:4px;}
  .sig{text-align:center;width:38%;}
  .sig-line{border-top:1.5px solid #1a3a6c;margin-bottom:5px;}
  .sig-text{font-size:11px;color:#555;}

  /* Footer */
  .footer{background:#1a3a6c;color:#fff;text-align:center;padding:8px;font-size:12px;}

  @media print{body{background:#fff;padding:0;} .page{box-shadow:none;width:100%;}}
</style></head><body>
<div class="page"><div class="outer"><div class="inner">

  <div class="top-band">
    <div class="arabic-name">الْمَعْهَدُ لِتَحْفِيظِ الْقُرْآنِ</div>
    <div class="en-name">AL MAHAD LE TAHFIZIL QURAN</div>
  </div>
  <div class="gold-band"></div>
  <div class="addr-bar">
    <div class="addr-ur">دوگھرا، جالے، دربھنگہ، بہار</div>
    <div class="addr-en">Doghra, Jalley, Darbhanga, Bihar (Pin: 847302)</div>
  </div>

  <div class="meta-row">
    <div style="font-family:Arial,sans-serif;">رسید نمبر &nbsp;<strong>${receiptNo}</strong></div>
    <div class="badge">RECEIPT</div>
    <div style="font-family:Arial,sans-serif;direction:ltr;"><strong>${collection.date}</strong></div>
  </div>

  <div class="body">
    <div class="field">
      <div class="field-label"><span class="dot"></span> جناب / نام</div>
      <div class="field-value">${collection.name}</div>
    </div>
    <div class="field">
      <div class="field-label"><span class="dot"></span> قسم · Type</div>
      <div class="field-value">${typeLabel}</div>
    </div>
    <div class="field">
      <div class="field-label"><span class="dot"></span> جمع کنندہ · Collected By</div>
      <div class="field-value">${collectorName}</div>
    </div>
    <div class="amount-section">
      <div class="amount-label">رقم · AMOUNT</div>
      <div class="amount-box">Rs. ${collection.amount.toLocaleString()}/-</div>
    </div>
  </div>

  <div class="sig-section">
    <div class="sig"><div class="sig-line"></div><div class="sig-text">دستخط دہندہ<br/>Payer's Signature</div></div>
    <div class="sig"><div class="sig-line"></div><div class="sig-text">دستخط جمع کنندہ<br/>Collector's Signature</div></div>
  </div>

  <div class="footer">جَزَاكُمُ اللّٰهُ خَيْرًا &nbsp;·&nbsp; May Allah Reward You</div>

</div></div></div>
<div id="btn-row" style="display:flex;justify-content:center;gap:10px;margin:20px 0;flex-wrap:wrap;">
  <button onclick="downloadPDF()" style="background:#1a3a6c;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;">
    ⬇ PDF ڈاؤنلوڈ
  </button>
  <button onclick="shareWhatsApp()" style="background:#25D366;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;">
    WhatsApp بھیجیں
  </button>
  <button onclick="shareTelegram()" style="background:#0088cc;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;">
    Telegram بھیجیں
  </button>
  <button onclick="printReceipt()" style="background:#fff;color:#1a3a6c;border:2px solid #1a3a6c;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;">
    🖨 پرنٹ
  </button>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<script>
const receiptMsg = encodeURIComponent("المعہد لتحفیظ القرآن\\nرسید نمبر: ${receiptNo}\\nنام: ${collection.name}\\nرقم: Rs. ${collection.amount.toLocaleString()}\\nقسم: ${typeLabel}\\nتاریخ: ${collection.date}\\nجزاکم اللہ خیراً");

async function getCanvas() {
  const btn = document.getElementById('btn-row');
  btn.style.display = 'none';
  const canvas = await html2canvas(document.querySelector('.page'), { scale: 3, useCORS: true });
  btn.style.display = 'flex';
  return canvas;
}

async function downloadPDF() {
  const canvas = await getCanvas();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const imgData = canvas.toDataURL('image/png');
  const w = pdf.internal.pageSize.getWidth();
  const h = (canvas.height * w) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, w, h);
  pdf.save('receipt-${receiptNo}.pdf');
}

async function shareWhatsApp() {
  if (navigator.share) {
    const canvas = await getCanvas();
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'receipt-${receiptNo}.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'مدرسہ رسید', text: 'رسید نمبر ${receiptNo}' });
        return;
      }
      window.open('https://wa.me/?text=' + receiptMsg, '_blank');
    });
  } else {
    window.open('https://wa.me/?text=' + receiptMsg, '_blank');
  }
}

function shareTelegram() {
  window.open('https://t.me/share/url?url=&text=' + receiptMsg, '_blank');
}

function printReceipt() {
  const btn = document.getElementById('btn-row');
  btn.style.display = 'none';
  window.print();
  btn.style.display = 'flex';
}
<\/script>
</body></html>`;
    const w = window.open("", "_blank", "width=640,height=750");
    if (w) { w.document.write(html); w.document.close(); }
  }

  const activeNav = navItems.find((n) => n.key === active)!;

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d2b2b]">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm opacity-60">لوڈ ہو رہا ہے... Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f0f4f8]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0d2b2b] lg:flex">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7c948]">
              <ShieldCheck className="h-5 w-5 text-[#0d2b2b]" />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">مدرسہ نظام</div>
              <div className="text-[11px] text-white/50 tracking-wide">Madarsa System</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70">
            {role === "admin" ? (
              <span>ایڈمن پینل <span className="opacity-60">· Admin Panel</span></span>
            ) : (
              <span>{activeStaff.name}</span>
            )}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#f7c948] text-[#0d2b2b]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-right">{item.labelUr}</span>
                <span className="text-[10px] opacity-60">{item.labelEn}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => {
              localStorage.removeItem("almahad_user");
              window.location.href = "/auth";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogIn className="h-4 w-4 shrink-0 rotate-180" />
            <span className="flex-1 text-right">لاگ آؤٹ</span>
            <span className="text-[10px] opacity-60">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white border-b px-4 py-3 shadow-sm lg:px-6">
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {activeNav.labelUr}
              <span className="mr-2 text-sm font-normal text-muted-foreground">{activeNav.labelEn}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {role === "admin" ? "ایڈمن · Admin" : staff.find(s => s.id === currentStaffId)?.name ?? "عملہ"}
            </span>
            <Button
              variant="ghost"
              className="h-9 gap-1.5 text-sm border"
              onClick={async () => {
                const client = createClient();
                localStorage.removeItem("almahad_user");
                window.location.href = "/auth";
              }}
            >
              <LogIn className="h-4 w-4 rotate-180" />
              <span>لاگ آؤٹ</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          {/* Summary Cards — always visible */}
          <SummaryCards
            totalCollection={totalCollection}
            totalExpenses={totalExpenses}
            balance={balance}
            totalHandover={totalHandover}
            remainingAmount={remainingAmount}
            role={role}
          />

          {/* Filters bar */}
          <FiltersBar
            query={query}
            setQuery={setQuery}
            filterStaff={filterStaff}
            setFilterStaff={setFilterStaff}
            filterType={filterType}
            setFilterType={setFilterType}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            staff={staff.filter((s) => s.role === "staff")}
            role={role}
            onExport={exportExcel}
          />

          {active === "dashboard" && (
            <DashboardView
              role={role}
              collections={filteredCollections}
              expenses={expenses}
              handovers={handovers}
              staffName={staffName}
              onReceipt={sendReceipt}
              onApproveHandover={approveHandover}
            />
          )}
          {active === "staff" && <StaffView staff={staff} onAdd={addStaff} message={staffMsg} role={role} currentStaffId={currentStaffId} onChangePassword={changePassword} />}
          {active === "students" && <StudentsView students={students} onAdd={addStudent} />}
          {active === "finance" && (
            <FinanceView
              role={role}
              staff={staff}
              students={students}
              collections={filteredCollections}
              expenses={expenses}
              onAddCollection={addCollection}
              onAddExpense={addExpense}
              onReceipt={sendReceipt}
              staffName={staffName}
            />
          )}
          {active === "attendance" && (
            <AttendanceView
              role={role}
              staffName={staffName}
              attendance={attendance}
              leaves={leaves}
              onMark={markAttendance}
              onLeave={applyLeave}
              onUpdateLeave={updateLeave}
            />
          )}
          {active === "payroll" && (
            <PayrollView
              role={role}
              staff={staff.filter((s) => s.role === "staff")}
              payroll={payroll}
              onGenerate={generatePayroll}
              staffName={staffName}
            />
          )}
          {active === "reports" && (
            <ReportsView
              collections={filteredCollections}
              expenses={expenses}
              attendance={attendance}
              payroll={payroll}
              handovers={handovers}
              staffName={staffName}
            />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 text-[9px] font-semibold transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className="truncate w-full text-center">{item.labelUr}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Summary Cards ───────────────────────────────────────────────────────────

function SummaryCards({ totalCollection, totalExpenses, balance, totalHandover, remainingAmount, role }: {
  totalCollection: number; totalExpenses: number; balance: number; totalHandover: number; remainingAmount: number; role: UserRole;
}) {
  const adminCards = [
    { ur: "کل کلیکشن", en: "Total Collection", value: totalCollection, icon: TrendingUp, color: "bg-emerald-50 text-emerald-700", iconBg: "bg-emerald-100" },
    { ur: "کل اخراجات", en: "Total Expenses", value: totalExpenses, icon: TrendingDown, color: "bg-red-50 text-red-700", iconBg: "bg-red-100" },
    { ur: "بیلنس", en: "Balance", value: balance, icon: Landmark, color: "bg-blue-50 text-blue-700", iconBg: "bg-blue-100" },
  ];
  const staffCards = [
    { ur: "میری کلیکشن", en: "My Collection", value: totalCollection, icon: TrendingUp, color: "bg-emerald-50 text-emerald-700", iconBg: "bg-emerald-100" },
    { ur: "حوالہ شدہ", en: "Handed Over", value: totalHandover, icon: CheckCircle2, color: "bg-amber-50 text-amber-700", iconBg: "bg-amber-100" },
    { ur: "باقی رقم", en: "Remaining", value: remainingAmount, icon: WalletCards, color: "bg-orange-50 text-orange-700", iconBg: "bg-orange-100" },
  ];
  const cards = role === "admin" ? adminCards : staffCards;

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.en} className={`rounded-2xl p-4 ${card.color} border border-current/10`}>
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2 ${card.iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold sm:text-2xl leading-tight">{formatCurrency(card.value)}</div>
              <div className="mt-1 text-xs font-medium opacity-80">{card.ur}</div>
              <div className="text-[10px] opacity-60 tracking-wide">{card.en}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Filters Bar ─────────────────────────────────────────────────────────────

function FiltersBar({ query, setQuery, filterStaff, setFilterStaff, filterType, setFilterType, fromDate, setFromDate, toDate, setToDate, staff, role, onExport }: {
  query: string; setQuery: (v: string) => void;
  filterStaff: string; setFilterStaff: (v: string) => void;
  filterType: string; setFilterType: (v: string) => void;
  fromDate: string; setFromDate: (v: string) => void;
  toDate: string; setToDate: (v: string) => void;
  staff: Staff[]; role: UserRole; onExport: () => void;
}) {
  return (
    <div className="mb-5 rounded-2xl bg-white border p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="تلاش کریں · Search" className="pr-9" />
        </div>
        {role === "admin" && (
          <Select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="w-44">
            <option value="all">تمام عملہ · All Staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-44">
          <option value="all">تمام اقسام · All Types</option>
          <option value="monthly_fee">ماہانہ فیس · Monthly Fee</option>
          <option value="donation">عطیہ · Donation</option>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        {(query || filterStaff !== "all" || filterType !== "all" || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setFilterStaff("all"); setFilterType("all"); setFromDate(""); setToDate(""); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button onClick={onExport} variant="secondary" size="sm">
          <Download className="h-4 w-4" />
          Excel
        </Button>
      </div>
    </div>
  );
}

// ─── Dashboard View ──────────────────────────────────────────────────────────

function DashboardView({ role, collections, expenses, handovers, staffName, onReceipt, onApproveHandover }: {
  role: UserRole; collections: Collection[]; expenses: Expense[]; handovers: Handover[];
  staffName: (id: string) => string;
  onReceipt: (c: Collection) => void;
  onApproveHandover: (id: string, status: HandoverStatus) => void;
}) {
  return (
    <div className="space-y-5">
      <CollectionsTable collections={collections} staffName={staffName} onReceipt={onReceipt} />
      <div className="grid gap-5 xl:grid-cols-2">
        <SideList
          title="حوالگی کی تاریخ"
          titleEn="Handover History"
          icon={CheckCircle2}
          rows={handovers.map((h) => ({
            main: staffName(h.staffId),
            sub: `${formatCurrency(h.amount)} · ${h.date}`,
            badge: statusLabels[h.status].en,
            badgeColor: h.status === "approved" ? "bg-emerald-100 text-emerald-700" : h.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
            action: role === "admin" && h.status === "pending" ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => onApproveHandover(h.id, "approved")}>منظور · Approve</Button>
                <Button size="sm" variant="danger" onClick={() => onApproveHandover(h.id, "rejected")}>مسترد · Reject</Button>
              </div>
            ) : null
          }))}
        />
        {role === "admin" && (
          <SideList
            title="تازہ اخراجات"
            titleEn="Recent Expenses"
            icon={ReceiptText}
            rows={expenses.map((e) => ({
              main: e.description,
              sub: `${formatCurrency(e.amount)} · ${e.paidTo} · ${e.date}`,
              badge: null,
              badgeColor: "",
              action: null
            }))}
          />
        )}
      </div>
    </div>
  );
}

// ─── Collections Table ───────────────────────────────────────────────────────

function CollectionsTable({ collections, staffName, onReceipt }: {
  collections: Collection[];
  staffName: (id: string) => string;
  onReceipt: (c: Collection) => void;
}) {

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div>
          <h2 className="font-bold text-base">کلیکشن فہرست</h2>
          <p className="text-xs text-muted-foreground">Collection List</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {collections.length} records
        </span>
      </div>

      {/* Mobile card view */}
      <div className="divide-y sm:hidden">
        {collections.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">کوئی ریکارڈ نہیں · No records found</div>
        )}
        {collections.map((item) => {
          const remaining = item.amount - item.handedOverAmount;
          return (
            <div key={item.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{staffName(item.collectedBy)} · {item.date}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm font-mono">{formatCurrency(item.amount)}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {item.donationType ? donationLabels[item.donationType].ur : typeLabels[item.type].ur}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold font-mono ${remaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  باقی: {formatCurrency(remaining)}
                </span>
                <Button size="sm" variant="secondary" onClick={() => onReceipt(item)}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block finance-scrollbar overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-xs">
              <th className="px-4 py-3 text-right font-semibold">نام · Name</th>
              <th className="px-4 py-3 text-right font-semibold">رقم · Amount</th>
              <th className="px-4 py-3 text-right font-semibold">قسم · Type</th>
              <th className="px-4 py-3 text-right font-semibold">تاریخ · Date</th>
              <th className="px-4 py-3 text-right font-semibold">عملہ · Staff</th>
              <th className="px-4 py-3 text-right font-semibold">باقی · Remaining</th>
              <th className="px-4 py-3 text-right font-semibold w-[280px]">عمل · Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {collections.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  کوئی ریکارڈ نہیں · No records found
                </td>
              </tr>
            )}
            {collections.map((item) => {
              const remaining = item.amount - item.handedOverAmount;
              return (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {item.donationType ? donationLabels[item.donationType].ur : typeLabels[item.type].ur}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">{staffName(item.collectedBy)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold font-mono ${remaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => onReceipt(item)} title="Send Receipt">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Finance View ────────────────────────────────────────────────────────────

function FinanceView({ role, staff, students, collections, expenses, onAddCollection, onAddExpense, onReceipt, staffName }: {
  role: UserRole; staff: Staff[]; students: Student[]; collections: Collection[]; expenses: Expense[];
  onAddCollection: (f: FormData) => void; onAddExpense: (f: FormData) => void;
  onReceipt: (c: Collection) => void;
  staffName: (id: string) => string;
}) {
  const [tab, setTab] = useState<"fee" | "donation" | "expense">("fee");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("ur-PK", { month: "long", year: "numeric" });
    return { val, label };
  });

  const filteredStudents = studentSearch.length > 0
    ? students.filter(s => s.name.includes(studentSearch) || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
    : students;

  const feeCollections = collections.filter((c) => c.type === "monthly_fee");
  const donationCollections = collections.filter((c) => c.type === "donation");

  const totalFee = feeCollections.reduce((s, c) => s + c.amount, 0);
  const totalDonation = donationCollections.reduce((s, c) => s + c.amount, 0);
  const totalZakat = donationCollections.filter(c => c.donationType === "zakat").reduce((s, c) => s + c.amount, 0);
  const totalSadqa = donationCollections.filter(c => c.donationType === "sadqa").reduce((s, c) => s + c.amount, 0);
  const totalFitrah = donationCollections.filter(c => c.donationType === "fitrah").reduce((s, c) => s + c.amount, 0);
  const totalGeneral = donationCollections.filter(c => c.donationType === "general").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-5">
      {/* Mini summary cards for this panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] text-muted-foreground">ماہانہ فیس · Monthly Fee</div>
          <div className="mt-1 text-sm font-bold text-emerald-600 sm:text-lg">{formatCurrency(totalFee)}</div>
          <div className="text-[10px] text-muted-foreground">{feeCollections.length} entries</div>
        </div>
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] text-muted-foreground">کل عطیہ · Total Donations</div>
          <div className="mt-1 text-sm font-bold text-blue-600 sm:text-lg">{formatCurrency(totalDonation)}</div>
          <div className="text-[10px] text-muted-foreground">{donationCollections.length} entries</div>
        </div>
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] text-muted-foreground">زکوٰۃ · Zakat</div>
          <div className="mt-1 text-sm font-bold text-purple-600 sm:text-lg">{formatCurrency(totalZakat)}</div>
          <div className="text-[10px] text-muted-foreground">صدقہ {formatCurrency(totalSadqa)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] text-muted-foreground">فطرہ · Fitrah</div>
          <div className="mt-1 text-sm font-bold text-amber-600 sm:text-lg">{formatCurrency(totalFitrah)}</div>
          <div className="text-[10px] text-muted-foreground">جنرل {formatCurrency(totalGeneral)}</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-2xl border bg-white overflow-hidden shadow-sm">
        {[
          { key: "fee", ur: "ماہانہ فیس", en: "Monthly Fee", color: "emerald" },
          { key: "donation", ur: "عطیہ / زکوٰۃ", en: "Donations", color: "blue" },
          ...(role === "admin" ? [{ key: "expense", ur: "اخراجات", en: "Expenses", color: "red" }] : [])
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span>{t.ur}</span>
            <span className="mr-1 text-[11px] opacity-70">{t.en}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        {/* Left: entry form */}
        <div className="rounded-2xl bg-white border shadow-sm p-5">

          {/* Monthly Fee Form */}
          {tab === "fee" && (
            <>
              <SectionHeader icon={Banknote} ur="ماہانہ فیس جمع کریں" en="Collect Monthly Fee" />
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("type", "monthly_fee");
                if (selectedStudent) {
                  fd.set("studentId", selectedStudent.id);
                  fd.set("name", selectedStudent.name);
                }
                onAddCollection(fd);
                e.currentTarget.reset();
                setStudentSearch("");
                setSelectedStudent(null);
              }} className="mt-4 space-y-3">
                <div>
                  <Label>طالب علم تلاش کریں · Search Student</Label>
                  <Input
                    className="mt-1"
                    placeholder="نام لکھیں..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(null);
                    }}
                    dir="rtl"
                  />
                  {studentSearch.length > 0 && !selectedStudent && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border bg-white shadow-md">
                      {filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">کوئی نتیجہ نہیں</div>
                      ) : filteredStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(s.monthlyFee)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <div className="mt-1 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
                      <span className="font-semibold text-emerald-700">{selectedStudent.name}</span>
                      <span className="text-emerald-600">{formatCurrency(selectedStudent.monthlyFee)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label>مہینہ · Month</Label>
                  <Select name="month" defaultValue={currentMonth} required className="mt-1">
                    {months.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>رقم · Amount</Label>
                  <Input
                    name="amount"
                    type="number"
                    placeholder="0"
                    required
                    className="mt-1"
                    defaultValue={selectedStudent ? String(selectedStudent.monthlyFee) : ""}
                    key={selectedStudent?.id ?? "none"}
                  />
                  {selectedStudent && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      مقررہ فیس {formatCurrency(selectedStudent.monthlyFee)} — تبدیل کر سکتے ہیں · Can change
                    </p>
                  )}
                </div>
                <div>
                  <Label>تاریخ · Date</Label>
                  <Input name="date" type="date" defaultValue={today} required className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={!selectedStudent}>
                  <Plus className="h-4 w-4" /> فیس جمع کریں · Collect Fee
                </Button>
              </form>
            </>
          )}

          {/* Donation Form */}
          {tab === "donation" && (
            <>
              <SectionHeader icon={Landmark} ur="عطیہ جمع کریں" en="Collect Donation" />
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("type", "donation");
                onAddCollection(fd);
                e.currentTarget.reset();
              }} className="mt-4 space-y-3">
                <div>
                  <Label>عطیہ کی قسم · Donation Type</Label>
                  <Select name="donationType" defaultValue="general" required className="mt-1">
                    <option value="sadqa">صدقہ · Sadqa</option>
                    <option value="zakat">زکوٰۃ · Zakat</option>
                    <option value="fitrah">فطرہ · Fitrah</option>
                    <option value="general">جنرل · General</option>
                  </Select>
                </div>
                <div>
                  <Label>دینے والے کا نام · Donor Name</Label>
                  <Input name="name" placeholder="نام" required className="mt-1" />
                </div>
                <div>
                  <Label>رقم · Amount</Label>
                  <Input name="amount" type="number" placeholder="0" required className="mt-1" />
                </div>
                <div>
                  <Label>تاریخ · Date</Label>
                  <Input name="date" type="date" defaultValue={today} required className="mt-1" />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" /> عطیہ محفوظ کریں · Save Donation
                </Button>
              </form>
            </>
          )}

          {/* Expense Form */}
          {tab === "expense" && role === "admin" && (
            <>
              <SectionHeader icon={ReceiptText} ur="خرچ شامل کریں" en="Add Expense" />
              <form onSubmit={(e) => handleFormSubmit(e, onAddExpense)} className="mt-4 space-y-3">
                <div><Label>تفصیل · Description</Label><Input name="description" placeholder="تفصیل" required className="mt-1" /></div>
                <div><Label>رقم · Amount</Label><Input name="amount" type="number" placeholder="0" required className="mt-1" /></div>
                <div><Label>کس کو ادا کیا · Paid To</Label><Input name="paidTo" placeholder="نام" required className="mt-1" /></div>
                <div><Label>تاریخ · Date</Label><Input name="date" type="date" defaultValue={today} required className="mt-1" /></div>
                <Button type="submit" variant="secondary" className="w-full">خرچ محفوظ کریں · Save</Button>
              </form>
            </>
          )}
        </div>

        {/* Right: table */}
        <div className="space-y-5">
          {tab === "fee" && (
            <CollectionsTable collections={feeCollections} staffName={staffName} onReceipt={onReceipt} />
          )}
          {tab === "donation" && (
            <CollectionsTable collections={donationCollections} staffName={staffName} onReceipt={onReceipt} />
          )}
          {tab === "expense" && role === "admin" && (
            <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="font-bold">اخراجات · Expenses</h2>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{expenses.length} entries</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs">
                  <tr>
                    <th className="px-4 py-3 text-right">تفصیل · Description</th>
                    <th className="px-4 py-3 text-right">رقم · Amount</th>
                    <th className="px-4 py-3 text-right">کس کو · Paid To</th>
                    <th className="px-4 py-3 text-right">تاریخ · Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">کوئی خرچ نہیں · No expenses</td></tr>}
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold">{e.description}</td>
                      <td className="px-4 py-3 font-mono text-destructive">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.paidTo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Staff View ──────────────────────────────────────────────────────────────

function StaffView({ staff, onAdd, message, role, currentStaffId, onChangePassword }: {
  staff: Staff[]; onAdd: (f: FormData) => void; message: string;
  role: UserRole; currentStaffId: string; onChangePassword: (id: string, pw: string) => Promise<string>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function submitPasswordChange(id: string) {
    if (newPw.length < 6) { setPwMsg("کم از کم 6 حروف · Min 6 chars"); return; }
    const result = await onChangePassword(id, newPw);
    if (result === "ok") {
      setPwMsg("✓ پاس ورڈ بدل گیا · Password changed");
      setNewPw(""); setChangingId(null);
    } else { setPwMsg("خرابی: " + result); }
  }

  return (
    <div className="space-y-5">
      {/* My Password Change — always visible */}
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <SectionHeader icon={EyeIcon} ur="اپنا پاس ورڈ بدلیں" en="Change My Password" />
        <div className="mt-4 flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Input
              type={showNewPw ? "text" : "password"}
              placeholder="نیا پاس ورڈ · New password"
              value={changingId === currentStaffId ? newPw : ""}
              onChange={(e) => { setChangingId(currentStaffId); setNewPw(e.target.value); setPwMsg(""); }}
              dir="ltr" className="pl-10"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute left-3 top-3 text-muted-foreground">
              {showNewPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          <Button onClick={() => submitPasswordChange(currentStaffId)}>محفوظ · Save</Button>
        </div>
        {pwMsg && changingId === currentStaffId && (
          <p className={`mt-2 text-sm ${pwMsg.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>{pwMsg}</p>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        {/* Add staff — admin only */}
        {role === "admin" && (
          <div className="rounded-2xl bg-white border shadow-sm p-5">
            <SectionHeader icon={Users} ur="عملہ شامل کریں" en="Add Staff Member" />
            <form onSubmit={(e) => handleFormSubmit(e, onAdd)} className="mt-4 space-y-3">
              <div><Label>پورا نام · Full Name</Label><Input name="name" placeholder="مثلاً: قاری عبداللہ" required className="mt-1" /></div>
              <div><Label>موبائل نمبر · Mobile</Label><Input name="mobile" placeholder="03XXXXXXXXX" className="mt-1" dir="ltr" /></div>
              <div>
                <Label>یوزر نیم · Username</Label>
                <Input name="username" placeholder="مثلاً: qari.abdullah" required className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label>پاس ورڈ · Password</Label>
                <div className="relative mt-1">
                  <Input name="password" type={showPassword ? "text" : "password"} placeholder="کم از کم 6 حروف" required minLength={6} dir="ltr" className="pl-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-muted-foreground">
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div><Label>بنیادی تنخواہ · Base Salary</Label><Input name="baseSalary" type="number" placeholder="0" className="mt-1" /></div>
              {message && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${message.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{message}</div>
              )}
              <Button type="submit" className="w-full h-11"><Plus className="h-4 w-4" />اکاؤنٹ بنائیں · Create Account</Button>
            </form>
          </div>
        )}

        {/* Staff list */}
        <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
            <h2 className="font-bold">عملہ فہرست · Staff List</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{staff.length}</span>
          </div>
          <div className="divide-y">
            {staff.length === 0 && <p className="px-5 py-8 text-center text-muted-foreground text-sm">کوئی عملہ نہیں · No staff yet</p>}
            {staff.map((s) => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{s.email} · {s.role === "admin" ? "Admin" : "Staff"}</div>
                  </div>
                  {role === "admin" && s.id !== currentStaffId && (
                    <Button size="sm" variant="ghost" className="text-xs border" onClick={() => { setChangingId(s.id); setNewPw(""); setPwMsg(""); }}>
                      پاس ورڈ بدلیں
                    </Button>
                  )}
                </div>
                {changingId === s.id && s.id !== currentStaffId && (
                  <div className="mt-3 flex gap-2">
                    <Input type="password" placeholder="نیا پاس ورڈ" value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwMsg(""); }} dir="ltr" className="flex-1" />
                    <Button size="sm" onClick={() => submitPasswordChange(s.id)}>محفوظ</Button>
                    <Button size="sm" variant="ghost" onClick={() => setChangingId(null)}>X</Button>
                  </div>
                )}
                {pwMsg && changingId === s.id && (
                  <p className={`mt-1 text-xs ${pwMsg.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>{pwMsg}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Students View ───────────────────────────────────────────────────────────

type OcrRow = { id: string; name: string; guardianName: string; phone: string; monthlyFee: string };

function StudentsView({ students, onAdd }: { students: Student[]; onAdd: (f: FormData) => void }) {
  const [tab, setTab] = useState<"manual" | "upload">("manual");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRows, setOcrRows] = useState<OcrRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setOcrStatus("idle");
      setOcrRows([]);
      void runOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function runOcr(imageData: string) {
    setOcrStatus("running");
    setOcrProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["urd", "ara", "eng"], 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round((m.progress ?? 0) * 100));
          }
        }
      });
      const { data } = await worker.recognize(imageData);
      await worker.terminate();

      // Parse lines — filter out very short/empty lines
      const lines = data.text
        .split("\n")
        .map((l: string) => l.trim())
        .filter((t: string) => t.length > 2);

      // Build editable rows from each line
      const rows: OcrRow[] = lines.map((line: string) => ({
        id: crypto.randomUUID(),
        name: line,
        guardianName: "",
        phone: "",
        monthlyFee: "0"
      }));

      setOcrRows(rows);
      setOcrStatus("done");
    } catch {
      setOcrStatus("error");
    }
  }

  function updateRow(id: string, field: keyof OcrRow, value: string) {
    setOcrRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function deleteRow(id: string) {
    setOcrRows((rows) => rows.filter((r) => r.id !== id));
  }

  async function bulkImport() {
    setImporting(true);
    for (const row of ocrRows) {
      if (!row.name.trim()) continue;
      const fd = new FormData();
      fd.set("name", row.name.trim());
      fd.set("guardianName", row.guardianName || "—");
      fd.set("phone", row.phone || "—");
      fd.set("monthlyFee", row.monthlyFee || "0");
      await onAdd(fd);
      // small delay to avoid batching issues
      await new Promise((r) => setTimeout(r, 30));
    }
    setImporting(false);
    setOcrRows([]);
    setUploadedImage(null);
    setOcrStatus("idle");
    setTab("manual");
  }

  const hasPhoto = tab === "upload" && uploadedImage;

  return (
    <div className={`grid gap-5 ${hasPhoto ? "xl:grid-cols-[520px_1fr]" : "xl:grid-cols-[420px_1fr]"}`}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <SectionHeader icon={ClipboardList} ur="طالب علم شامل کریں" en="Add Student" />

        {/* Tab switcher */}
        <div className="mt-4 flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === "manual" ? "bg-primary text-white" : "bg-muted/40 hover:bg-muted text-muted-foreground"}`}
          >
            <span>دستی</span>
            <span className="mr-1 text-[11px] opacity-70">Manual</span>
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === "upload" ? "bg-primary text-white" : "bg-muted/40 hover:bg-muted text-muted-foreground"}`}
          >
            <span>رجسٹر فوٹو</span>
            <span className="mr-1 text-[11px] opacity-70">Photo</span>
          </button>
        </div>

        {tab === "manual" && (
          <form onSubmit={(e) => handleFormSubmit(e, onAdd)} className="mt-4 space-y-3">
            <div><Label>نام · Name</Label><Input name="name" placeholder="نام" required className="mt-1" /></div>
            <div><Label>سرپرست · Guardian</Label><Input name="guardianName" placeholder="سرپرست کا نام" required className="mt-1" /></div>
            <div><Label>فون · Phone</Label><Input name="phone" placeholder="03XXXXXXXXX" required className="mt-1" /></div>
            <div><Label>ماہانہ فیس · Monthly Fee</Label><Input name="monthlyFee" type="number" placeholder="0" required className="mt-1" /></div>
            <Button type="submit" className="w-full">شامل کریں · Add</Button>
          </form>
        )}

        {tab === "upload" && (
          <div className="mt-4 space-y-3">
            {/* Hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />

            {/* Step 1 — no image yet */}
            {!uploadedImage && (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  رجسٹر کی تصویر لیں — سسٹم خود نام پڑھے گا
                  <br />
                  <span className="text-xs opacity-70">System will auto-read names from the photo using OCR</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-8 text-primary hover:bg-primary/10 transition-colors">
                    <CameraIcon className="h-10 w-10" />
                    <div className="text-center">
                      <div className="text-sm font-bold">کیمرہ</div>
                      <div className="text-[11px] opacity-70">Camera</div>
                    </div>
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-8 text-muted-foreground hover:bg-muted/50 transition-colors">
                    <UploadIcon className="h-10 w-10" />
                    <div className="text-center">
                      <div className="text-sm font-bold">گیلری</div>
                      <div className="text-[11px] opacity-70">Gallery</div>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — image uploaded, show photo + OCR status */}
            {uploadedImage && (
              <div className="space-y-3">
                <div className="relative rounded-xl border overflow-hidden bg-black/5">
                  <img src={uploadedImage} alt="Register" className="w-full object-contain max-h-72" />
                  <button onClick={() => { setUploadedImage(null); setOcrRows([]); setOcrStatus("idle"); }}
                    className="absolute top-2 left-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white">
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()}
                    className="absolute top-2 right-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow hover:bg-white flex items-center gap-1">
                    <CameraIcon className="h-3.5 w-3.5" />
                    نئی تصویر
                  </button>
                </div>

                {/* OCR running */}
                {ocrStatus === "running" && (
                  <div className="rounded-xl border bg-amber-50 p-4 text-center space-y-2">
                    <div className="text-sm font-semibold text-amber-700">نام پڑھے جا رہے ہیں... · Reading names...</div>
                    <div className="w-full bg-amber-200 rounded-full h-2.5">
                      <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${ocrProgress}%` }} />
                    </div>
                    <div className="text-xs text-amber-600">{ocrProgress}%</div>
                  </div>
                )}

                {/* OCR error */}
                {ocrStatus === "error" && (
                  <div className="rounded-xl border border-destructive/30 bg-red-50 p-4 text-center">
                    <p className="text-sm font-semibold text-destructive">تصویر پڑھنے میں خرابی · OCR failed</p>
                    <p className="text-xs text-muted-foreground mt-1">نام دستی درج کریں · Please enter names manually</p>
                  </div>
                )}

                {/* OCR done — editable rows */}
                {ocrStatus === "done" && ocrRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-primary">{ocrRows.length} نام ملے · names found</p>
                        <p className="text-xs text-muted-foreground">غلط نام ٹھیک کریں پھر Import کریں · Fix errors then import</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setOcrRows((r) => [...r, { id: crypto.randomUUID(), name: "", guardianName: "", phone: "", monthlyFee: "0" }])}>
                        <Plus className="h-3.5 w-3.5" /> نام شامل کریں
                      </Button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 finance-scrollbar">
                      {ocrRows.map((row, i) => (
                        <div key={row.id} className="rounded-xl border bg-white p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                            <input
                              value={row.name}
                              onChange={(e) => updateRow(row.id, "name", e.target.value)}
                              placeholder="نام · Name"
                              className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring font-semibold"
                            />
                            <button onClick={() => deleteRow(row.id)} className="shrink-0 rounded-lg p-1.5 hover:bg-red-50 text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input value={row.guardianName} onChange={(e) => updateRow(row.id, "guardianName", e.target.value)}
                              placeholder="سرپرست · Guardian"
                              className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
                            <input value={row.phone} onChange={(e) => updateRow(row.id, "phone", e.target.value)}
                              placeholder="فون · Phone"
                              className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
                            <input value={row.monthlyFee} onChange={(e) => updateRow(row.id, "monthlyFee", e.target.value)}
                              type="number" placeholder="فیس · Fee"
                              className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full h-12 text-base" onClick={bulkImport} disabled={importing}>
                      {importing ? (
                        <span>درآمد ہو رہا ہے... · Importing...</span>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          {ocrRows.length} طلباء درآمد کریں · Bulk Import
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {ocrStatus === "done" && ocrRows.length === 0 && (
                  <div className="rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    کوئی نام نہیں ملا · No names detected. Try a clearer photo.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Students table */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <h2 className="font-bold">طلباء فہرست · Student List</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{students.length} students</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 text-right">#</th>
              <th className="px-4 py-3 text-right">نام · Name</th>
              <th className="px-4 py-3 text-right">سرپرست · Guardian</th>
              <th className="px-4 py-3 text-right">فون · Phone</th>
              <th className="px-4 py-3 text-right">فیس · Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">کوئی طالب علم نہیں · No students yet</td></tr>
            )}
            {students.map((s, i) => (
              <tr key={s.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.guardianName}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.phone}</td>
                <td className="px-4 py-3 font-mono">{formatCurrency(s.monthlyFee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Attendance View ─────────────────────────────────────────────────────────

function AttendanceView({ role, attendance, leaves, staffName, onMark, onLeave, onUpdateLeave }: {
  role: UserRole; attendance: Attendance[]; leaves: Leave[];
  staffName: (id: string) => string;
  onMark: (s: AttendanceStatus) => void;
  onLeave: (f: FormData) => void;
  onUpdateLeave: (id: string, s: LeaveStatus) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl bg-white border shadow-sm p-5 space-y-4">
        <SectionHeader icon={CalendarCheck} ur="حاضری" en="Attendance" />
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => onMark("present")} className="h-14 text-base">
            <CheckCircle2 className="h-5 w-5" />
            حاضر · Present
          </Button>
          <Button onClick={() => onMark("absent")} variant="danger" className="h-14 text-base">
            <X className="h-5 w-5" />
            غائب · Absent
          </Button>
        </div>
        {attendance.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right">عملہ · Staff</th>
                  <th className="px-3 py-2 text-right">تاریخ · Date</th>
                  <th className="px-3 py-2 text-right">حیثیت · Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">{staffName(a.userId)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.date}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {statusLabels[a.status].en}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border shadow-sm p-5 space-y-4">
        <SectionHeader icon={FileText} ur="چھٹی درخواست" en="Leave Application" />
        <form onSubmit={(e) => handleFormSubmit(e, onLeave)} className="space-y-3">
          <div><Label>شروع · From</Label><Input name="fromDate" type="date" defaultValue={today} className="mt-1" /></div>
          <div><Label>ختم · To</Label><Input name="toDate" type="date" defaultValue={today} className="mt-1" /></div>
          <div><Label>وجہ · Reason</Label><Textarea name="reason" placeholder="وجہ بتائیں · Describe reason" className="mt-1" /></div>
          <Button type="submit" className="w-full">درخواست دیں · Apply</Button>
        </form>
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="rounded-xl border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{staffName(l.userId)}</div>
                  <div className="text-xs text-muted-foreground">{l.fromDate} → {l.toDate}</div>
                  <div className="mt-1">{l.reason}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "approved" ? "bg-emerald-100 text-emerald-700" : l.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {statusLabels[l.status].en}
                </span>
              </div>
              {role === "admin" && l.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => onUpdateLeave(l.id, "approved")}>منظور · Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => onUpdateLeave(l.id, "rejected")}>مسترد · Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Payroll View ────────────────────────────────────────────────────────────

function PayrollView({ role, staff, payroll, staffName, onGenerate }: {
  role: UserRole; staff: Staff[]; payroll: Payroll[];
  staffName: (id: string) => string;
  onGenerate: (f: FormData) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {role === "admin" && (
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <SectionHeader icon={WalletCards} ur="تنخواہ بنائیں" en="Generate Payroll" />
          <form onSubmit={(e) => handleFormSubmit(e, onGenerate)} className="mt-4 space-y-3">
            <div>
              <Label>عملہ · Staff</Label>
              <Select name="staffId" className="mt-1">
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div><Label>مہینہ · Month</Label><Input name="month" type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="mt-1" /></div>
            <div><Label>فکس تنخواہ · Fixed Salary</Label><Input name="baseSalary" type="number" placeholder="0" className="mt-1" /></div>
            <div>
              <Label className="block mb-1">تنخواہ کا طریقہ · Salary Mode</Label>
              <p className="text-xs text-muted-foreground mb-2">کیا آپ اسٹاف کی تنخواہ اس کی کلیکشن سے دینا چاہتے ہیں؟ · Pay from collection?</p>
              <Select name="salaryMode" defaultValue="fixed" className="mt-1">
                <option value="collection_based">ہاں، کلیکشن سے · Yes, from Collection</option>
                <option value="fixed">نہیں، فکس · No, Fixed</option>
              </Select>
            </div>
            <Button type="submit" className="w-full">تنخواہ محفوظ کریں · Save</Button>
          </form>
        </div>
      )}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h2 className="font-bold">تنخواہ رپورٹ · Payroll Report</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-right">عملہ · Staff</th>
              <th className="px-4 py-3 text-right">مہینہ · Month</th>
              <th className="px-4 py-3 text-right">طریقہ · Mode</th>
              <th className="px-4 py-3 text-right">تنخواہ · Salary</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payroll.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">کوئی ریکارڈ نہیں · No records</td></tr>
            )}
            {payroll.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-semibold">{staffName(p.staffId)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.month}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.salaryMode === "fixed" ? "Fixed" : "Collection"}</span>
                </td>
                <td className="px-4 py-3 font-mono font-semibold">{formatCurrency(p.finalSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports View ────────────────────────────────────────────────────────────

function ReportsView({ collections, expenses, attendance, payroll, handovers, staffName }: {
  collections: Collection[]; expenses: Expense[]; attendance: Attendance[];
  payroll: Payroll[]; handovers: Handover[]; staffName: (id: string) => string;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SideList title="کلیکشن رپورٹ" titleEn="Collection Report" icon={Banknote}
        rows={collections.map((c) => ({ main: c.name, sub: `${formatCurrency(c.amount)} · ${typeLabels[c.type].en} · ${c.date}`, badge: null, badgeColor: "", action: null }))} />
      <SideList title="اخراجات رپورٹ" titleEn="Expense Report" icon={ReceiptText}
        rows={expenses.map((e) => ({ main: e.description, sub: `${formatCurrency(e.amount)} · ${e.paidTo} · ${e.date}`, badge: null, badgeColor: "", action: null }))} />
      <SideList title="حاضری رپورٹ" titleEn="Attendance Report" icon={CalendarCheck}
        rows={attendance.map((a) => ({ main: staffName(a.userId), sub: a.date, badge: statusLabels[a.status].en, badgeColor: a.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700", action: null }))} />
      <SideList title="تنخواہ رپورٹ" titleEn="Salary Report" icon={WalletCards}
        rows={payroll.map((p) => ({ main: staffName(p.staffId), sub: `${p.month} · ${p.salaryMode === "fixed" ? "Fixed" : "Collection"}`, badge: formatCurrency(p.finalSalary), badgeColor: "bg-emerald-100 text-emerald-700", action: null }))} />
      <SideList title="حوالگی رپورٹ" titleEn="Handover Report" icon={CheckCircle2}
        rows={handovers.map((h) => ({ main: staffName(h.staffId), sub: `${formatCurrency(h.amount)} · ${h.date}`, badge: statusLabels[h.status].en, badgeColor: h.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700", action: null }))} />
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function SideList({ title, titleEn, icon: Icon, rows }: {
  title: string; titleEn: string; icon: typeof Home;
  rows: { main: string; sub: string; badge: string | null; badgeColor: string; action: React.ReactNode }[];
}) {
  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
        <Icon className="h-4 w-4 text-primary" />
        <div>
          <h2 className="font-bold text-sm">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{titleEn}</p>
        </div>
      </div>
      <div className="divide-y">
        {rows.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">کوئی ریکارڈ نہیں · No records</div>
        )}
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20">
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{row.main}</div>
              <div className="text-xs text-muted-foreground truncate">{row.sub}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.badge && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.badgeColor}`}>{row.badge}</span>
              )}
              {row.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, ur, en }: { icon: typeof LogIn; ur: string; en: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-bold text-sm">{ur}</div>
        <div className="text-[11px] text-muted-foreground">{en}</div>
      </div>
    </div>
  );
}
