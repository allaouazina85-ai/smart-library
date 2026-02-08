// app.js

// ===== إعدادات =====
const LS_KEY = "LIB_BOOKS_V1";
const ADMIN_SESSION_KEY = "LIB_ADMIN_ON";
// ملاحظة: كلمة السر هنا داخل الواجهة (MVP)
const ADMIN_PASSWORD = "admin123";

// ===== بيانات افتراضية (إذا لا يوجد تخزين محلي بعد) =====
const DEFAULT_BOOKS = [
  {
    id: "BK-0001",
    title: "مبادئ القانون الإداري",
    author: "عبد القادر بن صالح",
    year: 2018,
    keywords: ["قانون", "إدارة", "وظيفة عمومية"],
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    language: "ar"
  },
  {
    id: "BK-0002",
    title: "الصفقات العمومية: دليل عملي",
    author: "س. ب",
    year: 2020,
    keywords: ["صفقات", "إجراءات", "مناقصات"],
    fileUrl: "https://www.orimi.com/pdf-test.pdf",
    language: "ar"
  }
];

// ===== عناصر DOM =====
const $ = (id) => document.getElementById(id);

const $q = $("q");
const $btnClear = $("btnClear");
const $results = $("results");
const $resultCount = $("resultCount");

const $bookTitle = $("bookTitle");
const $bookSub = $("bookSub");
const $btnOpen = $("btnOpen");
const $btnSummary = $("btnSummary");
const $btnTts = $("btnTts");
const $frame = $("frame");
const $viewerHint = $("viewerHint");

const $summaryTool = $("summaryTool");
const $ttsTool = $("ttsTool");
const $btnGenerateSummary = $("btnGenerateSummary");
const $btnCopySummary = $("btnCopySummary");
const $summaryOut = $("summaryOut");

const $ttsText = $("ttsText");
const $ttsRate = $("ttsRate");
const $ttsRateVal = $("ttsRateVal");
const $voiceSelect = $("voiceSelect");
const $btnSpeak = $("btnSpeak");
const $btnPause = $("btnPause");
const $btnStop = $("btnStop");

// Admin UI
const $btnAdmin = $("btnAdmin");
const $adminBar = $("adminBar");
const $btnAddBook = $("btnAddBook");
const $btnImportCsv = $("btnImportCsv");
const $btnScan = $("btnScan");
const $btnExportJson = $("btnExportJson");
const $btnLogout = $("btnLogout");

// Modals
const $modalAdmin = $("modalAdmin");
const $adminPass = $("adminPass");
const $btnAdminLogin = $("btnAdminLogin");
const $adminMsg = $("adminMsg");

const $modalAdd = $("modalAdd");
const $fId = $("fId");
const $fLang = $("fLang");
const $fTitle = $("fTitle");
const $fAuthor = $("fAuthor");
const $fYear = $("fYear");
const $fKeywords = $("fKeywords");
const $fUrl = $("fUrl");
const $btnSaveBook = $("btnSaveBook");
const $btnResetBook = $("btnResetBook");
const $addMsg = $("addMsg");

const $modalImport = $("modalImport");
const $csvFile = $("csvFile");
const $btnPreviewCsv = $("btnPreviewCsv");
const $btnApplyCsv = $("btnApplyCsv");
const $importMsg = $("importMsg");
const $csvPreview = $("csvPreview");

const $modalScan = $("modalScan");
const $scanVideo = $("scanVideo");
const $scanOut = $("scanOut");
const $scanManual = $("scanManual");
const $btnStartScan = $("btnStartScan");
const $btnStopScan = $("btnStopScan");
const $btnUseScan = $("btnUseScan");

// ===== حالة التطبيق =====
let books = [];
let selectedBook = null;
let selectedSummaryMode = "medium";

// CSV preview state
let csvParsedRows = [];

// ===== أدوات =====
function normalize(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function tokenize(q) {
  return normalize(q).split(" ").filter(Boolean);
}
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}
function isValidUrl(url) {
  try {
    // يقبل http/https + مسارات intranet:// كـURL مخصص (لن ينجح مع URL() دائمًا)
    if (!url) return false;
    const u = url.trim();
    if (u.startsWith("intranet://") || u.startsWith("file://")) return true;
    new URL(u);
    return true;
  } catch {
    return false;
  }
}
function nowIdFallback() {
  return `BK-${Math.floor(Math.random()*90000+10000)}`;
}

// ===== LocalStorage =====
function loadBooks() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    books = [...DEFAULT_BOOKS];
    saveBooks();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    books = Array.isArray(parsed) ? parsed : [...DEFAULT_BOOKS];
  } catch {
    books = [...DEFAULT_BOOKS];
  }
}
function saveBooks() {
  localStorage.setItem(LS_KEY, JSON.stringify(books));
}
function isAdminOn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}
function setAdminOn(v) {
  if (v) sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  renderAdminBar();
}

// ===== بحث/عرض =====
function matchesBook(book, query) {
  const q = normalize(query);
  if (!q) return true;
  const hay = [
    book.id, book.title, book.author, String(book.year || ""),
    book.language, ...(book.keywords || []), book.fileUrl || ""
  ].map(normalize).join(" | ");

  return hay.includes(q) || tokenize(q).some(t => hay.includes(t));
}
function filterBooks(query) {
  return books.filter(b => matchesBook(b, query));
}
function setButtonsEnabled(enabled) {
  $btnOpen.disabled = !enabled;
  $btnSummary.disabled = !enabled;
  $btnTts.disabled = !enabled;
}
function selectBook(book) {
  selectedBook = book;
  if (!book) {
    $bookTitle.textContent = "لم يتم اختيار كتاب";
    $bookSub.textContent = "اختر كتابًا من النتائج لفتحه";
    setButtonsEnabled(false);
    $frame.src = "";
    $viewerHint.style.display = "grid";
    closeTools();
    return;
  }
  $bookTitle.textContent = book.title;
  $bookSub.textContent = `${book.author || "بدون مؤلف"} • ${book.year || "-"} • ${book.id}`;
  setButtonsEnabled(true);
  $viewerHint.style.display = "grid";
}
function openSelectedBook() {
  if (!selectedBook?.fileUrl) return;
  $frame.src = selectedBook.fileUrl;
  $viewerHint.style.display = "none";
  if (!$ttsText.value.trim()) {
    $ttsText.value = `أنت تستمع الآن إلى قراءة تجريبية للكتاب: ${selectedBook.title}.`;
  }
}

// ===== رسم النتائج =====
function renderResults(items) {
  $resultCount.textContent = String(items.length);

  if (items.length === 0) {
    $results.classList.add("empty");
    $results.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🗂️</div>
        <div class="empty-text">لا توجد نتائج مطابقة.</div>
      </div>
    `;
    return;
  }

  $results.classList.remove("empty");
  $results.innerHTML = items.map(b => `
    <div class="card ${selectedBook?.id === b.id ? "active" : ""}" data-id="${escapeHtml(b.id)}">
      <div class="card-title">${escapeHtml(b.title)}</div>
      <div class="card-meta">
        <div>المؤلف: ${escapeHtml(b.author || "-")} • السنة: ${escapeHtml(String(b.year || "-"))}</div>
        <div>الكود: ${escapeHtml(b.id)} • اللغة: ${escapeHtml((b.language || "ar").toUpperCase())}</div>
      </div>
      <div class="card-tags">
        ${(b.keywords || []).slice(0,4).map(k => `<span class="tag">${escapeHtml(k)}</span>`).join("")}
      </div>
    </div>
  `).join("");

  $results.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const book = books.find(x => x.id === id);
      selectBook(book);
      renderResults(filterBooks($q.value));
    });
  });
}

// ===== أدوات: تلخيص/TTS =====
function showTool(toolName) {
  if (toolName === "summary") {
    $summaryTool.hidden = false;
    $ttsTool.hidden = true;
  } else if (toolName === "tts") {
    $ttsTool.hidden = false;
    $summaryTool.hidden = true;
  }
}
function closeTools() {
  $summaryTool.hidden = true;
  $ttsTool.hidden = true;
}
function modeLabel(mode) {
  if (mode === "short") return "قصير";
  if (mode === "medium") return "متوسط";
  return "مفصل";
}
function mockSummaryText(book, mode) {
  const kw = (book.keywords || []).join("، ");
  if (mode === "short") {
    return `يعالج هذا الكتاب موضوع: ${kw || "—"}.\nيقدّم نظرة مركزة ومفاهيم أساسية تساعد على الفهم السريع.`;
  }
  if (mode === "medium") {
    return `• موضوع الكتاب: ${kw || "—"}\n• يقدم المفاهيم الأساسية بطريقة عملية.\n• مناسب للرجوع السريع داخل الإدارة.\n• يُنصح بقراءته مع تطبيق الأمثلة على الحالات الواقعية.`;
  }
  return `1) يقدم إطارًا عامًا لموضوع: ${kw || "—"}.\n2) يشرح المفاهيم مع أمثلة تطبيقية.\n3) يضم نقاط تنظيمية تساعد على اتخاذ القرار.\n4) خاتمة تلخص أهم ما يجب تذكره.\n\nملاحظة: هذا تلخيص تجريبي—التلخيص الحقيقي يحتاج نصًا مستخرجًا من ملف الكتاب.`;
}
function generateSummaryMock() {
  if (!selectedBook) return;
  const base = `تلخيص (${modeLabel(selectedSummaryMode)}) للكتاب: ${selectedBook.title}\n\n`;
  const out = base + mockSummaryText(selectedBook, selectedSummaryMode);
  $summaryOut.classList.remove("muted");
  $summaryOut.textContent = out;
  $btnCopySummary.disabled = false;
}
async function copySummary() {
  const text = $summaryOut.textContent || "";
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
  $btnCopySummary.textContent = "تم النسخ ✓";
  setTimeout(() => ($btnCopySummary.textContent = "نسخ"), 900);
}

// Web Speech
let voices = [];
let utterance = null;

function loadVoices() {
  voices = window.speechSynthesis?.getVoices?.() || [];
  $voiceSelect.innerHTML = "";

  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "لا توجد أصوات متاحة";
    $voiceSelect.appendChild(opt);
    $voiceSelect.disabled = true;
    return;
  }

  $voiceSelect.disabled = false;
  voices.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${v.name} (${v.lang})`;
    $voiceSelect.appendChild(opt);
  });

  const arIndex = voices.findIndex(v => (v.lang || "").toLowerCase().startsWith("ar"));
  if (arIndex >= 0) $voiceSelect.value = String(arIndex);
}
function speak() {
  const text = ($ttsText.value || "").trim();
  if (!text) return;

  stopSpeech();
  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Number($ttsRate.value) || 1;

  const idx = Number($voiceSelect.value);
  if (!Number.isNaN(idx) && voices[idx]) utterance.voice = voices[idx];

  utterance.onend = () => {
    $btnPause.disabled = true;
    $btnStop.disabled = true;
    $btnSpeak.disabled = false;
  };

  window.speechSynthesis.speak(utterance);
  $btnPause.disabled = false;
  $btnStop.disabled = false;
  $btnSpeak.disabled = true;
}
function pauseSpeech() {
  if (!window.speechSynthesis.speaking) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    $btnPause.textContent = "إيقاف مؤقت";
  } else {
    window.speechSynthesis.pause();
    $btnPause.textContent = "متابعة";
  }
}
function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  utterance = null;
  $btnPause.textContent = "إيقاف مؤقت";
  $btnPause.disabled = true;
  $btnStop.disabled = true;
  $btnSpeak.disabled = false;
}

// ===== مودالات =====
function openModal(el) { el.hidden = false; }
function closeModal(el) { el.hidden = true; }
document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-close");
    const el = document.getElementById(id);
    if (el) closeModal(el);
  });
});

// ===== Admin =====
function renderAdminBar() {
  $adminBar.hidden = !isAdminOn();
}
function adminRequire() {
  if (!isAdminOn()) {
    openModal($modalAdmin);
    $adminMsg.textContent = "الرجاء إدخال كلمة السر.";
    return false;
  }
  return true;
}
function adminLogin() {
  const pass = ($adminPass.value || "").trim();
  if (pass === ADMIN_PASSWORD) {
    setAdminOn(true);
    $adminPass.value = "";
    $adminMsg.textContent = "";
    closeModal($modalAdmin);
  } else {
    $adminMsg.textContent = "كلمة السر غير صحيحة.";
  }
}
function adminLogout() {
  setAdminOn(false);
  closeModal($modalAdd);
  closeModal($modalImport);
  closeModal($modalScan);
}

// ===== إضافة كتاب =====
function resetAddForm() {
  $fId.value = "";
  $fLang.value = "ar";
  $fTitle.value = "";
  $fAuthor.value = "";
  $fYear.value = "";
  $fKeywords.value = "";
  $fUrl.value = "";
  $addMsg.textContent = "";
}
function parseKeywords(s) {
  const raw = (s || "").trim();
  if (!raw) return [];
  return raw
    .split(/[,|]/g)
    .map(x => x.trim())
    .filter(Boolean);
}
function addBookFromForm() {
  $addMsg.textContent = "";
  const id = ($fId.value || "").trim() || nowIdFallback();
  const title = ($fTitle.value || "").trim();
  const author = ($fAuthor.value || "").trim();
  const year = Number(($fYear.value || "").trim()) || undefined;
  const language = ($fLang.value || "ar").trim();
  const fileUrl = ($fUrl.value || "").trim();
  const keywords = parseKeywords($fKeywords.value);

  if (!id) { $addMsg.textContent = "الكود مطلوب."; return; }
  if (!title) { $addMsg.textContent = "العنوان مطلوب."; return; }
  if (!fileUrl) { $addMsg.textContent = "الرابط مطلوب."; return; }
  if (!isValidUrl(fileUrl)) { $addMsg.textContent = "الرابط غير صالح."; return; }

  const exists = books.some(b => b.id === id);
  if (exists) { $addMsg.textContent = "هذا الكود موجود مسبقًا."; return; }

  books.unshift({ id, title, author, year, language, fileUrl, keywords });
  saveBooks();

  // تحديث واجهة
  renderResults(filterBooks($q.value));
  $addMsg.textContent = "تمت الإضافة ✓";
  setTimeout(() => { $addMsg.textContent = ""; }, 1000);
}

// ===== استيراد CSV =====
// CSV بسيط: يفصل بـ , مع دعم "quotes"
function parseCsv(text) {
  const rows = [];
  let cur = "";
  let inQuotes = false;
  const row = [];

  function pushCell() { row.push(cur); cur = ""; }
  function pushRow() { rows.push([...row]); row.length = 0; }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"'; i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { pushCell(); continue; }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      pushCell(); pushRow();
      continue;
    }
    cur += ch;
  }
  pushCell(); pushRow();

  // حذف صفوف فارغة
  return rows.filter(r => r.some(c => (c || "").trim() !== ""));
}
function mapCsvRowsToBooks(rows) {
  const header = rows[0].map(h => normalize(h));
  const idx = (name) => header.indexOf(normalize(name));

  const iId = idx("id");
  const iTitle = idx("title");
  const iAuthor = idx("author");
  const iYear = idx("year");
  const iLang = idx("language");
  const iUrl = idx("fileurl");
  const iKw = idx("keywords");

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const id = (cols[iId] || "").trim();
    const title = (cols[iTitle] || "").trim();
    const author = (cols[iAuthor] || "").trim();
    const year = Number((cols[iYear] || "").trim()) || undefined;
    const language = ((cols[iLang] || "ar").trim() || "ar");
    const fileUrl = (cols[iUrl] || "").trim();
    const keywords = parseKeywords((cols[iKw] || "").trim());

    out.push({ id, title, author, year, language, fileUrl, keywords });
  }
  return out;
}
async function previewCsv() {
  $importMsg.textContent = "";
  $csvPreview.classList.add("muted");
  $csvPreview.textContent = "جاري القراءة…";
  $btnApplyCsv.disabled = true;
  csvParsedRows = [];

  const file = $csvFile.files?.[0];
  if (!file) {
    $csvPreview.textContent = "اختر ملف CSV أولاً.";
    return;
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    $csvPreview.textContent = "CSV فارغ.";
    return;
  }

  // تحقق من وجود الأعمدة الأساسية
  const header = rows[0].map(h => normalize(h));
  const required = ["id","title","fileurl"];
  const missing = required.filter(x => !header.includes(x));

  csvParsedRows = rows;

  if (missing.length) {
    $csvPreview.textContent = `الأعمدة الناقصة: ${missing.join(", ")}\n\nتأكد أن الصف الأول يحتوي أسماء الأعمدة.`;
    return;
  }

  const mapped = mapCsvRowsToBooks(rows);
  const sample = mapped.slice(0, 5).map(b =>
    `- ${b.id} | ${b.title} | ${b.fileUrl}`
  ).join("\n");

  $csvPreview.classList.remove("muted");
  $csvPreview.textContent =
    `عدد السجلات: ${mapped.length}\n\nعينة (أول 5):\n${sample}\n\nاضغط "اعتماد الاستيراد" للإضافة.`;

  $btnApplyCsv.disabled = false;
}
function applyCsv() {
  if (!csvParsedRows.length) return;

  const incoming = mapCsvRowsToBooks(csvParsedRows);

  // تحقق ودمج: تجاهل IDs المكررة داخل النظام
  let added = 0;
  let skipped = 0;

  for (const b of incoming) {
    if (!b.id || !b.title || !b.fileUrl) { skipped++; continue; }
    if (!isValidUrl(b.fileUrl)) { skipped++; continue; }
    if (books.some(x => x.id === b.id)) { skipped++; continue; }
    books.push(b);
    added++;
  }

  saveBooks();
  renderResults(filterBooks($q.value));
  $importMsg.textContent = `تمت الإضافة: ${added} | تم التجاهل: ${skipped}`;
  $btnApplyCsv.disabled = true;
}

// ===== تصدير JSON =====
function exportJson() {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "books_export.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ===== مسح QR/Barcode =====
let scanStream = null;
let scanTimer = null;
let lastScanValue = "";

function setScanOut(text, muted = true) {
  $scanOut.textContent = text;
  $scanOut.classList.toggle("muted", muted);
}

async function startScan() {
  setScanOut("جاري تشغيل الكاميرا…", true);
  $btnStartScan.disabled = true;
  $btnStopScan.disabled = false;
  $btnUseScan.disabled = true;
  lastScanValue = "";

  // تشغيل الكاميرا
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    $scanVideo.srcObject = scanStream;
    await $scanVideo.play();
  } catch (e) {
    setScanOut("فشل تشغيل الكاميرا. تأكد من السماح بالوصول.", true);
    $btnStartScan.disabled = false;
    $btnStopScan.disabled = true;
    return;
  }

  // BarcodeDetector إن كان مدعومًا
  if (!("BarcodeDetector" in window)) {
    setScanOut("المتصفح لا يدعم BarcodeDetector. استخدم الإدخال اليدوي.", true);
    return;
  }

  let detector = null;
  try {
    // نطلب أكثر الأنواع شيوعًا
    const formats = ["qr_code","code_128","ean_13","ean_8","code_39"];
    detector = new BarcodeDetector({ formats });
  } catch {
    setScanOut("تعذر تهيئة BarcodeDetector. استخدم الإدخال اليدوي.", true);
    return;
  }

  // حلقة مسح بسيطة كل 350ms
  scanTimer = setInterval(async () => {
    try {
      if (!$scanVideo.videoWidth) return;
      const barcodes = await detector.detect($scanVideo);
      if (barcodes && barcodes.length) {
        const value = barcodes[0].rawValue || "";
        if (value && value !== lastScanValue) {
          lastScanValue = value;
          setScanOut(value, false);
          $btnUseScan.disabled = false;
        }
      }
    } catch {
      // تجاهل
    }
  }, 350);
}

function stopScan() {
  if (scanTimer) clearInterval(scanTimer);
  scanTimer = null;

  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  $scanVideo.srcObject = null;

  $btnStartScan.disabled = false;
  $btnStopScan.disabled = true;
}

function parseScanPayload(payload) {
  const raw = (payload || "").trim();
  if (!raw) return null;

  // JSON؟
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const obj = JSON.parse(raw);
      const id = (obj.id || obj.code || "").trim();
      const title = (obj.title || "").trim();
      const url = (obj.url || obj.fileUrl || "").trim();
      if (url) return { id, title, url };
    } catch {}
  }

  // صيغة ID|Title|URL
  if (raw.includes("|")) {
    const parts = raw.split("|").map(x => x.trim());
    if (parts.length >= 3) {
      return { id: parts[0], title: parts[1], url: parts.slice(2).join("|") };
    }
  }

  // رابط فقط
  if (isValidUrl(raw)) {
    return { id: "", title: "", url: raw };
  }

  return null;
}

function useScanValue() {
  const payload = (lastScanValue || $scanManual.value || "").trim();
  const parsed = parseScanPayload(payload);
  if (!parsed) {
    setScanOut("القيمة غير مفهومة. استخدم URL أو ID|Title|URL أو JSON.", true);
    return;
  }

  // املأ فورم الإضافة ثم افتحه
  if (!adminRequire()) return;

  openModal($modalAdd);
  $fId.value = parsed.id || "";
  $fTitle.value = parsed.title || "";
  $fUrl.value = parsed.url || "";
  $addMsg.textContent = "تم إدخال البيانات من المسح. أكمل الحقول ثم اضغط حفظ.";
}

// ===== أحداث عامة =====
$q.addEventListener("input", () => renderResults(filterBooks($q.value)));
$q.addEventListener("keydown", (e) => {
  if (e.key === "Enter") renderResults(filterBooks($q.value));
});
$btnClear.addEventListener("click", () => {
  $q.value = "";
  renderResults(filterBooks(""));
  $q.focus();
});

$btnOpen.addEventListener("click", openSelectedBook);

$btnSummary.addEventListener("click", () => showTool("summary"));
$btnTts.addEventListener("click", () => {
  showTool("tts");
  if (!$ttsText.value.trim() && selectedBook) {
    $ttsText.value = `قراءة تجريبية: ${selectedBook.title}.`;
  }
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeTools());
});

document.querySelectorAll(".segmented .seg").forEach(seg => {
  seg.addEventListener("click", () => {
    document.querySelectorAll(".segmented .seg").forEach(x => x.classList.remove("active"));
    seg.classList.add("active");
    selectedSummaryMode = seg.getAttribute("data-mode") || "medium";
  });
});

$btnGenerateSummary.addEventListener("click", generateSummaryMock);
$btnCopySummary.addEventListener("click", copySummary);

$ttsRate.addEventListener("input", () => {
  $ttsRateVal.textContent = Number($ttsRate.value).toFixed(1);
});
$btnSpeak.addEventListener("click", speak);
$btnPause.addEventListener("click", pauseSpeech);
$btnStop.addEventListener("click", stopSpeech);

// ===== أحداث Admin =====
$btnAdmin.addEventListener("click", () => openModal($modalAdmin));
$btnAdminLogin.addEventListener("click", adminLogin);
$adminPass.addEventListener("keydown", (e) => { if (e.key === "Enter") adminLogin(); });

$btnLogout.addEventListener("click", adminLogout);

$btnAddBook.addEventListener("click", () => {
  if (!adminRequire()) return;
  resetAddForm();
  openModal($modalAdd);
});
$btnImportCsv.addEventListener("click", () => {
  if (!adminRequire()) return;
  $importMsg.textContent = "";
  $csvPreview.textContent = "ستظهر المعاينة هنا…";
  $csvPreview.classList.add("muted");
  $btnApplyCsv.disabled = true;
  $csvFile.value = "";
  openModal($modalImport);
});
$btnScan.addEventListener("click", () => {
  if (!adminRequire()) return;
  setScanOut("بانتظار المسح…", true);
  $scanManual.value = "";
  $btnUseScan.disabled = true;
  $btnStartScan.disabled = false;
  $btnStopScan.disabled = true;
  openModal($modalScan);
});
$btnExportJson.addEventListener("click", () => {
  if (!adminRequire()) return;
  exportJson();
});

$btnSaveBook.addEventListener("click", () => {
  if (!adminRequire()) return;
  addBookFromForm();
});
$btnResetBook.addEventListener("click", resetAddForm);

$btnPreviewCsv.addEventListener("click", () => {
  if (!adminRequire()) return;
  previewCsv();
});
$btnApplyCsv.addEventListener("click", () => {
  if (!adminRequire()) return;
  applyCsv();
});

// Scan actions
$btnStartScan.addEventListener("click", () => { startScan(); });
$btnStopScan.addEventListener("click", () => { stopScan(); });
$btnUseScan.addEventListener("click", () => { useScanValue(); });

// عند إغلاق مودال المسح: أوقف الكاميرا
$modalScan.addEventListener("click", (e) => {
  const tgt = e.target;
  if (tgt && tgt.classList.contains("modal-backdrop")) {
    stopScan();
  }
});
document.querySelectorAll('[data-close="modalScan"]').forEach(btn => {
  btn.addEventListener("click", () => stopScan());
});

// ===== تشغيل أولي =====
(function init(){
  loadBooks();
  renderResults(filterBooks(""));
  selectBook(null);
  renderAdminBar();

  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  } else {
    $voiceSelect.innerHTML = `<option>Web Speech API غير مدعوم</option>`;
    $voiceSelect.disabled = true;
  }
})();
