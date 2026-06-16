/* ============================================================
   حاسبة التكاليف التدريبية — app.js
   Training Cost Calculator — Main Application Logic
   ============================================================ */

'use strict';

// ────────────────────────────────
// State
// ────────────────────────────────
let items = [];
let deferredInstallPrompt = null;

// ────────────────────────────────
// Helpers
// ────────────────────────────────
const $ = id => document.getElementById(id);

function formatNumber(n) {
  return Number(n).toLocaleString('ar-IQ');
}

function showToast(msg, type = 'info', duration = 2800) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, duration);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function saveToLocalStorage() {
  try {
    localStorage.setItem('training_cost_items', JSON.stringify(items));
  } catch (e) { /* quota exceeded or private mode */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('training_cost_items');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* ignore */ }
  return [];
}

// ────────────────────────────────
// Core Functions
// ────────────────────────────────
function addItem() {
  const nameEl  = $('itemName');
  const priceEl = $('itemPrice');
  const qtyEl   = $('itemQty');
  const unitEl  = $('itemUnit');

  const name  = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  const qty   = parseInt(qtyEl.value) || 1;
  const unit  = unitEl.value;

  if (!name) {
    showToast('⚠️ يرجى إدخال اسم المادة', 'error');
    nameEl.focus();
    return;
  }
  if (isNaN(price) || price < 0) {
    showToast('⚠️ يرجى إدخال سعر صحيح', 'error');
    priceEl.focus();
    return;
  }

  const item = {
    id: generateId(),
    name,
    price,
    qty,
    unit,
    total: price * qty,
    addedAt: new Date().toISOString()
  };

  items.push(item);
  saveToLocalStorage();
  renderItems();

  // Reset fields
  nameEl.value  = '';
  priceEl.value = '';
  qtyEl.value   = '1';
  nameEl.focus();

  showToast('✅ تمت الإضافة: ' + name, 'success');
}

function deleteItem(id) {
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;
  const name = items[idx].name;
  items.splice(idx, 1);
  saveToLocalStorage();
  renderItems();
  showToast('🗑️ تم حذف: ' + name);
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('هل تريد حذف جميع المواد؟ لا يمكن التراجع عن هذا الإجراء.')) return;
  items = [];
  saveToLocalStorage();
  renderItems();
  showToast('تم مسح القائمة', 'info');
}

// ────────────────────────────────
// Render
// ────────────────────────────────
function renderItems() {
  const listEl     = $('itemsList');
  const emptyEl    = $('emptyState');
  const countEl    = $('itemCount');
  const clearBtn   = $('clearBtn');
  const totalItems = $('totalItems');
  const totalQty   = $('totalQty');
  const grandTotal = $('grandTotal');

  // Clear
  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyEl.style.display = 'block';
    clearBtn.style.display = 'none';
    countEl.textContent = '0';
    totalItems.textContent = '0';
    totalQty.textContent = '0';
    grandTotal.textContent = '0';
    return;
  }

  emptyEl.style.display = 'none';
  clearBtn.style.display = 'inline-flex';
  countEl.textContent = items.length;

  let sumTotal = 0;
  let sumQty   = 0;

  items.forEach((item, index) => {
    sumTotal += item.total;
    sumQty   += item.qty;

    const card = document.createElement('div');
    card.className = 'item-card';
    card.id = 'item-' + item.id;

    card.innerHTML = `
      <div class="item-number">${index + 1}</div>
      <div class="item-body">
        <div class="item-name" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
        <div class="item-details">
          <span class="item-qty-unit">${item.qty} ${escHtml(item.unit)}</span>
          <span class="item-unit-price">سعر الوحدة: ${formatNumber(item.price)} د.ع</span>
        </div>
      </div>
      <div class="item-right">
        <button class="btn-delete" onclick="deleteItem('${item.id}')" title="حذف المادة" aria-label="حذف ${escHtml(item.name)}">✕</button>
        <div style="text-align:left">
          <div class="item-price">${formatNumber(item.total)}</div>
          <div class="item-price-sub">دينار عراقي</div>
        </div>
      </div>
    `;

    listEl.appendChild(card);
  });

  // Update summary
  totalItems.textContent = items.length;
  totalQty.textContent   = formatNumber(sumQty);
  grandTotal.textContent = formatNumber(sumTotal);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ────────────────────────────────
// JSON Save / Import
// ────────────────────────────────
function saveJSON() {
  if (items.length === 0) {
    showToast('لا توجد بيانات للحفظ', 'error');
    return;
  }

  const data = {
    appName: 'حاسبة التكاليف التدريبية',
    version: '1.0',
    savedAt: new Date().toLocaleString('ar-IQ'),
    totalItems: items.length,
    grandTotal: items.reduce((s, i) => s + i.total, 0),
    items: items
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `تكاليف_تدريبية_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('💾 تم حفظ الملف بنجاح', 'success');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      let imported = [];

      if (Array.isArray(data)) {
        imported = data;
      } else if (data.items && Array.isArray(data.items)) {
        imported = data.items;
      } else {
        throw new Error('تنسيق غير مدعوم');
      }

      // Validate each item
      imported = imported.filter(i => i.name && i.price !== undefined);
      // Ensure IDs and totals
      imported = imported.map(i => ({
        id: i.id || generateId(),
        name: String(i.name),
        price: parseFloat(i.price) || 0,
        qty: parseInt(i.qty) || 1,
        unit: i.unit || 'قطعة',
        total: parseFloat(i.total) || (parseFloat(i.price) * (parseInt(i.qty) || 1)),
        addedAt: i.addedAt || new Date().toISOString()
      }));

      if (imported.length === 0) {
        showToast('⚠️ الملف لا يحتوي على بيانات صالحة', 'error');
        return;
      }

      const merge = items.length > 0 &&
        confirm(`لديك ${items.length} مادة حالية. هل تريد الدمج مع الملف المستورد؟\nاختر "إلغاء" للاستبدال.`);

      if (merge) {
        items = [...items, ...imported];
      } else {
        items = imported;
      }

      saveToLocalStorage();
      renderItems();
      showToast(`✅ تم استيراد ${imported.length} مادة بنجاح`, 'success');
    } catch (err) {
      showToast('❌ خطأ في قراءة الملف: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ────────────────────────────────
// Excel Export (CSV → XLS trick)
// ────────────────────────────────
function exportExcel() {
  if (items.length === 0) {
    showToast('لا توجد بيانات للتصدير', 'error');
    return;
  }

  // Build HTML table that Excel can open
  const date = new Date().toLocaleDateString('ar-IQ');
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
    <x:ExcelWorksheet><x:Name>التكاليف التدريبية</x:Name>
    <x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body dir="rtl">
<table border="1" cellpadding="6" style="font-family:Arial;direction:rtl;border-collapse:collapse;">
  <tr style="background:#1C3557;color:white;font-weight:bold;">
    <td colspan="6" style="text-align:center;font-size:14px;">حاسبة التكاليف التدريبية — ${date}</td>
  </tr>
  <tr style="background:#E36F1E;color:white;font-weight:bold;">
    <td>#</td>
    <td>اسم المادة</td>
    <td>سعر الوحدة (دينار)</td>
    <td>الكمية</td>
    <td>الوحدة</td>
    <td>الإجمالي (دينار)</td>
  </tr>`;

  items.forEach((item, idx) => {
    html += `
  <tr style="background:${idx % 2 === 0 ? '#f9f9f9' : 'white'}">
    <td style="text-align:center">${idx + 1}</td>
    <td>${escHtml(item.name)}</td>
    <td style="text-align:left">${item.price.toLocaleString()}</td>
    <td style="text-align:center">${item.qty}</td>
    <td style="text-align:center">${escHtml(item.unit)}</td>
    <td style="text-align:left;font-weight:bold">${item.total.toLocaleString()}</td>
  </tr>`;
  });

  html += `
  <tr style="background:#1C3557;color:white;font-weight:bold;">
    <td colspan="3" style="text-align:center">المجموع الكلي</td>
    <td style="text-align:center">${items.reduce((s, i) => s + i.qty, 0)}</td>
    <td></td>
    <td style="text-align:left;font-size:13px">${grandTotal.toLocaleString()} دينار</td>
  </tr>
</table>
</body></html>`;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8'
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const d    = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `تكاليف_تدريبية_${d}.xls`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('📊 تم تصدير ملف Excel بنجاح', 'success');
}

// ────────────────────────────────
// Print
// ────────────────────────────────
function printList() {
  if (items.length === 0) {
    showToast('لا توجد بيانات للطباعة', 'error');
    return;
  }

  const date       = new Date().toLocaleDateString('ar-IQ');
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  let rows = items.map((item, idx) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${escHtml(item.name)}</td>
      <td style="text-align:center">${item.qty} ${escHtml(item.unit)}</td>
      <td style="text-align:left">${item.price.toLocaleString()} د.ع</td>
      <td style="text-align:left;font-weight:700">${item.total.toLocaleString()} د.ع</td>
    </tr>
  `).join('');

  const printWin = window.open('', '_blank', 'width=800,height=600');
  printWin.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>قائمة التكاليف التدريبية</title>
<style>
  body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 30px; color: #000; }
  h1 { color: #1C3557; font-size: 20px; margin-bottom: 4px; }
  .date { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1C3557; color: white; padding: 8px 10px; }
  td { border: 1px solid #ddd; padding: 7px 10px; }
  tr:nth-child(even) { background: #f5f5f5; }
  .total-row { background: #E36F1E !important; color: white; font-weight: 700; font-size: 15px; }
  .total-row td { border-color: #E36F1E; color: white; }
  @media print { button { display: none; } }
</style>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"/>
</head>
<body>
<h1>📋 قائمة التكاليف التدريبية</h1>
<p class="date">تاريخ الطباعة: ${date} — عدد المواد: ${items.length}</p>
<table>
  <thead>
    <tr>
      <th>#</th><th>اسم المادة</th><th>الكمية والوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="4" style="text-align:center">المجموع الكلي</td>
      <td style="text-align:left">${grandTotal.toLocaleString()} د.ع</td>
    </tr>
  </tfoot>
</table>
<br>
<button onclick="window.print()" style="background:#1C3557;color:white;padding:10px 24px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:Cairo,Arial">🖨️ طباعة</button>
</body>
</html>`);
  printWin.document.close();
}

// ────────────────────────────────
// Enter Key Support
// ────────────────────────────────
function setupEnterKey() {
  ['itemName', 'itemPrice', 'itemQty'].forEach(id => {
    $(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    });
  });
}

// ────────────────────────────────
// Offline Detection
// ────────────────────────────────
function updateOnlineStatus() {
  const badge = $('offlineBadge');
  if (!navigator.onLine) {
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

// ────────────────────────────────
// PWA Install
// ────────────────────────────────
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $('installBanner').style.display = 'block';
  });

  $('installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('🎉 تم تثبيت التطبيق بنجاح!', 'success');
      $('installBanner').style.display = 'none';
    }
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    $('installBanner').style.display = 'none';
  });
}

// ────────────────────────────────
// Service Worker Registration
// ────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  }
}

// ────────────────────────────────
// Init
// ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load saved data
  items = loadFromLocalStorage();
  renderItems();

  // Setup
  setupEnterKey();
  setupInstallPrompt();
  updateOnlineStatus();
  registerServiceWorker();

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Focus first input
  setTimeout(() => $('itemName').focus(), 300);
});
