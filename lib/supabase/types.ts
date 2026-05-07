export type UserRole = "admin" | "staff";
export type AttendanceStatus = "present" | "absent";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type CollectionType = "monthly_fee" | "donation";
export type DonationType = "sadqa" | "zakat" | "fitrah" | "general";
export type SalaryMode = "fixed" | "collection_based";
export type HandoverStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  role: UserRole;
  base_salary: number;
  created_at: string;
};

export type Student = {
  id: string;
  name: string;
  guardian_name: string;
  phone: string;
  monthly_fee: number;
  created_at: string;
};

export type Attendance = {
  id: string;
  user_id: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
};

export type Leave = {
  id: string;
  user_id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  created_at: string;
};

export type Collection = {
  id: string;
  student_id: string | null;
  name: string;
  amount: number;
  date: string;
  type: CollectionType;
  donation_type: DonationType | null;
  collected_by: string;
  is_handed_over: boolean;
  handed_over_amount: number;
  remaining_amount: number;
  created_at: string;
};

export type Handover = {
  id: string;
  collection_id: string;
  staff_id: string;
  amount: number;
  status: HandoverStatus;
  note: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paid_to: string;
  created_at: string;
};

export type Payroll = {
  id: string;
  staff_id: string;
  month: string;
  base_salary: number;
  total_collection: number;
  salary_mode: SalaryMode;
  final_salary: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      almahad_users: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      almahad_students: {
        Row: Student;
        Insert: Omit<Student, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Student, "id" | "created_at">>;
      };
      almahad_attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Attendance, "id" | "created_at">>;
      };
      almahad_leaves: {
        Row: Leave;
        Insert: Omit<Leave, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Leave, "id" | "created_at">>;
      };
      almahad_collections: {
        Row: Collection;
        Insert: Omit<Collection, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Collection, "id" | "created_at">>;
      };
      almahad_handovers: {
        Row: Handover;
        Insert: Omit<Handover, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Handover, "id" | "created_at">>;
      };
      almahad_expenses: {
        Row: Expense;
        Insert: Omit<Expense, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Expense, "id" | "created_at">>;
      };
      almahad_payroll: {
        Row: Payroll;
        Insert: Omit<Payroll, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Payroll, "id" | "created_at">>;
      };
    };
  };
};
