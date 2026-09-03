// ============================================
// วาดเกียรติบัตรลง Canvas
// ใช้พิกัด xPct / yPct จากรูปต้นฉบับ
// รองรับ Desktop / Android / iPhone / iPad
// ============================================

/**
 * ดึงค่าข้อความของ field
 *
 * name          -> student.name
 * student_code  -> student.student_code
 * อื่น ๆ        -> student.extra[key]
 */
function resolveFieldValue(field, student) {

  if (!student) {
    return field.sample || field.label || '';
  }

  if (field.key === 'name') {
    return student.name || '';
  }

  if (field.key === 'student_code') {
    return student.student_code || '';
  }

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


/**
 * โหลดรูปภาพ
 */
function loadImage(url) {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);

    img.onerror = (err) => reject(err);

    img.src = url;

  });

}


/**
 * รอฟอนต์ Sarabun ให้โหลดเสร็จก่อน
 */
async function waitForFonts() {

  try {

    if (document.fonts) {

      await document.fonts.load(
        '400 40px "Sarabun"'
      );

      await document.fonts.load(
        '600 40px "Sarabun"'
      );

      await document.fonts.load(
        '700 40px "Sarabun"'
      );

      await document.fonts.ready;

    }

  } catch (err) {

    console.warn(
      'ไม่สามารถโหลดฟอนต์ได้:',
      err
    );

  }

}


/**
 * วาดเกียรติบัตร
 *
 * Canvas จะมีขนาดเท่ากับรูปต้นฉบับจริง
 * แล้วใช้ xPct / yPct คำนวณตำแหน่ง
 *
 * ดังนั้นไม่ว่าจะเปิดบน
 * - คอมพิวเตอร์
 * - Android
 * - iPhone
 * - iPad
 *
 * ตำแหน่งข้อความบนใบเกียรติบัตรจะใช้พิกัดเดียวกัน
 */
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
  // 1. ใช้ขนาดจริงของรูป
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
  // 2. ตั้ง Canvas เป็นขนาดจริง
  // ==========================================

  canvas.width = w;

  canvas.height = h;


  // ==========================================
  // 3. ไม่ใช้ CSS size มาคำนวณตำแหน่ง
  // ==========================================

  const ctx =
    canvas.getContext(
      '2d'
    );

  if (!ctx) {

    throw new Error(
      'ไม่สามารถสร้าง Canvas Context ได้'
    );

  }


  // ==========================================
  // 4. ล้าง Canvas
  // ==========================================

  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  // ==========================================
  // 5. วาดพื้นหลัง
  // ==========================================

  ctx.drawImage(
    img,
    0,
    0,
    w,
    h
  );


  // ==========================================
  // 6. โหลดฟอนต์ก่อนวาด
  // ==========================================

  await waitForFonts();


  // ==========================================
  // 7. วาดข้อความ
  // ==========================================

  (fields || []).forEach(
    field => {

      const text =
        resolveFieldValue(
          field,
          student
        );

      if (!text) {
        return;
      }


      // ----------------------------------------
      // คำนวณตำแหน่งจากเปอร์เซ็นต์
      // ----------------------------------------

      const xPct =
        Number(field.xPct) || 0;

      const yPct =
        Number(field.yPct) || 0;

      const x =
        xPct * w;

      const y =
        yPct * h;


      // ----------------------------------------
      // ขนาดตัวอักษร
      // ----------------------------------------

      const fontSize =
        Number(field.fontSize) || 32;


      // ----------------------------------------
      // น้ำหนักตัวอักษร
      // ----------------------------------------

      const fontWeight =
        Number(field.fontWeight) || 600;


      // ----------------------------------------
      // ฟอนต์
      // ----------------------------------------

      const fontFamily =
        field.fontFamily ||
        'Sarabun';


      // ----------------------------------------
      // สี
      // ----------------------------------------

      const color =
        field.color ||
        '#16264a';


      // ----------------------------------------
      // การจัดข้อความ
      // ----------------------------------------

      const align =
        field.align ||
        'center';


      // ========================================
      // ตั้งค่าการวาด
      // ========================================

      ctx.save();


      ctx.font =
        `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;

      ctx.fillStyle =
        color;

      ctx.textAlign =
        align;

      /*
       * ใช้ middle เหมือนตัว editor
       * ทำให้จุด x/y เป็นจุดกึ่งกลางของข้อความ
       */
      ctx.textBaseline =
        'middle';


      // ========================================
      // วาดข้อความ
      // ========================================

      ctx.fillText(
        text,
        x,
        y
      );


      ctx.restore();

    }
  );

}


/**
 * ============================================
 * ทำให้ Canvas แสดงผลแบบ Responsive
 * ============================================
 *
 * สำคัญ:
 * ห้ามเปลี่ยน canvas.width / canvas.height
 * ตามขนาดหน้าจอ
 *
 * ให้ CSS เป็นตัวปรับขนาดการแสดงผลแทน
 */
function setupResponsiveCanvas(canvas) {

  if (!canvas) {
    return;
  }

  canvas.style.display =
    'block';

  canvas.style.width =
    '100%';

  canvas.style.height =
    'auto';

  canvas.style.maxWidth =
    '100%';

}


/**
 * ============================================
 * วาดแล้วตั้ง Responsive อัตโนมัติ
 * ============================================
 */
async function drawCertificateResponsive(
  canvas,
  img,
  fields,
  student
) {

  await drawCertificate(
    canvas,
    img,
    fields,
    student
  );

  setupResponsiveCanvas(
    canvas
  );

}
