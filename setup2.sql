-- ============================================
-- ส่วนที่ 2: สิทธิ์สำหรับแอดมิน (รันหลังจาก setup.sql)
-- และหลังจากสร้าง bucket "certificates" แล้ว
-- ============================================

-- อนุญาตให้ผู้ที่ login แล้ว (แอดมิน) เพิ่ม/แก้ไข/ลบ templates ได้
create policy "แอดมินจัดการ templates"
  on templates for all
  to authenticated
  using (true)
  with check (true);

-- อนุญาตให้ผู้ที่ login แล้ว (แอดมิน) เพิ่ม/แก้ไข/ลบ students ได้
create policy "แอดมินจัดการ students"
  on students for all
  to authenticated
  using (true)
  with check (true);

-- อนุญาตให้แอดมิน (authenticated) อัปโหลดรูปเข้า bucket certificates
create policy "แอดมินอัปโหลดรูปพื้นหลัง"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'certificates');

create policy "แอดมินลบรูปพื้นหลัง"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'certificates');

create policy "แอดมินแก้ไขรูปพื้นหลัง"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'certificates');

-- อนุญาตให้ทุกคนดูรูปพื้นหลังได้ (เพราะ bucket เป็น public อยู่แล้ว แต่ตั้งเผื่อไว้)
create policy "ทุกคนดูรูปพื้นหลังได้"
  on storage.objects for select
  to public
  using (bucket_id = 'certificates');
