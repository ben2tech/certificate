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
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  // โหลดฟอนต์ให้พร้อมก่อนวาดข้อความ
  try { await document.fonts.load('600 40px Sarabun'); } catch (e) {}
  try { await document.fonts.ready; } catch (e) {}

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

    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  });
}
