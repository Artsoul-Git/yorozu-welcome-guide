(function () {
  var factories   = window.slideFactories || [];
  var totalSlides = factories.length;
  var current     = 0;

  var layout      = document.getElementById('p-layout');
  var currentCol  = document.getElementById('p-current-col');
  var sideCol     = document.getElementById('p-side-col');
  var splitter    = document.getElementById('p-splitter');
  var vSplitter   = document.getElementById('p-v-splitter');
  var stgCurrent  = document.getElementById('p-stage-current');
  var stgNext     = document.getElementById('p-stage-next');
  var notesBox    = document.getElementById('p-notes-box');
  var notesText   = document.getElementById('p-notes-text');
  var saveBtn     = document.getElementById('p-save-btn');
  var saveIndicator = document.getElementById('p-save-indicator');
  var timerEl     = document.getElementById('p-timer');
  var timerToggle = document.getElementById('p-timer-toggle');
  var timerReset  = document.getElementById('p-timer-reset');
  var prevBtn     = document.getElementById('p-prev');
  var nextBtn     = document.getElementById('p-next');
  var currentNum  = document.getElementById('p-current-num');
  var totalNum    = document.getElementById('p-total-num');
  var notesSmallerBtn = document.getElementById('p-notes-smaller');
  var notesLargerBtn  = document.getElementById('p-notes-larger');
  var fontsizeVal     = document.getElementById('p-fontsize-val');

  /* Toolbar */
  var exportPdfBtn    = document.getElementById('p-export-pdf');
  var exportPptxBtn   = document.getElementById('p-export-pptx');
  var zoomInBtn       = document.getElementById('p-zoom-in');
  var zoomOutBtn      = document.getElementById('p-zoom-out');
  var zoomResetBtn    = document.getElementById('p-zoom-reset');
  var zoomDisplay     = document.getElementById('p-zoom-display');
  var exportOverlay   = document.getElementById('p-export-overlay');
  var exportFill      = document.getElementById('p-export-fill');
  var sidebarToggle   = document.getElementById('p-sidebar-toggle');
  var sidebarBackdrop = document.getElementById('p-sidebar-backdrop');
  var sidebar         = document.getElementById('p-sidebar');
  var sidebarList     = document.getElementById('p-sidebar-list');
  var fullscreenBtn   = document.getElementById('p-fullscreen-btn');

  /* Page badge */
  var pageCur = document.getElementById('p-page-cur');
  var pageTot = document.getElementById('p-page-tot');
  if (pageTot) pageTot.textContent = totalSlides;

  /* =============================================
     Notify main window when presenter closes
     ============================================= */
  var bc = null;
  try { bc = new BroadcastChannel('slide-sync'); } catch (e) {}

  window.addEventListener('beforeunload', function () {
    if (bc) bc.postMessage({ type: 'presenter-closed' });
  });

  /* =============================================
     Notes overrides — localStorage persistence
     ============================================= */
  var notesOverrides = {};
  try {
    var stored = localStorage.getItem('presenterNotes');
    if (stored) notesOverrides = JSON.parse(stored);
  } catch (e) {}

  var autoSaveTimer = null;
  var saveFlashTimer = null;

  function saveNotes(index, text) {
    notesOverrides[index] = text;
    try { localStorage.setItem('presenterNotes', JSON.stringify(notesOverrides)); } catch (e) {}
    if (saveIndicator) {
      saveIndicator.textContent = '保存済';
      saveIndicator.classList.add('show');
      clearTimeout(saveFlashTimer);
      saveFlashTimer = setTimeout(function () { saveIndicator.classList.remove('show'); }, 1800);
    }
  }

  if (totalNum) totalNum.textContent = totalSlides;

  /* =============================================
     BroadcastChannel — sync with audience window
     ============================================= */
  var bcRemote = false;
  if (bc) {
    bc.onmessage = function (e) {
      if (e.data && e.data.type === 'goto') {
        bcRemote = true;
        goTo(e.data.index);
        bcRemote = false;
      }
    };
  }

  /* =============================================
     Zoom (current slide)
     ============================================= */
  var presenterZoom = 1.0;
  var ZOOM_STEP = 0.1;
  var ZOOM_MIN  = 0.5;
  var ZOOM_MAX  = 2.0;

  function applyPresenterZoom(z) {
    presenterZoom = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 10) / 10;
    stgCurrent.classList.toggle('zoomed', presenterZoom > 1.0);
    if (zoomDisplay) zoomDisplay.textContent = Math.round(presenterZoom * 100) + '%';
    fitSlide(stgCurrent, presenterZoom);
    try { localStorage.setItem('presenterZoom', presenterZoom); } catch (e) {}
  }

  if (zoomInBtn)    zoomInBtn.addEventListener('click',    function () { applyPresenterZoom(presenterZoom + ZOOM_STEP); });
  if (zoomOutBtn)   zoomOutBtn.addEventListener('click',   function () { applyPresenterZoom(presenterZoom - ZOOM_STEP); });
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', function () { applyPresenterZoom(1.0); });

  /* Ctrl+ホイールでズーム */
  document.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    applyPresenterZoom(presenterZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  /* =============================================
     fitSlide — compute 16:9 size inside container
     ============================================= */
  function fitSlide(stage, zoomFactor) {
    if (!stage) return;
    var slide = stage.querySelector('.slide');
    if (!slide) return;
    var W = stage.clientWidth;
    var H = stage.clientHeight;
    if (!W || !H) return;
    var w = W;
    var h = Math.round(W * 9 / 16);
    if (h > H) { h = H; w = Math.round(H * 16 / 9); }
    var z = zoomFactor || 1.0;
    slide.style.width  = Math.round(w * z) + 'px';
    slide.style.height = Math.round(h * z) + 'px';
  }

  window.addEventListener('resize', function () {
    fitSlide(stgCurrent, presenterZoom);
    fitSlide(stgNext);
  });

  /* =============================================
     Slide rendering
     ============================================= */
  function renderInto(container, index, zoom) {
    container.innerHTML = '';
    if (index < 0 || index >= totalSlides) {
      container.innerHTML = '<div class="p-stage-empty">（最後のスライド）</div>';
      return null;
    }
    try {
      var html  = factories[index]();
      var frag  = document.createRange().createContextualFragment(html);
      var slide = frag.querySelector('.slide');
      if (slide) {
        slide.dataset.index = index;
        slide.classList.add('active');
      }
      container.appendChild(frag);
      fitSlide(container, zoom || 1.0);
      return container.querySelector('.slide');
    } catch (e) { return null; }
  }

  /* =============================================
     Navigate
     ============================================= */
  function goTo(index) {
    if (index < 0 || index >= totalSlides) return;
    current = index;

    var slide = renderInto(stgCurrent, current, presenterZoom);
    renderInto(stgNext, current + 1);

    var defaultNotes = slide ? (slide.dataset.notes || '') : '';
    var notes = notesOverrides[current] !== undefined ? notesOverrides[current] : defaultNotes;
    if (notesText) notesText.value = notes;
    if (currentNum) currentNum.textContent = current + 1;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === totalSlides - 1;

    /* ページバッジ更新 */
    if (pageCur) pageCur.textContent = current + 1;

    /* サイドバーのカレント更新 */
    if (sidebarList) {
      sidebarList.querySelectorAll('.p-sidebar-item').forEach(function (el) {
        el.classList.toggle('current', parseInt(el.dataset.index, 10) === current);
      });
    }

    if (!bcRemote && bc) bc.postMessage({ type: 'goto', index: current });
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (notesText) saveNotes(current, notesText.value);
      return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ':
        e.preventDefault(); goTo(current + 1); break;
      case 'ArrowLeft': case 'ArrowUp':
        e.preventDefault(); goTo(current - 1); break;
      case 'f': case 'F':
        if (bc) bc.postMessage({ type: 'fullscreen-toggle' }); break;
    }
  });

  /* Auto-save on input (500 ms debounce) */
  if (notesText) {
    notesText.addEventListener('input', function () {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function () { saveNotes(current, notesText.value); }, 500);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (notesText) saveNotes(current, notesText.value);
    });
  }

  /* =============================================
     Notes font size
     ============================================= */
  var notesFontSize = 13;

  function applyNotesFontSize(size) {
    notesFontSize = Math.max(9, Math.min(28, size));
    if (notesText)   notesText.style.fontSize = notesFontSize + 'px';
    if (fontsizeVal) fontsizeVal.textContent   = notesFontSize;
    try { localStorage.setItem('presenterNotesFontSize', notesFontSize); } catch (e) {}
  }

  if (notesSmallerBtn) notesSmallerBtn.addEventListener('click', function () { applyNotesFontSize(notesFontSize - 1); });
  if (notesLargerBtn)  notesLargerBtn.addEventListener('click',  function () { applyNotesFontSize(notesFontSize + 1); });

  try {
    var savedFont = parseInt(localStorage.getItem('presenterNotesFontSize'), 10);
    if (!isNaN(savedFont)) applyNotesFontSize(savedFont);
  } catch (e) {}

  /* =============================================
     Drag overlay helper
     ============================================= */
  function makeDragOverlay(cursor) {
    var el = document.createElement('div');
    el.className = 'p-drag-overlay ' + cursor;
    document.body.appendChild(el);
    return el;
  }

  /* =============================================
     Horizontal splitter (left column width)
     ============================================= */
  var H_MIN = 28;
  var H_MAX = 80;

  function applyHSplit(pct) {
    pct = Math.max(H_MIN, Math.min(H_MAX, pct));
    currentCol.style.flex = '0 0 ' + pct.toFixed(1) + '%';
    requestAnimationFrame(function () { fitSlide(stgCurrent, presenterZoom); });
    try { localStorage.setItem('presenterHSplit', pct.toFixed(1)); } catch (e) {}
  }

  if (splitter) {
    splitter.addEventListener('mousedown', function (e) {
      e.preventDefault();
      splitter.classList.add('active');
      var overlay = makeDragOverlay('h');

      function onMove(ev) {
        var rect = layout.getBoundingClientRect();
        applyHSplit(((ev.clientX - rect.left) / rect.width) * 100);
      }
      function onUp() {
        splitter.classList.remove('active');
        overlay.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  try {
    var hs = parseFloat(localStorage.getItem('presenterHSplit'));
    if (!isNaN(hs)) applyHSplit(hs);
  } catch (e) {}

  /* =============================================
     Vertical splitter (next-slide panel height)
     ============================================= */
  var V_MIN_PX = 40;

  function applyVSplit(px) {
    if (!sideCol || !stgNext) return;
    var labelH  = (sideCol.querySelector('.p-col-label')  || {}).offsetHeight || 18;
    var infoH   = (sideCol.querySelector('.p-info-row')   || {}).offsetHeight || 52;
    var vSplH   = 8;
    var noteHdrH= notesBox ? (notesBox.querySelector('.p-notes-header') || {}).offsetHeight || 30 : 30;
    var maxPx   = sideCol.clientHeight - labelH - infoH - vSplH - noteHdrH - 20;
    px = Math.max(V_MIN_PX, Math.min(maxPx > V_MIN_PX ? maxPx : 9999, px));
    stgNext.style.height = px + 'px';
    requestAnimationFrame(function () { fitSlide(stgNext); });
    try { localStorage.setItem('presenterVSplit', Math.round(px)); } catch (e) {}
  }

  function initVSplit() {
    var w = sideCol ? sideCol.clientWidth : 400;
    var defaultH = Math.round(w * 9 / 16);
    try {
      var saved = parseInt(localStorage.getItem('presenterVSplit'), 10);
      applyVSplit(!isNaN(saved) ? saved : defaultH);
    } catch (e) { applyVSplit(defaultH); }
  }

  if (vSplitter) {
    vSplitter.addEventListener('mousedown', function (e) {
      e.preventDefault();
      vSplitter.classList.add('active');
      var overlay = makeDragOverlay('v');

      function onMove(ev) {
        if (!sideCol) return;
        var sideRect = sideCol.getBoundingClientRect();
        var labelH   = (sideCol.querySelector('.p-col-label') || {}).offsetHeight || 18;
        applyVSplit(ev.clientY - sideRect.top - labelH);
      }
      function onUp() {
        vSplitter.classList.remove('active');
        overlay.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  /* =============================================
     Timer
     ============================================= */
  var timerSec      = 0;
  var timerRunning  = false;
  var timerInterval = null;

  function fmtTime(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  if (timerToggle) {
    timerToggle.addEventListener('click', function () {
      if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerToggle.textContent = '▶ スタート';
      } else {
        timerInterval = setInterval(function () {
          timerSec++;
          if (timerEl) timerEl.textContent = fmtTime(timerSec);
        }, 1000);
        timerRunning = true;
        timerToggle.textContent = '⏸ 停止';
      }
    });
  }

  if (timerReset) {
    timerReset.addEventListener('click', function () {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSec = 0;
      if (timerEl)     timerEl.textContent    = '00:00';
      if (timerToggle) timerToggle.textContent = '▶ スタート';
    });
  }

  /* =============================================
     Export helpers
     ============================================= */
  function showExportOverlay() {
    if (exportOverlay) exportOverlay.classList.add('show');
    setExportProgress(0);
  }
  function hideExportOverlay() {
    if (exportOverlay) exportOverlay.classList.remove('show');
  }
  function setExportProgress(v) {
    if (exportFill) exportFill.style.width = Math.round(v * 100) + '%';
  }

  /* =============================================
     PDF Export
     ============================================= */
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function () {
      var tempSlides = [];
      for (var i = 0; i < totalSlides; i++) {
        var html = factories[i]();
        var frag = document.createRange().createContextualFragment(html);
        var sl   = frag.querySelector('.slide');
        if (sl) {
          sl.classList.add('active');
          sl.style.cssText = [
            'position:relative', 'top:auto', 'left:auto', 'transform:none',
            'width:297mm', 'height:167mm', 'max-width:none', 'max-height:none',
            'opacity:1', 'pointer-events:none',
            'page-break-after:always', 'break-after:page', 'margin:21.5mm 0'
          ].join(';');
          tempSlides.push(sl);
        }
      }
      var printArea = document.createElement('div');
      printArea.id  = 'p-print-area';
      printArea.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;overflow:visible;';
      tempSlides.forEach(function (s) { printArea.appendChild(s); });
      document.body.appendChild(printArea);

      requestAnimationFrame(function () {
        window.print();
        document.body.removeChild(printArea);
      });
    });
  }

  /* =============================================
     PPTX Export (html2canvas)
     ============================================= */
  if (exportPptxBtn) {
    exportPptxBtn.addEventListener('click', function () {
      if (typeof PptxGenJS === 'undefined') {
        alert('pptxgenjs が読み込まれていません'); return;
      }
      if (typeof html2canvas === 'undefined') {
        alert('html2canvas が読み込まれていません'); return;
      }

      showExportOverlay();

      var CAP_W = 1600, CAP_H = 900;
      var pptx  = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      var idx = 0;

      function captureNext() {
        if (idx >= totalSlides) {
          return pptx.writeFile({ fileName: '契約書AIチェックセミナー.pptx' }).then(hideExportOverlay);
        }

        var wrap = document.createElement('div');
        wrap.style.cssText =
          'position:fixed;top:0;left:0;' +
          'width:' + CAP_W + 'px;height:' + CAP_H + 'px;' +
          'overflow:hidden;z-index:100;pointer-events:none;';
        wrap.style.setProperty('--tz', '1');
        document.body.appendChild(wrap);

        var html     = factories[idx]();
        var frag     = document.createRange().createContextualFragment(html);
        var slideEl  = frag.querySelector('.slide');
        var slideNotes = '';
        if (slideEl) {
          slideEl.style.position      = 'absolute';
          slideEl.style.top           = '0';
          slideEl.style.left          = '0';
          slideEl.style.width         = CAP_W + 'px';
          slideEl.style.height        = CAP_H + 'px';
          slideEl.style.maxWidth      = 'none';
          slideEl.style.maxHeight     = 'none';
          slideEl.style.opacity       = '1';
          slideEl.style.transform     = 'none';
          slideEl.style.pointerEvents = 'none';
          slideEl.classList.add('active');
          slideNotes = slideEl.dataset.notes || '';
        }
        wrap.appendChild(frag);

        requestAnimationFrame(function () {
          setTimeout(function () {
            html2canvas(wrap, {
              scale: 1, useCORS: true, allowTaint: true,
              logging: false,
              width: CAP_W, height: CAP_H,
              windowWidth: CAP_W, windowHeight: CAP_H
            }).then(function (canvas) {
              document.body.removeChild(wrap);
              var imgData = canvas.toDataURL('image/jpeg', 0.92);
              var pSlide  = pptx.addSlide();
              pSlide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
              if (slideNotes) pSlide.addNotes(slideNotes);
              idx++;
              setExportProgress(idx / totalSlides);
              captureNext();
            }).catch(function () {
              document.body.removeChild(wrap);
              idx++;
              setExportProgress(idx / totalSlides);
              captureNext();
            });
          }, 60);
        });
      }

      captureNext();
    });
  }

  /* =============================================
     Sidebar (slide list)
     ============================================= */
  function getTitleFromFactory(fn, i) {
    try {
      var html = fn();
      var m = html.match(/data-title="([^"]+)"/);
      if (m) return m[1];
      var m2 = html.match(/class="slide-h2[^"]*">([^<]+)</);
      if (m2) return m2[1];
      var m3 = html.match(/class="s-section-title[^"]*">([^<]+)</);
      if (m3) return m3[1];
    } catch (e) {}
    return 'スライド ' + (i + 1);
  }

  function buildSidebar() {
    if (!sidebarList) return;
    factories.forEach(function (fn, i) {
      var el  = document.createElement('div');
      el.className    = 'p-sidebar-item';
      el.dataset.index = i;
      var num = document.createElement('span');
      num.className   = 'p-sidebar-num';
      num.textContent = String(i + 1).padStart(2, '0');
      var lbl = document.createElement('span');
      lbl.textContent = getTitleFromFactory(fn, i);
      el.appendChild(num);
      el.appendChild(lbl);
      el.addEventListener('click', function () { goTo(i); closeSidebar(); });
      sidebarList.appendChild(el);
    });
  }

  function openSidebar() {
    if (sidebar)         sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
    if (!bcRemote && bc) bc.postMessage({ type: 'sidebar-open' });
  }

  function closeSidebar() {
    if (sidebar)         sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
    if (!bcRemote && bc) bc.postMessage({ type: 'sidebar-close' });
  }

  if (sidebarToggle)   sidebarToggle.addEventListener('click',   function () { sidebar.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  /* =============================================
     Laser pointer — send mouse position to main window
     ============================================= */
  var laserOffTimer = null;

  stgCurrent.addEventListener('mousemove', function (e) {
    if (!bc) return;
    var slide = stgCurrent.querySelector('.slide');
    if (!slide) return;
    var rect = slide.getBoundingClientRect();
    var rx = (e.clientX - rect.left) / rect.width;
    var ry = (e.clientY - rect.top)  / rect.height;
    bc.postMessage({ type: 'laser', x: rx, y: ry });
    clearTimeout(laserOffTimer);
    laserOffTimer = setTimeout(function () { if (bc) bc.postMessage({ type: 'laser-off' }); }, 2000);
  });

  stgCurrent.addEventListener('mouseleave', function () {
    clearTimeout(laserOffTimer);
    if (bc) bc.postMessage({ type: 'laser-off' });
  });

  /* =============================================
     Fullscreen — audience window (index.html)
     ============================================= */
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function () {
      if (bc) bc.postMessage({ type: 'fullscreen-toggle' });
    });
  }

  /* =============================================
     Init
     ============================================= */
  var h = location.hash.replace('#', '');
  var n = parseInt(h, 10);
  current = (!isNaN(n) && n >= 1 && n <= totalSlides) ? n - 1 : 0;

  /* 前回のズームを復元 */
  try {
    var savedZoom = parseFloat(localStorage.getItem('presenterZoom'));
    if (!isNaN(savedZoom) && savedZoom !== 1.0) {
      presenterZoom = savedZoom;
      if (zoomDisplay) zoomDisplay.textContent = Math.round(presenterZoom * 100) + '%';
      stgCurrent.classList.toggle('zoomed', presenterZoom > 1.0);
    }
  } catch (e) {}

  buildSidebar();

  requestAnimationFrame(function () {
    initVSplit();
    goTo(current);
  });
})();
