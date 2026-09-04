// ============================================
// STATE
// ============================================
const state = {
  templates: [],
  students: [],
  currentTemplate: null,   // {id, name, background_url, fields:[]}
  selectedFieldId: null,
  editingStudentId: null,
};

const FIELD_KEY_LABELS = {
  name: 'ชื่อ-นามสกุล',
  student_code: 'รหัสนักเรียน',
};

// ============================================
// AUTH
// ============================================
const loginScreen = document.getElementById('loginScreen');
const appEl = document.getElementById('app');

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showApp(session);
  } else {
    loginScreen.style.display = 'flex';
    appEl.style.display = 'none';
  }
}

function showApp(session) {
  loginScreen.style.display = 'none';
  appEl.style.display = 'flex';
  document.getElementById('whoami').textContent = session.user.email;
  loadTemplates();
  loadStudents();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const msg = document.getElementById('loginMsg');
  msg.innerHTML = '';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลังเข้าสู่ระบบ';
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showApp(data.session);
  } catch (err) {
    msg.innerHTML = `<div class="msg msg-error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'เข้าสู่ระบบ';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  checkSession();
});

checkSession();

// ============================================
// TABS
// ============================================
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

function goToTemplatesTab() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector('.tabs button[data-tab="templates"]').classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-templates').classList.add('active');
}

// ============================================
// TEMPLATES: LOAD + LIST
// ============================================
async function loadTemplates() {
  const { data, error } = await supabaseClient.from('templates').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  state.templates = data || [];
  renderTemplateGrid();
  populateTemplateSelects();
}

function renderTemplateGrid() {
  const grid = document.getElementById('tplGrid');
  const empty = document.getElementById('tplEmpty');
  grid.innerHTML = '';
  if (state.templates.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  state.templates.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'tpl-card';
    card.innerHTML = `
      <img src="${tpl.background_url}" alt="${escapeHtml(tpl.name)}">
      <div class="tpl-info">
        <h3>${escapeHtml(tpl.name)}</h3>
        <p>${(tpl.fields || []).length} ช่องข้อความ</p>
      </div>
    `;
    card.addEventListener('click', () => openEditor(tpl));
    grid.appendChild(card);
  });
}

function populateTemplateSelects() {
  const filterSel = document.getElementById('filterTemplate');
  const studentSel = document.getElementById('studentTemplate');
  const prevFilter = filterSel.value;
  filterSel.innerHTML = '<option value="">— ทุกเทมเพลต —</option>';
  studentSel.innerHTML = '';
  state.templates.forEach(tpl => {
    filterSel.innerHTML += `<option value="${tpl.id}">${escapeHtml(tpl.name)}</option>`;
    studentSel.innerHTML += `<option value="${tpl.id}">${escapeHtml(tpl.name)}</option>`;
  });
  filterSel.value = prevFilter;
}

document.getElementById('newTplBtn').addEventListener('click', () => openEditor(null));
document.getElementById('backToTplBtn').addEventListener('click', () => {
  document.getElementById('panel-editor').classList.remove('active');
  goToTemplatesTab();
});

// ============================================
// TEMPLATE EDITOR
// ============================================
function openEditor(tpl) {
  state.currentTemplate = tpl
    ? { id: tpl.id, name: tpl.name, background_url: tpl.background_url, fields: JSON.parse(JSON.stringify(tpl.fields || [])) }
    : { id: null, name: '', background_url: '', fields: [] };
  state.selectedFieldId = null;

  document.getElementById('tplName').value = state.currentTemplate.name;
  const img = document.getElementById('bgImage');
  const holder = document.getElementById('canvasHolder');
  const drop = document.getElementById('uploadDrop');
  const footer = document.getElementById('canvasFooter');
  document.getElementById('uploadDropText').textContent = 'อัปโหลดรูปพื้นหลังเกียรติบัตร (JPG / PNG)';

  if (state.currentTemplate.background_url) {
    img.src = state.currentTemplate.background_url;
    holder.classList.remove('hidden');
    footer.classList.remove('hidden');
    drop.classList.add('hidden');
  } else {
    img.src = '';
    holder.classList.add('hidden');
    footer.classList.add('hidden');
    drop.classList.remove('hidden');
  }

  renderFieldMarkers();
  renderFieldList();
  renderFieldDetail();

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-editor').classList.add('active');
}

document.getElementById('bgImage').addEventListener('load', renderPreview);

document.getElementById('togglePreview').addEventListener('change', renderPreview);

// --- upload background ---
document.getElementById('chooseBgBtn').addEventListener('click', () => {
  document.getElementById('bgFileInput').click();
});
document.getElementById('changeBgBtn').addEventListener('click', () => {
  document.getElementById('bgFileInput').click();
});

document.getElementById('bgFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const chooseBtn = document.getElementById('chooseBgBtn');
  const changeBtn = document.getElementById('changeBgBtn');
  const activeBtn = chooseBtn.classList.contains('hidden') ? changeBtn : chooseBtn;
  const originalLabel = activeBtn.textContent;
  activeBtn.disabled = true;
  activeBtn.innerHTML = '<span class="spinner"></span> กำลังอัปโหลด...';

  try {
    const ext = file.name.split('.').pop();
    const path = `templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabaseClient.storage.from('certificates').upload(path, file);
    if (upErr) throw upErr;
    const { data } = supabaseClient.storage.from('certificates').getPublicUrl(path);
    state.currentTemplate.background_url = data.publicUrl;

    document.getElementById('bgImage').src = data.publicUrl;
    document.getElementById('canvasHolder').classList.remove('hidden');
    document.getElementById('canvasFooter').classList.remove('hidden');
    document.getElementById('uploadDrop').classList.add('hidden');
    renderFieldMarkers();
  } catch (err) {
    console.error(err);
    alert('อัปโหลดรูปไม่สำเร็จ:\n' + (err.message || err));
  } finally {
    activeBtn.disabled = false;
    activeBtn.textContent = originalLabel;
    e.target.value = '';
  }
});

// --- click image to add field ---
document.getElementById('canvasHolder').addEventListener('click', (e) => {
  if (e.target.closest('.field-marker')) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const xPct = (e.clientX - rect.left) / rect.width;
  const yPct = (e.clientY - rect.top) / rect.height;
  addField(xPct, yPct);
});

document.getElementById('addFieldBtn').addEventListener('click', () => addField(0.5, 0.5));

function addField(xPct, yPct) {
  const field = {
    id: crypto.randomUUID(),
    key: 'name',
    label: 'ชื่อ-นามสกุล',
    xPct, yPct,
    fontSize: 36,
    color: '#16264a',
    align: 'center',
    fontWeight: 600,
    fontFamily: 'Sarabun',
  };
  state.currentTemplate.fields.push(field);
  state.selectedFieldId = field.id;
  renderFieldMarkers();
  renderFieldList();
  renderFieldDetail();
}

function renderFieldMarkers() {
  const holder = document.getElementById('canvasHolder');
  holder.querySelectorAll('.field-marker').forEach(m => m.remove());
  state.currentTemplate.fields.forEach(field => {
    const marker = document.createElement('div');
    marker.className = 'field-marker' + (field.id === state.selectedFieldId ? ' selected' : '');
    marker.style.left = (field.xPct * 100) + '%';
    marker.style.top = (field.yPct * 100) + '%';
    marker.innerHTML = `<span class="tag">${escapeHtml(field.label || field.key)}</span>`;
    marker.dataset.fieldId = field.id;
    marker.addEventListener('click', (ev) => {
      ev.stopPropagation();
      state.selectedFieldId = field.id;
      renderFieldMarkers();
      renderFieldList();
      renderFieldDetail();
    });
    enableDrag(marker, holder, field);
    holder.appendChild(marker);
  });
  renderPreview();
}

// --- พรีวิวข้อความจริงบน canvas (ใช้เอนจิน render เดียวกับที่นักเรียนจะเห็นจริงบนอุปกรณ์นี้) ---
async function renderPreview() {
  const checkbox = document.getElementById('togglePreview');
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  if (!checkbox || !checkbox.checked) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const img = document.getElementById('bgImage');
  if (!img.src || !img.naturalWidth) return;
  try {
    await drawCertificate(canvas, img, state.currentTemplate.fields, null);
  } catch (e) {
    console.error(e);
  }
}

function enableDrag(marker, holder, field) {
  marker.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    marker.setPointerCapture(ev.pointerId);
    const move = (moveEv) => {
      const rect = holder.getBoundingClientRect();
      let xPct = (moveEv.clientX - rect.left) / rect.width;
      let yPct = (moveEv.clientY - rect.top) / rect.height;
      xPct = Math.min(1, Math.max(0, xPct));
      yPct = Math.min(1, Math.max(0, yPct));
      field.xPct = xPct;
      field.yPct = yPct;
      marker.style.left = (xPct * 100) + '%';
      marker.style.top = (yPct * 100) + '%';
    };
    const up = () => {
      marker.removeEventListener('pointermove', move);
      marker.removeEventListener('pointerup', up);
      renderPreview();
    };
    marker.addEventListener('pointermove', move);
    marker.addEventListener('pointerup', up);
  });
}

function renderFieldList() {
  const list = document.getElementById('fieldList');
  list.innerHTML = '';
  state.currentTemplate.fields.forEach(field => {
    const item = document.createElement('div');
    item.className = 'field-item' + (field.id === state.selectedFieldId ? ' selected' : '');
    item.innerHTML = `
      <div>${escapeHtml(field.label || field.key)}<small>${escapeHtml(FIELD_KEY_LABELS[field.key] || field.key)}</small></div>
      <button type="button" class="del" title="ลบ">&times;</button>
    `;
    item.addEventListener('click', () => {
      state.selectedFieldId = field.id;
      renderFieldMarkers();
      renderFieldList();
      renderFieldDetail();
    });
    item.querySelector('.del').addEventListener('click', (ev) => {
      ev.stopPropagation();
      state.currentTemplate.fields = state.currentTemplate.fields.filter(f => f.id !== field.id);
      if (state.selectedFieldId === field.id) state.selectedFieldId = null;
      renderFieldMarkers();
      renderFieldList();
      renderFieldDetail();
    });
    list.appendChild(item);
  });
}

function renderFieldDetail() {
  const wrap = document.getElementById('fieldDetail');
  const field = state.currentTemplate.fields.find(f => f.id === state.selectedFieldId);
  if (!field) { wrap.innerHTML = ''; return; }

  const isCustom = field.key !== 'name' && field.key !== 'student_code';

  wrap.innerHTML = `
    <div class="field-detail">
      <div class="field">
        <label>ประเภทข้อมูล</label>
        <select id="fd_keyType">
          <option value="name">ชื่อ-นามสกุล</option>
          <option value="student_code">รหัสนักเรียน</option>
          <option value="custom">กำหนดเอง</option>
        </select>
      </div>
      <div class="field ${isCustom ? '' : 'hidden'}" id="fd_customKeyWrap">
        <label>ชื่อฟิลด์ (ภาษาอังกฤษ ไม่เว้นวรรค)</label>
        <input type="text" id="fd_customKey" value="${isCustom ? escapeAttr(field.key) : ''}" placeholder="เช่น course, date">
      </div>
      <div class="field">
        <label>ป้ายชื่อ (แสดงในรายการ)</label>
        <input type="text" id="fd_label" value="${escapeAttr(field.label || '')}">
      </div>
      <div class="row2">
        <div class="field">
          <label>ขนาดตัวอักษร</label>
          <input type="number" id="fd_fontSize" value="${field.fontSize}" min="8" max="200">
        </div>
        <div class="field">
          <label>สี</label>
          <input type="color" id="fd_color" value="${field.color}">
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label>การจัดวาง</label>
          <select id="fd_align">
            <option value="left">ชิดซ้าย</option>
            <option value="center">กึ่งกลาง</option>
            <option value="right">ชิดขวา</option>
          </select>
        </div>
        <div class="field">
          <label>น้ำหนักตัวอักษร</label>
          <select id="fd_weight">
            <option value="400">ปกติ</option>
            <option value="600">หนา</option>
            <option value="700">หนามาก</option>
          </select>
        </div>
      </div>
    </div>
  `;

  document.getElementById('fd_keyType').value = isCustom ? 'custom' : field.key;
  document.getElementById('fd_align').value = field.align;
  document.getElementById('fd_weight').value = String(field.fontWeight);

  const sync = () => {
    const keyType = document.getElementById('fd_keyType').value;
    if (keyType === 'custom') {
      field.key = document.getElementById('fd_customKey').value.trim() || 'field';
    } else {
      field.key = keyType;
    }
    field.label = document.getElementById('fd_label').value.trim() || FIELD_KEY_LABELS[field.key] || field.key;
    field.fontSize = parseInt(document.getElementById('fd_fontSize').value, 10) || 32;
    field.color = document.getElementById('fd_color').value;
    field.align = document.getElementById('fd_align').value;
    field.fontWeight = parseInt(document.getElementById('fd_weight').value, 10);
    renderFieldMarkers();
    renderFieldList();
  };

  document.getElementById('fd_keyType').addEventListener('change', () => {
    document.getElementById('fd_customKeyWrap').classList.toggle('hidden', document.getElementById('fd_keyType').value !== 'custom');
    sync();
  });
  ['fd_customKey','fd_label','fd_fontSize','fd_color','fd_align','fd_weight'].forEach(id => {
    document.getElementById(id).addEventListener('input', sync);
  });
}

// --- save template ---
document.getElementById('saveTplBtn').addEventListener('click', async () => {
  const name = document.getElementById('tplName').value.trim();
  if (!name) { alert('กรุณาตั้งชื่อเทมเพลต'); return; }
  if (!state.currentTemplate.background_url) { alert('กรุณาอัปโหลดรูปพื้นหลังก่อน'); return; }

  const btn = document.getElementById('saveTplBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลังบันทึก';

  const payload = {
    name,
    background_url: state.currentTemplate.background_url,
    fields: state.currentTemplate.fields,
  };

  try {
    if (state.currentTemplate.id) {
      const { error } = await supabaseClient.from('templates').update(payload).eq('id', state.currentTemplate.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('templates').insert(payload);
      if (error) throw error;
    }
    await loadTemplates();
    document.getElementById('panel-editor').classList.remove('active');
    goToTemplatesTab();
  } catch (err) {
    console.error(err);
    alert('บันทึกไม่สำเร็จ: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'บันทึกเทมเพลต';
  }
});

// ============================================
// STUDENTS
// ============================================
async function loadStudents() {
  const { data, error } = await supabaseClient.from('students').select('*, templates(name)').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  state.students = data || [];
  renderStudentsTable();
}

function renderStudentsTable() {
  const tbody = document.getElementById('studentsTbody');
  const empty = document.getElementById('studentsEmpty');
  const filterTpl = document.getElementById('filterTemplate').value;
  const search = document.getElementById('studentSearch').value.trim().toLowerCase();

  let rows = state.students;
  if (filterTpl) rows = rows.filter(s => s.template_id === filterTpl);
  if (search) rows = rows.filter(s => s.student_code.toLowerCase().includes(search) || s.name.toLowerCase().includes(search));

  tbody.innerHTML = '';
  if (rows.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
  }

  rows.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(s.student_code)}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.templates ? s.templates.name : '—')}</td>
      <td style="white-space:nowrap;">
        <button class="btn-secondary editBtn" style="padding:5px 12px;font-size:13px;">แก้ไข</button>
        <button class="btn-danger delBtn">ลบ</button>
      </td>
    `;
    tr.querySelector('.editBtn').addEventListener('click', () => openStudentModal(s));
    tr.querySelector('.delBtn').addEventListener('click', () => deleteStudent(s));
    tbody.appendChild(tr);
  });
}

document.getElementById('filterTemplate').addEventListener('change', renderStudentsTable);
document.getElementById('studentSearch').addEventListener('input', renderStudentsTable);

async function deleteStudent(s) {
  if (!confirm(`ลบข้อมูลของ "${s.name}" (${s.student_code}) ใช่หรือไม่?`)) return;
  const { error } = await supabaseClient.from('students').delete().eq('id', s.id);
  if (error) { alert('ลบไม่สำเร็จ: ' + error.message); return; }
  await loadStudents();
}

// --- ลบทั้งหมด (ตามรายการที่กรอง/ค้นหาอยู่บนหน้าจอ) ---
document.getElementById('deleteAllBtn').addEventListener('click', async () => {
  const filterTpl = document.getElementById('filterTemplate').value;
  const search = document.getElementById('studentSearch').value.trim().toLowerCase();

  let rows = state.students;
  if (filterTpl) rows = rows.filter(s => s.template_id === filterTpl);
  if (search) rows = rows.filter(s => s.student_code.toLowerCase().includes(search) || s.name.toLowerCase().includes(search));

  if (rows.length === 0) { alert('ไม่มีรายชื่อให้ลบ'); return; }

  const scopeText = (filterTpl || search) ? `ตามที่กรองอยู่ตอนนี้` : `ทั้งหมดในระบบ`;
  if (!confirm(`ยืนยันลบนักเรียน ${rows.length} คน (${scopeText})?\n\nการลบนี้ไม่สามารถย้อนกลับได้`)) return;

  const btn = document.getElementById('deleteAllBtn');
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> กำลังลบ';

  try {
    const ids = rows.map(r => r.id);
    const { error } = await supabaseClient.from('students').delete().in('id', ids);
    if (error) throw error;
    await loadStudents();
  } catch (err) {
    alert('ลบไม่สำเร็จ: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

// --- add/edit student modal ---
const studentModal = document.getElementById('studentModal');

document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal(null));
document.getElementById('studentCancelBtn').addEventListener('click', () => studentModal.classList.remove('active'));

function openStudentModal(student) {
  state.editingStudentId = student ? student.id : null;
  document.getElementById('studentModalTitle').textContent = student ? 'แก้ไขนักเรียน' : 'เพิ่มนักเรียน';
  document.getElementById('studentCode').value = student ? student.student_code : '';
  document.getElementById('studentName').value = student ? student.name : '';
  document.getElementById('studentModalMsg').innerHTML = '';

  const tplSel = document.getElementById('studentTemplate');
  tplSel.value = student ? student.template_id : (state.templates[0] ? state.templates[0].id : '');

  renderExtraFields(student ? student.extra || {} : {});
  tplSel.onchange = () => renderExtraFields(student && student.template_id === tplSel.value ? (student.extra || {}) : {});

  studentModal.classList.add('active');
}

function renderExtraFields(existingExtra) {
  const tplSel = document.getElementById('studentTemplate');
  const tpl = state.templates.find(t => t.id === tplSel.value);
  const wrap = document.getElementById('extraFieldsList');
  wrap.innerHTML = '';
  if (!tpl) return;
  const customFields = (tpl.fields || []).filter(f => f.key !== 'name' && f.key !== 'student_code');
  if (customFields.length === 0) {
    wrap.innerHTML = `<p style="font-size:13px;color:var(--ink-soft);">เทมเพลตนี้ไม่มีข้อมูลเพิ่มเติม</p>`;
    return;
  }
  customFields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'field';
    row.innerHTML = `
      <label>${escapeHtml(f.label || f.key)}</label>
      <input type="text" data-extra-key="${escapeAttr(f.key)}" value="${escapeAttr(existingExtra[f.key] || '')}">
    `;
    wrap.appendChild(row);
  });
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('studentSaveBtn');
  const msg = document.getElementById('studentModalMsg');
  msg.innerHTML = '';

  const student_code = document.getElementById('studentCode').value.trim();
  const name = document.getElementById('studentName').value.trim();
  const template_id = document.getElementById('studentTemplate').value;
  if (!template_id) { msg.innerHTML = `<div class="msg msg-error">กรุณาสร้างเทมเพลตก่อน</div>`; return; }

  const extra = {};
  document.querySelectorAll('#extraFieldsList [data-extra-key]').forEach(inp => {
    extra[inp.dataset.extraKey] = inp.value.trim();
  });

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลังบันทึก';

  try {
    if (state.editingStudentId) {
      const { error } = await supabaseClient.from('students')
        .update({ student_code, name, template_id, extra })
        .eq('id', state.editingStudentId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('students')
        .insert({ student_code, name, template_id, extra });
      if (error) throw error;
    }
    studentModal.classList.remove('active');
    await loadStudents();
  } catch (err) {
    msg.innerHTML = `<div class="msg msg-error">บันทึกไม่สำเร็จ: ${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'บันทึก';
  }
});

// --- CSV import ---
document.getElementById('importCsvBtn').addEventListener('click', () => {
  const tplId = document.getElementById('filterTemplate').value;
  if (!tplId) { alert('กรุณาเลือกเทมเพลตในตัวกรองด้านบนก่อนนำเข้า CSV\n(คอลัมน์ที่ต้องมี: student_code, name และคอลัมน์อื่นๆ ตามฟิลด์เพิ่มเติมของเทมเพลต)'); return; }
  document.getElementById('csvFileInput').click();
});

document.getElementById('csvFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const tplId = document.getElementById('filterTemplate').value;
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) { alert('ไฟล์ CSV ไม่มีข้อมูล'); return; }

  const headers = rows[0].map(h => h.trim());
  const codeIdx = headers.indexOf('student_code');
  const nameIdx = headers.indexOf('name');
  if (codeIdx === -1 || nameIdx === -1) {
    alert('ไฟล์ CSV ต้องมีคอลัมน์ student_code และ name');
    return;
  }

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => c.trim() === '')) continue;
    const extra = {};
    headers.forEach((h, idx) => {
      if (h !== 'student_code' && h !== 'name') extra[h] = (row[idx] || '').trim();
    });
    records.push({
      student_code: (row[codeIdx] || '').trim(),
      name: (row[nameIdx] || '').trim(),
      template_id: tplId,
      extra,
    });
  }

  if (records.length === 0) { alert('ไม่พบข้อมูลนักเรียนในไฟล์'); return; }
  if (!confirm(`นำเข้าข้อมูลนักเรียน ${records.length} คน ใช่หรือไม่?`)) { e.target.value=''; return; }

  const { error } = await supabaseClient.from('students').insert(records);
  e.target.value = '';
  if (error) { alert('นำเข้าไม่สำเร็จ: ' + error.message); return; }
  alert(`นำเข้าสำเร็จ ${records.length} คน`);
  await loadStudents();
});

function parseCsv(text) {
  return text.split(/\r?\n/).map(line => line.split(',').map(c => c.trim()));
}

// ============================================
// UTIL
// ============================================
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
