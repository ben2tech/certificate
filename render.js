// ============================================
// วาดเกียรติบัตรลง canvas จากรูปพื้นหลัง + fields + ข้อมูลนักเรียน
// ============================================

/**
 * ดึงค่าข้อความของ field หนึ่งช่อง จากข้อมูลนักเรียน
 * key พิเศษ: "name" -> student.name, "student_code" -> student.student_code
 * อื่นๆ -> student.extra[key]
 */
function resolveFieldValue(field, student) {
  if (!student) return field.sample || field.label || '';
  if (field.key === 'name') return student.name || '';
  if (field.key === 'student_code') return student.student_code || '';
  const extra = student.extra || {};
  if (extra[field.key] !== undefined && extra[field.key] !== null && extra[field.key] !== '') {
    return String(extra[field.key]);
  }
  return '';
}

/**
 * โหลดรูปภาพเป็น Promise
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * โหลดฟอนต์ทุกแบบ (น้ำหนัก+ชื่อฟอนต์) ที่ fields ใช้อยู่ให้พร้อมก่อนวาด
 * สำคัญมากสำหรับ iOS/Safari ที่มักวาดข้อความก่อนฟอนต์โหลดเสร็จ
 * ทำให้ตำแหน่ง/ระยะห่างตัวอักษรคลาดเคลื่อนจากที่ตั้งไว้ในหน้าแอดมิน
 */
async function ensureFontsLoaded(fields) {
  const jobs = [];
  (fields || []).forEach(field => {
    const fontWeight = field.fontWeight || 600;
    const fontFamily = field.fontFamily || 'Sarabun';
    // โหลดในหลายขนาดเผื่อ browser cache แยกตาม font-size บางตัว
    const size = field.fontSize || 32;
    const spec = `${fontWeight} ${size}px "${fontFamily}"`;
    jobs.push(
      document.fonts.load(spec).catch(() => {})
    );
  });
  // เผื่อไว้กรณีไม่มี field ก็ยังโหลดฟอนต์หลักไว้
  jobs.push(document.fonts.load('600 32px "Sarabun"').catch(() => {}));
  jobs.push(document.fonts.load('400 32px "Sarabun"').catch(() => {}));
  jobs.push(document.fonts.load('700 32px "Sarabun"').catch(() => {}));

  await Promise.all(jobs);
  try { await document.fonts.ready; } catch (e) {}

  // เผื่อ Safari รายงาน ready เร็วเกินจริง ใส่หน่วงเฟรมเดียวให้ font engine sync
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * วาดเกียรติบัตรลงใน canvas ที่กำหนด
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} img - รูปพื้นหลังที่โหลดแล้ว
 * @param {Array} fields - รายการช่องข้อความ [{key,label,xPct,yPct,fontSize,color,align,fontWeight,fontFamily}]
 * @param {Object|null} student - ข้อมูลนักเรียน (หรือ null สำหรับ preview)
 */
async function drawCertificate(canvas, img, fields, student) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // โหลดฟอนต์ให้ครบก่อนวาดข้อความใดๆ (สำคัญสำหรับ iOS/Safari)
  await ensureFontsLoaded(fields);

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  (fields || []).forEach(field => {
    const text = resolveFieldValue(field, student);
    if (!text) return;
    const x = (field.xPct || 0) * w;
    const y = (field.yPct || 0) * h;
    const fontSize = field.fontSize || 32;
    const fontWeight = field.fontWeight || 600;
    const fontFamily = field.fontFamily || 'Sarabun';
    const color = field.color || '#16264a';
    const align = field.align || 'center';

    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", "Sarabun", sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';

    // คำนวณตำแหน่ง x เอง แทนการพึ่ง ctx.textAlign ของเบราว์เซอร์
    // เพราะ Safari/iOS กับ Chrome ตีความ textAlign ต่างกันในบางกรณี
    ctx.textAlign = 'left';
    const textWidth = ctx.measureText(text).width;
    let drawX = x;
    if (align === 'center') drawX = x - textWidth / 2;
    else if (align === 'right') drawX = x - textWidth;

    ctx.fillText(text, drawX, y);
  });
}
