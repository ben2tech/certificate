-- ============================================
-- ระบบเกียรติบัตร: สร้างตารางในฐานข้อมูล
-- วางโค้ดนี้ทั้งหมดใน Supabase > SQL Editor แล้วกด Run
-- ============================================

-- ตาราง templates: เก็บพื้นหลังเกียรติบัตร + ตำแหน่งข้อความ
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- ชื่อ template เช่น "เกียรติบัตรค่ายวิทย์ 2569"
  background_url text not null,        -- ลิงก์รูปพื้นหลังใน Storage
  fields jsonb not null default '[]',  -- ตำแหน่งข้อความ เช่น [{"key":"name","x":400,"y":300,"fontSize":32,"align":"center"}]
  created_at timestamptz default now()
);

-- ตาราง students: ข้อมูลนักเรียนที่จะออกเกียรติบัตร
create table students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null,          -- รหัสนักเรียน ใช้ค้นหา
  name text not null,                  -- ชื่อ-นามสกุล ที่จะแสดงบนเกียรติบัตร
  extra jsonb default '{}',            -- ข้อมูลเพิ่มเติม เช่น {"course":"...", "date":"..."}
  template_id uuid references templates(id) on delete cascade,
  created_at timestamptz default now()
);

-- ทำให้ค้นหารหัสนักเรียนเร็วขึ้น
create index idx_students_code on students(student_code);

-- ============================================
-- ตั้งค่าสิทธิ์การเข้าถึง (Row Level Security)
-- ============================================

alter table templates enable row level security;
alter table students enable row level security;

-- อนุญาตให้ทุกคนอ่านข้อมูลได้ (สำหรับหน้านักเรียนค้นหา)
create policy "อ่านได้ทุกคน - templates"
  on templates for select
  using (true);

create policy "อ่านได้ทุกคน - students"
  on students for select
  using (true);

-- หมายเหตุ: การเพิ่ม/แก้ไข/ลบ ข้อมูล (insert/update/delete)
-- จะทำผ่านหน้าแอดมินโดยใช้ authenticated user เท่านั้น
-- เราจะตั้งค่า policy สำหรับแอดมินในขั้นตอนถัดไป
