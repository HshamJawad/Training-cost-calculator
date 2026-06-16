/* ============================================================
   حاسبة التكاليف التدريبية — app.js  v1.1
   ============================================================ */
'use strict';

let items = [];
let deferredInstallPrompt = null;
const $ = id => document.getElementById(id);

/* ─── Helpers ─────────────────────────────────────────────── */
function fmt(n) { return Number(n).toLocaleString('ar-IQ'); }

function showToast(msg, type = 'info', ms = 2600) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, ms);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function save() {
  try { localStorage.setItem('tc_items', JSON.stringify(items)); } catch (_) {}
}

function load() {
  try {
    const r = localStorage.getItem('tc_items');
    if (r) { const p = JSON.parse(r); if (Array.isArray(p)) return p; }
  } catch (_) {}
  return [];
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Core ─────────────────────────────────────────────────── */
function addItem() {
  const nameEl  = $('itemName');
  const priceEl = $('itemPrice');
  const qtyEl   = $('itemQty');
  const unitEl  = $('itemUnit');

  const name  = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  const qty   = Math.max(1, parseInt(qtyEl.value) || 1);
  const unit  = unitEl.value;

  if (!name)              { showToast('⚠️ أدخل اسم المادة', 'error'); nameEl.focus(); return; }
  if (isNaN(price)||price<0){ showToast('⚠️ أدخل سعراً صحيحاً', 'error'); priceEl.focus(); return; }

  items.push({ id: uid(), name, price, qty, unit, total: price * qty, at: new Date().toISOString() });
  save();
  render();

  nameEl.value  = '';
  priceEl.value = '';
  qtyEl.value   = '1';
  nameEl.focus();
  showToast('✅ أُضيفت: ' + name, 'success');
}

function deleteItem(id) {
  const i = items.findIndex(x => x.id === id);
  if (i < 0) return;
  const nm = items[i].name;
  items.splice(i, 1);
  save();
  render();
  showToast('🗑️ حُذفت: ' + nm);
}

function clearAll() {
  if (!items.length) return;
  if (!confirm('هل تريد حذف جميع المواد؟')) return;
  items = []; save(); render();
  showToast('تم مسح القائمة', 'info');
}

/* ─── Render ───────────────────────────────────────────────── */
function render() {
  const listEl     = $('itemsList');
  const emptyEl    = $('emptyState');
  const countEl    = $('itemCount');
  const clearBtn   = $('clearBtn');
  const totalItems = $('totalItems');
  const totalQty   = $('totalQty');
  const grandTotal = $('grandTotal');

  listEl.innerHTML = '';

  if (!items.length) {
    emptyEl.style.display  = 'block';
    clearBtn.style.display = 'none';
    countEl.textContent    = '0';
    totalItems.textContent = '0';
    totalQty.textContent   = '0';
    grandTotal.textContent = '0';
    return;
  }

  emptyEl.style.display  = 'none';
  clearBtn.style.display = 'inline-flex';
  countEl.textContent    = items.length;

  let sumTotal = 0, sumQty = 0;

  items.forEach((item, idx) => {
    sumTotal += item.total;
    sumQty   += item.qty;

    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-num">${idx + 1}</div>
      <div class="item-body">
        <div class="item-name" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
        <div class="item-meta">
          <span class="tag">${item.qty} ${escHtml(item.unit)}</span>
          <span class="tag">${fmt(item.price)} د.ع/وحدة</span>
        </div>
      </div>
      <div class="item-right">
        <button class="btn-delete" onclick="deleteItem('${item.id}')" aria-label="حذف">✕</button>
        <div>
          <div class="item-price">${fmt(item.total)}</div>
          <div class="item-price-sub">دينار عراقي</div>
        </div>
      </div>`;
    listEl.appendChild(card);
  });

  totalItems.textContent = items.length;
  totalQty.textContent   = fmt(sumQty);
  grandTotal.textContent = fmt(sumTotal);
}

/* ─── JSON Save / Import ───────────────────────────────────── */
function saveJSON() {
  if (!items.length) { showToast('لا توجد بيانات للحفظ', 'error'); return; }
  const data = {
    appName: 'حاسبة التكاليف التدريبية', version: '1.1',
    savedAt: new Date().toLocaleString('ar-IQ'),
    totalItems: items.length,
    grandTotal: items.reduce((s,i) => s + i.total, 0),
    items
  };
  dlBlob(JSON.stringify(data, null, 2), 'application/json',
    `تكاليف_${today()}.json`);
  showToast('💾 تم الحفظ بنجاح', 'success');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let imported = Array.isArray(data) ? data : (data.items || []);
      imported = imported
        .filter(i => i.name && i.price !== undefined)
        .map(i => ({
          id: i.id || uid(),
          name: String(i.name),
          price: parseFloat(i.price) || 0,
          qty: parseInt(i.qty) || 1,
          unit: i.unit || 'قطعة',
          total: parseFloat(i.total) || (parseFloat(i.price) * (parseInt(i.qty) || 1)),
          at: i.at || new Date().toISOString()
        }));
      if (!imported.length) { showToast('⚠️ لا توجد بيانات صالحة', 'error'); return; }

      const merge = items.length > 0 &&
        confirm(`لديك ${items.length} مادة. دمج مع الملف الجديد؟\n(إلغاء = استبدال)`);
      items = merge ? [...items, ...imported] : imported;
      save(); render();
      showToast(`✅ استُورد ${imported.length} مادة`, 'success');
    } catch (err) { showToast('❌ خطأ في الملف: ' + err.message, 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ─── CSV Export (Excel-compatible, no libraries) ─────────── */
function exportCSV() {
  if (!items.length) { showToast('لا توجد بيانات للتصدير', 'error'); return; }

  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  const date = new Date().toLocaleDateString('ar-IQ');

  // Build CSV rows — wrap each field in quotes to handle commas & Arabic
  const q = s => `"${String(s).replace(/"/g, '""')}"`;

  const rows = [
    // Header info rows
    [q('حاسبة التكاليف التدريبية'), q(date), '', '', ''],
    ['', '', '', '', ''],
    // Column headers
    [q('#'), q('اسم المادة'), q('سعر الوحدة (دينار)'), q('الكمية'), q('الوحدة'), q('الإجمالي (دينار)')],
    // Data rows
    ...items.map((item, idx) => [
      q(idx + 1),
      q(item.name),
      q(item.price),
      q(item.qty),
      q(item.unit),
      q(item.total)
    ]),
    // Empty row + total
    ['', '', '', '', '', ''],
    [q('المجموع الكلي'), '', '', q(items.reduce((s,i) => s+i.qty, 0)), '', q(grandTotal)]
  ];

  const csvContent = rows.map(r => r.join(',')).join('\r\n');

  // UTF-8 BOM ensures Arabic shows correctly in Excel on all platforms
  const BOM = '\uFEFF';
  dlBlob(BOM + csvContent, 'text/csv;charset=utf-8', `تكاليف_${today()}.csv`);
  showToast('📊 تم تصدير ملف CSV بنجاح', 'success');
}

/* ─── Print ────────────────────────────────────────────────── */
function printList() {
  if (!items.length) { showToast('لا توجد بيانات للطباعة', 'error'); return; }
  const date = new Date().toLocaleDateString('ar-IQ');
  const grand = items.reduce((s,i) => s + i.total, 0);

  const rows = items.map((it, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escHtml(it.name)}</td>
      <td>${it.qty} ${escHtml(it.unit)}</td>
      <td>${it.price.toLocaleString()}</td>
      <td><strong>${it.total.toLocaleString()}</strong></td>
    </tr>`).join('');

  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><title>قائمة التكاليف</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"/>
<style>
body{font-family:'Cairo',Arial,sans-serif;direction:rtl;padding:28px;color:#000;font-size:13px}
h1{color:#1C3557;font-size:18px;margin-bottom:2px}
.sub{color:#666;font-size:12px;margin-bottom:18px}
table{width:100%;border-collapse:collapse}
th{background:#1C3557;color:white;padding:7px 9px;font-size:12px}
td{border:1px solid #ddd;padding:6px 9px}
tr:nth-child(even) td{background:#f5f7fa}
.foot td{background:#E36F1E;color:white;font-weight:700;font-size:13px}
button{margin-top:14px;background:#1C3557;color:white;padding:8px 20px;border:none;
  border-radius:7px;font-size:13px;cursor:pointer;font-family:Cairo,Arial}
@media print{button{display:none}}
</style></head><body>
<h1>📋 قائمة التكاليف التدريبية</h1>
<p class="sub">تاريخ الطباعة: ${date} — عدد المواد: ${items.length}</p>
<table>
<thead><tr><th>#</th><th>اسم المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="foot"><td colspan="4">المجموع الكلي</td><td>${grand.toLocaleString()} د.ع</td></tr></tfoot>
</table>
<button onclick="window.print()">🖨️ طباعة</button>
</body></html>`);
  w.document.close();
}

/* ─── Utilities ────────────────────────────────────────────── */
function today() { return new Date().toISOString().slice(0, 10); }

function dlBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Install Logic ────────────────────────────────────────── */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
}

function handleInstall() {
  if (deferredInstallPrompt) {
    // Android / Chrome: native prompt available
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') {
        showToast('🎉 تم تثبيت التطبيق!', 'success');
        hideTip();
      }
      deferredInstallPrompt = null;
    });
  } else if (isIOS()) {
    // iOS: show manual instructions
    $('iosModal').style.display = 'flex';
  } else {
    // Other browsers: generic message
    showToast('💡 افتح القائمة ← "إضافة إلى الشاشة الرئيسية"', 'info', 4000);
  }
}

function closeIosModal() { $('iosModal').style.display = 'none'; }

function showTip() {
  if (isStandalone()) return;   // already installed
  const tip = $('installTip');
  tip.style.display = 'block';
  const msg = $('installTipMsg');
  if (deferredInstallPrompt) {
    msg.textContent = 'اضغط "تثبيت" لإضافة التطبيق على جهازك';
  } else if (isIOS()) {
    msg.textContent = 'اضغط لرؤية خطوات التثبيت على iPhone / iPad';
  } else {
    msg.textContent = 'يمكنك تثبيت التطبيق للعمل بدون إنترنت';
  }
}

function closeTip() { $('installTip').style.display = 'none'; }
function hideTip()  { $('installTip').style.display = 'none'; }

/* ─── Offline badge ────────────────────────────────────────── */
function updateOnline() {
  $('offlineBadge').classList.toggle('visible', !navigator.onLine);
}

/* ─── Service Worker ───────────────────────────────────────── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(r => console.log('SW:', r.scope))
      .catch(e => console.warn('SW failed:', e));
  }
}

/* ─── Enter key ────────────────────────────────────────────── */
function setupEnter() {
  ['itemName','itemPrice','itemQty'].forEach(id => {
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
  });
}

/* ─── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  items = load();
  render();
  setupEnter();
  updateOnline();
  registerSW();

  window.addEventListener('online',  updateOnline);
  window.addEventListener('offline', updateOnline);

  // Capture Chrome/Android install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showTip();
  });

  window.addEventListener('appinstalled', () => {
    hideTip();
    deferredInstallPrompt = null;
  });

  // Show install tip after 3 sec for iOS users too
  if (!isStandalone()) {
    setTimeout(showTip, 3000);
  }

  setTimeout(() => $('itemName').focus(), 200);
});
