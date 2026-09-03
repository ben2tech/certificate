// ============================================
// render.js
// วาดเกียรติบัตรจากรูปพื้นหลัง + fields + นักเรียน
// ใช้พิกัดเดียวกันทุกอุปกรณ์
// Desktop / Mobile / iPad
// ============================================


// ============================================
// ดึงค่าข้อความของ Field
// ============================================
function resolveFieldValue(field, student) {

  if (!student) {
    return field.sample || field.label || '';
  }

  // ชื่อ-นามสกุล
  if (field.key === 'name') {
    return student.name || '';
  }

  // รหัสนักเรียน
  if (field.key === 'student_code') {
    return student.student_code || '';
  }

  // ข้อมูลเพิ่มเติม เช่น cert
  const extra = student.extra || {};

  if (
    extra[field.key] !== undefined &&
    extra[field.key] !== null &&
    extra[field.key] !== ''
  ) {
    return String(extra[field.key]);
  }

  return '';
}


// ============================================
// โหลดรูปภาพ
// ============================================
function loadImage(url) {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (error) => {
      reject(error);
    };

    img.src = url;

  });

}


// ============================================
// รอฟอนต์ให้พร้อมก่อนวาด
// ============================================
async function waitForFonts() {

  try {

    if (!document.fonts) {
      return;
    }

    await Promise.all([

      document.fonts.load(
        '400 40px "Sarabun"'
      ),

      document.fonts.load(
        '500 40px "Sarabun"'
      ),

      document.fonts.load(
        '600 40px "Sarabun"'
      ),

      document.fonts.load(
        '700 40px "Sarabun"'
      )

    ]);

    await document.fonts.ready;

  } catch (error) {

    console.warn(
      'โหลดฟอนต์ Sarabun ไม่สำเร็จ',
      error
    );

  }

}


// ============================================
// วาดเกียรติบัตร
// ============================================
async function drawCertificate(
  canvas,
  img,
  fields,
  student
) {

  if (!canvas) {

    throw new Error(
      'ไม่พบ Canvas'
    );

  }

  if (!img) {

    throw new Error(
      'ไม่พบรูปพื้นหลัง'
    );

  }


  // ==========================================
  // ใช้ขนาดจริงของรูป
  // ==========================================
  const w =
    img.naturalWidth ||
    img.width;

  const h =
    img.naturalHeight ||
    img.height;


  if (!w || !h) {

    throw new Error(
      'ไม่สามารถอ่านขนาดรูปพื้นหลังได้'
    );

  }


  // ==========================================
  // Canvas ใช้ขนาดจริงของรูป
  // ==========================================
  canvas.width = w;

  canvas.height = h;


  // ==========================================
  // CSS มีหน้าที่แค่ย่อ/ขยาย Canvas
  // ไม่เอาขนาดหน้าจอมาคำนวณตำแหน่ง
  // ==========================================
  canvas.style.display = 'block';

  canvas.style.width = '100%';

  canvas.style.height = 'auto';

  canvas.style.maxWidth = '100%';

  canvas.style.transform = 'none';


  // ==========================================
  // Canvas Context
  // ==========================================
  const ctx =
    canvas.getContext(
      '2d',
      {
        alpha: false
      }
    );


  if (!ctx) {

    throw new Error(
      'ไม่สามารถสร้าง Canvas Context ได้'
    );

  }


  // ==========================================
  // ล้าง Canvas
  // ==========================================
  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  // ==========================================
  // วาดพื้นหลัง
  // ==========================================
  ctx.drawImage(
    img,
    0,
    0,
    w,
    h
  );


  // ==========================================
  // รอฟอนต์
  // ==========================================
  await waitForFonts();


  // ==========================================
  // วาดข้อมูลทั้งหมด
  // ==========================================
  (fields || []).forEach(field => {

    const text =
      resolveFieldValue(
        field,
        student
      );


    if (!text) {
      return;
    }


    // ========================================
    // พิกัดเป็น % ของรูปต้นฉบับ
    // ========================================
    const xPct =
      Number(field.xPct) || 0;

    const yPct =
      Number(field.yPct) || 0;


    const x =
      xPct * w;

    const y =
      yPct * h;


    // ========================================
    // คุณสมบัติ Font
    // ========================================
    const fontSize =
      Number(field.fontSize) || 32;

    const fontWeight =
      Number(field.fontWeight) || 600;

    const fontFamily =
      field.fontFamily ||
      'Sarabun';

    const color =
      field.color ||
      '#16264a';

    const align =
      field.align ||
      'center';


    // ========================================
    // Save Canvas State
    // ========================================
    ctx.save();


    // ========================================
    // Font
    // ========================================
    ctx.font =
      `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;


    // ========================================
    // สี
    // ========================================
    ctx.fillStyle =
      color;


    // ========================================
    // จัดแนวนอน
    // ========================================
    ctx.textAlign =
      align;


    // ========================================
    // สำคัญมาก
    //
    // จุด x/y เป็นจุดกึ่งกลางแนวตั้ง
    // ========================================
    ctx.textBaseline =
      'middle';


    // ========================================
    // ป้องกันการเปลี่ยนค่าโดย browser
    // ========================================
    ctx.direction =
      'ltr';


    // ========================================
    // วาดข้อความ
    // ========================================
    ctx.fillText(
      text,
      x,
      y
    );


    // ========================================
    // Restore
    // ========================================
    ctx.restore();

  });


  // ==========================================
  // คืน Canvas
  // ==========================================
  return canvas;

}
