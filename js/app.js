(function () {
  var factories = window.slideFactories || [];
  var agenda    = window.agendaItems   || [];
  var SLUG      = window.SLIDE_SLUG || 'default';
  var EDITS_KEY = SLUG + '_slideEdits';
  var ZOOM_KEY  = SLUG + '_slideZoom';
  var totalSlides = factories.length;
  var rendered  = new Set();
  var current   = 0;
  var scriptLocked = false;
  var scriptHideTimer = null;

  var stage    = document.querySelector('.slide-stage');
  var nav      = document.querySelector('.section-nav');
  var sidebar  = document.querySelector('.sidebar');
  var backdrop = document.querySelector('.sidebar-backdrop');
  var sideList = document.querySelector('.sidebar-list');
  var toggleBtn= document.querySelector('.sidebar-toggle');
  var scriptPanel  = document.querySelector('.script-panel');
  var scriptTrigger= document.querySelector('.script-trigger');
  var scriptText   = document.querySelector('.script-text');
  var overlay     = document.querySelector('.export-overlay');
  var fillBar     = document.querySelector('.export-progress-fill');
  var pdfBtn      = document.querySelector('.export-pdf');
  var pptxBtn     = document.querySelector('.export-pptx');
  var zoomInBtn   = document.querySelector('.zoom-in');
  var zoomOutBtn  = document.querySelector('.zoom-out');
  var zoomResetBtn= document.querySelector('.zoom-reset');
  var zoomDisplay = document.getElementById('zoom-display');

  var editModeBtn  = document.getElementById('edit-mode-btn');
  var editToolbar  = document.getElementById('edit-toolbar');
  var etBold       = document.getElementById('et-bold');
  var etItalic     = document.getElementById('et-italic');
  var etUnderline  = document.getElementById('et-underline');
  var etColor      = document.getElementById('et-color');
  var etResetSlide = document.getElementById('et-reset-slide');
  var etSaved      = document.getElementById('et-saved');
  var etUndo       = document.getElementById('et-undo');
  var etDiscard    = document.getElementById('et-discard');

  /* ---------- Slide edits (localStorage) ---------- */
  var slideEdits = {};
  try { slideEdits = JSON.parse(localStorage.getItem(EDITS_KEY) || '{}'); } catch (e) {}
  var editMode        = false;
  var editAutoSaveTimer = null;
  var etSavedTimer    = null;
  var etColorSavedRange = null;
  var undoStack = {};            /* {slideIndex: [html, ...]} per-slide undo history */
  var editModeSnapshots = {};    /* slide innerHTML at edit-mode entry (for discard) */
  var editModeSnapshotEdits = {};/* slideEdits clone at edit-mode entry */

  /* ---------- Render ---------- */
  function ensureRendered(index) {
    if (rendered.has(index) || index < 0 || index >= totalSlides) return;
    var html = factories[index]();
    var frag = document.createRange().createContextualFragment(html);
    var sec  = frag.querySelector('.slide');
    if (sec) {
      sec.dataset.index = index;
      if (slideEdits[index] !== undefined) sec.innerHTML = slideEdits[index];
    }
    stage.appendChild(frag);
    rendered.add(index);
    /* Re-attach drag handlers to any dp-el restored from localStorage */
    dpRestoreElements(getSlide(index));
  }

  function getSlide(index) {
    return stage.querySelector('.slide[data-index="' + index + '"]');
  }

  /* ---------- Navigate ---------- */
  function goTo(index) {
    if (index < 0 || index >= totalSlides) return;
    /* In edit mode: save + deactivate current slide before switching */
    if (editMode) {
      dpDeselectEl();
      var leaving = getSlide(current);
      if (leaving && leaving.contentEditable === 'true') {
        leaving.removeAttribute('contentEditable');
        persistCurrentEdit(current, leaving);
      }
    }
    ensureRendered(index);
    /* Snapshot newly rendered slide before editing */
    if (editMode && !(index in editModeSnapshots)) {
      var newSl = getSlide(index);
      if (newSl) editModeSnapshots[index] = newSl.innerHTML;
    }
    ensureRendered(index + 1);
    var prev = getSlide(current);
    if (prev) prev.classList.remove('active');
    current = index;
    var next = getSlide(current);
    if (next) next.classList.add('active');
    /* In edit mode: activate new slide */
    if (editMode && next) next.contentEditable = 'true';
    updateHash();
    updateSectionNav();
    updateSidebar();
    updateScriptPanel();
    if (!bcRemote && bc) bc.postMessage({ type: 'goto', index: current });
  }

  function updateHash() {
    history.replaceState(null, '', '#' + (current + 1));
  }

  function parseHash() {
    var h = location.hash.replace('#', '');
    var n = parseInt(h, 10);
    return (!isNaN(n) && n >= 1 && n <= totalSlides) ? n - 1 : 0;
  }

  /* ---------- Section Nav ---------- */
  function buildSectionNav() {
    agenda.forEach(function (item) {
      var el = document.createElement('span');
      el.className = 'section-nav-item';
      el.dataset.section = item.id;
      el.textContent = item.label;
      el.addEventListener('click', function () {
        for (var i = 0; i < totalSlides; i++) {
          ensureRendered(i);
          var s = getSlide(i);
          if (s && s.dataset.section === item.id) { goTo(i); return; }
        }
      });
      nav.appendChild(el);
    });
  }

  function updateSectionNav() {
    var slide = getSlide(current);
    var sec   = slide ? slide.dataset.section : '';
    var isDark = slide ? slide.classList.contains('slide-section') ||
                         slide.classList.contains('slide-impact') ||
                         slide.classList.contains('slide-metric') ||
                         slide.classList.contains('slide-ending') : false;
    nav.classList.toggle('on-dark', isDark);
    nav.querySelectorAll('.section-nav-item').forEach(function (el) {
      el.classList.toggle('current', el.dataset.section === sec);
    });
  }

  /* ---------- Sidebar ---------- */
  function buildSidebar() {
    factories.forEach(function (fn, i) {
      var el = document.createElement('div');
      el.className = 'sidebar-item';
      el.dataset.index = i;
      var num  = document.createElement('span');
      num.className = 'sidebar-item-num';
      num.textContent = String(i + 1).padStart(2, '0');
      var label = document.createElement('span');
      label.textContent = getTitleFromFactory(fn, i);
      el.appendChild(num);
      el.appendChild(label);
      el.addEventListener('click', function () { goTo(i); closeSidebar(); });
      sideList.appendChild(el);
    });
  }

  function getTitleFromFactory(fn, i) {
    try {
      var html = fn();
      var m = html.match(/data-title="([^"]+)"/);
      if (m) return m[1];
      var m2 = html.match(/class="slide-h2[^"]*">([^<]+)</);
      if (m2) return m2[1];
      var m3 = html.match(/class="s-section-title[^"]*">([^<]+)</);
      if (m3) return m3[1];
      var m4 = html.match(/class="slide-cover-title[^"]*">([^<]+)</);
      if (m4) return m4[1];
    } catch (e) {}
    return 'スライド ' + (i + 1);
  }

  function updateSidebar() {
    sideList.querySelectorAll('.sidebar-item').forEach(function (el) {
      el.classList.toggle('current', parseInt(el.dataset.index, 10) === current);
    });
  }

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  }

  /* ---------- Script Panel ---------- */
  function updateScriptPanel() {
    var slide = getSlide(current);
    var notes = slide ? (slide.dataset.notes || '') : '';
    if (scriptText) scriptText.textContent = notes;
  }

  function openScriptPanel() {
    if (scriptPanel) scriptPanel.classList.add('open');
  }

  function hideScriptPanel() {
    if (!scriptLocked && scriptPanel) scriptPanel.classList.remove('open');
  }

  function toggleScriptPanel() {
    scriptLocked = !scriptLocked;
    if (scriptLocked) { openScriptPanel(); }
    else if (scriptPanel) { scriptPanel.classList.remove('open'); }
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (editMode) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        var slide = getSlide(current);
        if (slide) persistCurrentEdit(current, slide);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (etUndo) etUndo.click();
      }
      if (e.key === 'Escape') exitEditMode();
      return; /* Arrow keys / Space navigate text, not slides */
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ':
        e.preventDefault(); goTo(current + 1); break;
      case 'ArrowLeft': case 'ArrowUp':
        e.preventDefault(); goTo(current - 1); break;
      case 's': case 'S':
        toggleScriptPanel(); break;
      case 'Escape':
        closeSidebar();
        if (scriptLocked) { scriptLocked = false; hideScriptPanel(); }
        break;
    }
  });

  /* ---------- Touch / Swipe ---------- */
  var touchX = 0;
  stage.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (editMode) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- Click half-screen navigation (left=prev / right=next) ---------- */
  stage.addEventListener('click', function (e) {
    if (editMode) return; /* contenteditable handles clicks */
    // インタラクティブ要素はスキップ
    var t = e.target;
    while (t && t !== stage) {
      var tag = t.tagName;
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' ||
          tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (t.classList && (t.classList.contains('s-prompt-copy') ||
          t.classList.contains('sidebar-toggle'))) return;
      t = t.parentElement;
    }
    // サイドバー開いているときはスキップ
    if (sidebar && sidebar.classList.contains('open')) return;
    if (e.clientX < window.innerWidth / 2) {
      goTo(current - 1);
    } else {
      goTo(current + 1);
    }
  });

  /* ---------- Mouse wheel navigation ---------- */
  var wheelLocked = false;
  document.addEventListener('wheel', function (e) {
    // サイドバー・スクリプトパネル内のスクロールは除外
    var t = e.target;
    while (t) {
      if (t === sidebar || t === scriptPanel) return;
      t = t.parentElement;
    }
    if (editMode) return; /* Don't navigate while editing */
    if (wheelLocked) return;
    if (e.deltaY > 0) { goTo(current + 1); }
    else if (e.deltaY < 0) { goTo(current - 1); }
    wheelLocked = true;
    setTimeout(function () { wheelLocked = false; }, 650);
  }, { passive: true });

  /* Auto-save slide edits on input (500 ms debounce) */
  stage.addEventListener('input', function () {
    if (!editMode) return;
    clearTimeout(editAutoSaveTimer);
    editAutoSaveTimer = setTimeout(function () {
      var slide = getSlide(current);
      if (slide) persistCurrentEdit(current, slide);
    }, 500);
  });

  /* ---------- Script hover ---------- */
  if (scriptTrigger) {
    scriptTrigger.addEventListener('mouseenter', function () {
      clearTimeout(scriptHideTimer);
      updateScriptPanel();
      openScriptPanel();
    });
  }
  if (scriptPanel) {
    scriptPanel.addEventListener('mouseleave', function () {
      if (!scriptLocked) {
        scriptHideTimer = setTimeout(hideScriptPanel, 200);
      }
    });
    scriptPanel.addEventListener('mouseenter', function () {
      clearTimeout(scriptHideTimer);
    });
  }

  /* ---------- Sidebar toggle ---------- */
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  /* ---------- Export: PDF ---------- */
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function () {
      for (var i = 0; i < totalSlides; i++) ensureRendered(i);
      requestAnimationFrame(function () { window.print(); });
    });
  }

  /* ---------- Export: PPTX (html2canvas visual capture) ---------- */
  if (pptxBtn) {
    pptxBtn.addEventListener('click', function () {
      if (typeof PptxGenJS === 'undefined') {
        alert('pptxgenjs が読み込まれていません'); return;
      }
      if (typeof html2canvas === 'undefined') {
        alert('html2canvas が読み込まれていません'); return;
      }

      showOverlay();

      /* Capture dimensions: 1600×900 (16:9) */
      var CAP_W = 1600, CAP_H = 900;

      var pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';

      var idx = 0;

      function captureNext() {
        if (idx >= totalSlides) {
          return pptx.writeFile({ fileName: (document.title || SLUG) + '.pptx' }).then(hideOverlay);
        }

        /* Build a fixed-size off-screen container */
        var wrap = document.createElement('div');
        wrap.style.cssText =
          'position:fixed;top:0;left:0;' +
          'width:' + CAP_W + 'px;height:' + CAP_H + 'px;' +
          'overflow:hidden;z-index:50;pointer-events:none;';
        wrap.style.setProperty('--tz', '1'); /* always export at default zoom */
        document.body.appendChild(wrap);

        /* Render the slide into the wrapper */
        var html = factories[idx]();
        var frag = document.createRange().createContextualFragment(html);
        var slideEl = frag.querySelector('.slide');
        var slideNotes = '';
        if (slideEl) {
          if (slideEdits[idx] !== undefined) slideEl.innerHTML = slideEdits[idx];
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

        /* Give browser one frame to paint, then capture */
        requestAnimationFrame(function () {
          setTimeout(function () {
            html2canvas(wrap, {
              scale: 1,
              useCORS: true,
              allowTaint: true,
              logging: false,
              width: CAP_W,
              height: CAP_H,
              windowWidth: CAP_W,
              windowHeight: CAP_H
            }).then(function (canvas) {
              document.body.removeChild(wrap);
              var imgData = canvas.toDataURL('image/jpeg', 0.92);
              var pSlide  = pptx.addSlide();
              pSlide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
              if (slideNotes) pSlide.addNotes(slideNotes);
              idx++;
              setProgress(idx / totalSlides);
              captureNext();
            }).catch(function () {
              document.body.removeChild(wrap);
              idx++;
              setProgress(idx / totalSlides);
              captureNext();
            });
          }, 60);
        });
      }

      captureNext();
    });
  }

  function showOverlay() { if (overlay) overlay.classList.add('show'); setProgress(0); }
  function hideOverlay() { if (overlay) overlay.classList.remove('show'); }
  function setProgress(v) { if (fillBar) fillBar.style.width = Math.round(v * 100) + '%'; }

  /* ---------- Fullscreen (triggered by presenter) ---------- */
  var fsPrompt = null;

  function showFullscreenPrompt() {
    if (fsPrompt) return;
    fsPrompt = document.createElement('div');
    fsPrompt.style.cssText = [
      'position:fixed', 'inset:0', 'background:rgba(0,0,0,.82)',
      'z-index:99999', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'cursor:pointer',
      'font-family:"Noto Sans JP",sans-serif'
    ].join(';');
    fsPrompt.innerHTML =
      '<div style="color:#fff;font-size:22px;font-weight:700;pointer-events:none">クリックして全画面</div>' +
      '<div style="color:rgba(255,255,255,.45);font-size:12px;margin-top:10px;pointer-events:none">Esc で終了</div>';
    fsPrompt.addEventListener('click', function () {
      document.documentElement.requestFullscreen().catch(function () {});
      fsPrompt.remove(); fsPrompt = null;
    });
    document.body.appendChild(fsPrompt);
  }

  function toggleAudienceFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      var p = document.documentElement.requestFullscreen();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { showFullscreenPrompt(); });
      }
    }
  }

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && fsPrompt) { fsPrompt.remove(); fsPrompt = null; }
  });

  /* ---------- Laser pointer (presenter → audience) ---------- */
  var laserDot = null;

  function showLaser(rx, ry) {
    var slide = getSlide(current);
    if (!slide) { hideLaser(); return; }
    var rect = slide.getBoundingClientRect();
    var x = rect.left + rx * rect.width;
    var y = rect.top  + ry * rect.height;
    if (!laserDot) {
      laserDot = document.createElement('div');
      laserDot.id = 'laser-dot';
      laserDot.style.cssText = [
        'position:fixed', 'border-radius:50%', 'pointer-events:none', 'z-index:9999',
        'width:18px', 'height:18px', 'transform:translate(-50%,-50%)',
        'background:radial-gradient(circle,rgba(255,0,0,.92) 20%,rgba(255,80,80,.5) 60%,transparent 100%)',
        'box-shadow:0 0 8px 3px rgba(255,0,0,.55)', 'display:none'
      ].join(';');
      document.body.appendChild(laserDot);
    }
    laserDot.style.left = Math.round(x) + 'px';
    laserDot.style.top  = Math.round(y) + 'px';
    laserDot.style.display = 'block';
  }

  function hideLaser() {
    if (laserDot) laserDot.style.display = 'none';
  }

  /* ---------- BroadcastChannel (presenter sync) ---------- */
  var bc = null;
  try { bc = new BroadcastChannel('slide-sync'); } catch (e) {}
  var bcRemote = false;
  if (bc) {
    bc.onmessage = function (e) {
      if (!e.data) return;
      if (e.data.type === 'goto') {
        bcRemote = true;
        goTo(e.data.index);
        bcRemote = false;
      }
      if (e.data.type === 'presenter-closed') {
        document.body.classList.remove('presenter-active');
      }
      if (e.data.type === 'sidebar-open')  { openSidebar(); }
      if (e.data.type === 'sidebar-close') { closeSidebar(); }
      if (e.data.type === 'laser')            { showLaser(e.data.x, e.data.y); }
      if (e.data.type === 'laser-off')        { hideLaser(); }
      if (e.data.type === 'fullscreen-toggle') { toggleAudienceFullscreen(); }
    };
  }

  /* ---------- Zoom ---------- */
  var zoomLevel  = 1.0;
  var ZOOM_STEP  = 0.1;
  var ZOOM_MIN   = 0.6;
  var ZOOM_MAX   = 1.8;

  function applyZoom(z) {
    zoomLevel = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 10) / 10;
    document.documentElement.style.setProperty('--tz', zoomLevel);
    if (zoomDisplay) zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
    try { localStorage.setItem(ZOOM_KEY, zoomLevel); } catch (e) {}
  }

  if (zoomInBtn)    zoomInBtn.addEventListener('click',    function () { applyZoom(zoomLevel + ZOOM_STEP); });
  if (zoomOutBtn)   zoomOutBtn.addEventListener('click',   function () { applyZoom(zoomLevel - ZOOM_STEP); });
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', function () { applyZoom(1.0); });

  /* Ctrl+ホイールで拡大縮小 */
  document.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    applyZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  /* Ctrl +/- キー */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=' || e.key === ';')) {
      e.preventDefault(); applyZoom(zoomLevel + ZOOM_STEP);
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault(); applyZoom(zoomLevel - ZOOM_STEP);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault(); applyZoom(1.0);
    }
  });

  /* 前回のズームレベルを復元 */
  try {
    var saved = parseFloat(localStorage.getItem(ZOOM_KEY));
    if (!isNaN(saved) && saved !== 1.0) applyZoom(saved);
  } catch (e) {}

  function rgbToHex(rgb) {
    var m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return null;
    return [m[1], m[2], m[3]].map(function (v) {
      return ('0' + parseInt(v).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  /* ---------- Presenter Mode ---------- */
  var presenterBtn = document.querySelector('.presenter-btn');
  if (presenterBtn) {
    presenterBtn.addEventListener('click', function () {
      window.open('presenter.html#' + (current + 1), 'presenter',
        'width=1280,height=800,menubar=no,toolbar=no,location=no');
      document.body.classList.add('presenter-active');
    });
  }

  /* ---------- Edit Mode ---------- */

  function persistCurrentEdit(index, slide) {
    var newHtml = slide.innerHTML;
    if (newHtml !== slideEdits[index]) {
      if (!undoStack[index]) undoStack[index] = [];
      undoStack[index].push(slideEdits[index] !== undefined ? slideEdits[index] : null);
      if (undoStack[index].length > 20) undoStack[index].shift();
    }
    slideEdits[index] = newHtml;
    try { localStorage.setItem(EDITS_KEY, JSON.stringify(slideEdits)); } catch (e) {}
    showEtSaved('保存済');
  }

  function showEtSaved(msg) {
    if (!etSaved) return;
    etSaved.textContent = msg || '保存済';
    etSaved.classList.add('show');
    clearTimeout(etSavedTimer);
    etSavedTimer = setTimeout(function () { etSaved.classList.remove('show'); }, 1800);
  }

  function enterEditMode() {
    /* Snapshot current state so discard can restore */
    editModeSnapshots = {};
    editModeSnapshotEdits = JSON.parse(JSON.stringify(slideEdits));
    rendered.forEach(function (i) {
      var s = getSlide(i);
      if (s) editModeSnapshots[i] = s.innerHTML;
    });
    undoStack = {};
    editMode = true;
    document.body.classList.add('edit-mode');
    if (editModeBtn) { editModeBtn.classList.add('active'); editModeBtn.textContent = '保存'; }
    if (editToolbar) editToolbar.classList.add('show');
    showDesignPanel();
    var slide = getSlide(current);
    if (slide) {
      document.execCommand('styleWithCSS', false, true);
      slide.contentEditable = 'true';
      slide.focus();
    }
  }

  function discardEdit() {
    dpDeselectEl();
    hideDesignPanel();
    var slide = getSlide(current);
    if (slide) { slide.removeAttribute('contentEditable'); slide.blur(); }
    /* Restore all snapshotted slides */
    Object.keys(editModeSnapshots).forEach(function (i) {
      var idx = parseInt(i, 10);
      var s = getSlide(idx);
      if (s) { s.innerHTML = editModeSnapshots[idx]; dpRestoreElements(s); }
    });
    slideEdits = JSON.parse(JSON.stringify(editModeSnapshotEdits));
    try { localStorage.setItem(EDITS_KEY, JSON.stringify(slideEdits)); } catch (e) {}
    undoStack = {};
    editMode = false;
    document.body.classList.remove('edit-mode');
    if (editModeBtn) { editModeBtn.classList.remove('active'); editModeBtn.textContent = '✏️ 編集'; }
    if (editToolbar) editToolbar.classList.remove('show');
    showEtSaved('編集を破棄しました');
  }

  function exitEditMode() {
    dpDeselectEl();
    hideDesignPanel();
    var slide = getSlide(current);
    if (slide && slide.contentEditable === 'true') {
      slide.removeAttribute('contentEditable');
      slide.blur();
      persistCurrentEdit(current, slide);
    }
    editMode = false;
    document.body.classList.remove('edit-mode');
    if (editModeBtn) { editModeBtn.classList.remove('active'); editModeBtn.textContent = '✏️ 編集'; }
    if (editToolbar) editToolbar.classList.remove('show');
  }

  if (editModeBtn) {
    editModeBtn.addEventListener('click', function () {
      editMode ? exitEditMode() : enterEditMode();
    });
  }

  /* Save selection before toolbar steals focus */
  if (editToolbar) {
    editToolbar.addEventListener('mousedown', function () {
      var sel = window.getSelection();
      if (sel && sel.rangeCount > 0) etColorSavedRange = sel.getRangeAt(0).cloneRange();
    });
  }

  function execEdit(cmd) {
    var slide = getSlide(current);
    if (slide) slide.focus();
    document.execCommand(cmd);
  }

  if (etBold)      etBold.addEventListener('mousedown',      function (e) { e.preventDefault(); execEdit('bold'); });
  if (etItalic)    etItalic.addEventListener('mousedown',    function (e) { e.preventDefault(); execEdit('italic'); });
  if (etUnderline) etUnderline.addEventListener('mousedown', function (e) { e.preventDefault(); execEdit('underline'); });

  if (etColor) {
    etColor.addEventListener('input', function () {
      if (etColorSavedRange) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(etColorSavedRange);
      }
      document.execCommand('foreColor', false, etColor.value);
    });
  }

  if (etResetSlide) {
    etResetSlide.addEventListener('click', function () {
      if (!confirm('このスライドの編集を元に戻しますか？')) return;
      delete slideEdits[current];
      try { localStorage.setItem(EDITS_KEY, JSON.stringify(slideEdits)); } catch (e) {}
      var slide = getSlide(current);
      if (!slide) return;
      var origFrag = document.createRange().createContextualFragment(factories[current]());
      var origEl   = origFrag.querySelector('.slide');
      if (origEl) slide.innerHTML = origEl.innerHTML;
      if (editMode) slide.contentEditable = 'true';
      showEtSaved('リセット済');
    });
  }

  /* =====================================================
     DESIGN PANEL  (Canva-like editor)
     ===================================================== */

  var dpPanel    = document.getElementById('design-panel');
  var dpBody     = document.getElementById('dp-body');
  var dpTabBtns  = dpPanel ? dpPanel.querySelectorAll('.dp-tab') : [];
  var dpTabProps = document.getElementById('dp-tab-props');

  var dpSelEl  = null;   /* currently selected dp-el */
  var dpSelBox = null;   /* selection-box overlay */

  /* ── Panel show/hide ── */
  function showDesignPanel() {
    if (!dpPanel) return;
    dpPanel.classList.add('body-open');
    document.body.classList.add('dp-open');
    dpActivateTab('elements');
  }

  function hideDesignPanel() {
    if (!dpPanel) return;
    dpPanel.classList.remove('body-open');
    document.body.classList.remove('dp-open');
    dpTabBtns.forEach(function (b) { b.classList.remove('active'); });
  }

  /* ── Tab switching ── */
  function dpActivateTab(name) {
    if (!dpBody) return;
    dpBody.querySelectorAll('.dp-panel').forEach(function (p) { p.style.display = 'none'; });
    var target = document.getElementById('dp-' + name);
    if (target) target.style.display = '';
    dpTabBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    dpPanel.classList.add('body-open');
    document.body.classList.add('dp-open');
  }

  dpTabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = this.dataset.tab;
      if (this.classList.contains('active') && dpPanel.classList.contains('body-open')) {
        dpPanel.classList.remove('body-open');
        document.body.classList.remove('dp-open');
        dpTabBtns.forEach(function (b) { b.classList.remove('active'); });
      } else {
        dpActivateTab(t);
      }
    });
  });

  /* ── Helpers ── */
  function dpSlideRect() {
    var sl = getSlide(current);
    return sl ? sl.getBoundingClientRect() : null;
  }

  function dpColorVal(cssColor) {
    /* Convert rgb(r,g,b) → #rrggbb */
    var m = (cssColor || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return null;
    return '#' + [m[1], m[2], m[3]].map(function (v) {
      return ('0' + parseInt(v).toString(16)).slice(-2);
    }).join('');
  }

  /* ── Bidirectional sync: color picker ↔ hex text input ── */
  function dpWireHexInput(colorInput, hexInput) {
    if (!colorInput || !hexInput) return;
    hexInput.value = colorInput.value.toUpperCase();
    colorInput.addEventListener('input', function () {
      hexInput.value = this.value.toUpperCase();
    });
    hexInput.addEventListener('input', function () {
      var v = this.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
        colorInput.value = v.toLowerCase();
        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  /* ── Convert a native (Kai-placed) slide element to draggable dp-el ── */
  function dpConvertNativeEl(el, slide) {
    if (el.classList.contains('dp-el')) return;
    var sr = slide.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    el.dataset.dpNative = '1';
    el.classList.add('dp-el');
    if (el.textContent.trim()) el.classList.add('dp-el-text');
    el.style.position = 'absolute';
    el.style.left  = (er.left - sr.left) + 'px';
    el.style.top   = (er.top  - sr.top)  + 'px';
    el.style.width = er.width + 'px';
    el.setAttribute('contenteditable', 'false');
    delete el.dataset.dpDrag;
    dpMakeDraggable(el);
  }

  /* ── Insert shape ── */
  var DP_SHAPE_FILL = '#6F911D';
  var DP_SHAPE_STROKE = 'none';
  var DP_SHAPE_SW = 0;

  function dpShapeSVG(type, fill, stroke, sw) {
    var f = fill || DP_SHAPE_FILL;
    var s = (sw > 0) ? (stroke || '#333') : 'none';
    var w = sw || 0;
    var inner = '';
    if (type === 'rect')
      inner = '<rect x="1" y="1" width="98" height="98" rx="0" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    else if (type === 'roundrect')
      inner = '<rect x="1" y="1" width="98" height="98" rx="14" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    else if (type === 'circle')
      inner = '<ellipse cx="50" cy="50" rx="49" ry="49" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    else if (type === 'triangle')
      inner = '<polygon points="50,2 98,97 2,97" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    else if (type === 'line')
      inner = '<line x1="0" y1="50" x2="100" y2="50" stroke="' + f + '" stroke-width="6" stroke-linecap="round"/>';
    else if (type === 'arrow')
      inner = '<line x1="2" y1="50" x2="78" y2="50" stroke="' + f + '" stroke-width="6" stroke-linecap="round"/>' +
              '<polyline points="62,28 84,50 62,72" fill="none" stroke="' + f + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (type === 'star')
      inner = '<polygon points="50,2 61,35 97,35 68,57 79,93 50,72 21,93 32,57 3,35 39,35" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    else if (type === 'speech')
      inner = '<path d="M5,4 H95 Q96,4 96,5 V68 Q96,69 95,69 H60 L50,95 L46,69 H5 Q4,69 4,68 V5 Q4,4 5,4 Z" fill="' + f + '" stroke="' + s + '" stroke-width="' + w + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">' + inner + '</svg>';
  }

  function dpInsertShape(type) {
    var slide = getSlide(current);
    if (!slide) return;
    var sr = slide.getBoundingClientRect();
    var isLine = (type === 'line' || type === 'arrow');

    var el = document.createElement('div');
    el.className = 'dp-el dp-el-shape dp-shape-' + type;
    el.setAttribute('contenteditable', 'false');
    el.style.left   = Math.round(sr.width  * 0.38) + 'px';
    el.style.top    = Math.round(sr.height * 0.35) + 'px';
    el.style.width  = Math.round(sr.width  * 0.22) + 'px';
    el.style.height = isLine ? Math.round(sr.height * 0.04) + 'px'
                              : Math.round(sr.height * 0.22) + 'px';
    el.dataset.shapeType = type;
    el.innerHTML = dpShapeSVG(type, DP_SHAPE_FILL, DP_SHAPE_STROKE, DP_SHAPE_SW);

    dpMakeDraggable(el);
    slide.appendChild(el);
    persistCurrentEdit(current, slide);
    dpSelectEl(el);
  }

  /* ── Insert text box ── */
  function dpInsertText(fs, fw) {
    var slide = getSlide(current);
    if (!slide) return;
    var sr = slide.getBoundingClientRect();

    var el = document.createElement('div');
    el.className = 'dp-el dp-el-text';
    el.setAttribute('contenteditable', 'false');
    el.style.left       = Math.round(sr.width  * 0.18) + 'px';
    el.style.top        = Math.round(sr.height * 0.38) + 'px';
    el.style.width      = Math.round(sr.width  * 0.64) + 'px';
    el.style.fontSize   = fs + 'px';
    el.style.fontWeight = fw || '700';
    el.style.color      = '#333333';
    el.style.textAlign  = 'left';
    el.style.lineHeight = '1.35';
    el.textContent      = 'テキストを入力';

    dpMakeDraggable(el);
    slide.appendChild(el);
    persistCurrentEdit(current, slide);
    dpSelectEl(el);

    /* Auto-enter inline edit */
    setTimeout(function () {
      el.setAttribute('contenteditable', 'true');
      el.focus();
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 60);
  }

  /* ── Insert image ── */
  function dpInsertImage(file) {
    var slide = getSlide(current);
    if (!slide) return;
    var sr = slide.getBoundingClientRect();

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = document.createElement('img');
      img.className = 'dp-el dp-el-image';
      img.setAttribute('contenteditable', 'false');
      img.src          = e.target.result;
      img.draggable    = false;
      img.style.left   = Math.round(sr.width  * 0.20) + 'px';
      img.style.top    = Math.round(sr.height * 0.18) + 'px';
      img.style.width  = Math.round(sr.width  * 0.42) + 'px';
      img.style.height = 'auto';
      img.style.maxWidth = '80%';
      img.style.objectFit = 'contain';

      dpMakeDraggable(img);
      slide.appendChild(img);
      persistCurrentEdit(current, slide);
      dpSelectEl(img);
    };
    reader.readAsDataURL(file);
  }

  /* ── Drag to move ── */
  function dpMakeDraggable(el) {
    if (el.dataset.dpDrag) return; /* already attached */
    el.dataset.dpDrag = '1';
    var pending = false, moved = false, ox = 0, oy = 0, sl = 0, st = 0;

    el.addEventListener('mousedown', function (e) {
      if (!editMode) return;
      /* Allow text editing on text boxes (via dblclick) */
      if (el.getAttribute('contenteditable') === 'true') return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      dpSelectEl(el);
      pending = true;
      moved = false;
      ox = e.clientX; oy = e.clientY;

      /* Convert any % position to px */
      var sr = dpSlideRect();
      sl = el.style.left.endsWith('%')
        ? parseFloat(el.style.left) / 100 * sr.width
        : parseFloat(el.style.left) || 0;
      st = el.style.top.endsWith('%')
        ? parseFloat(el.style.top) / 100 * sr.height
        : parseFloat(el.style.top) || 0;

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    function onMove(e) {
      if (!pending) return;
      if (!moved) {
        if (Math.abs(e.clientX - ox) < 5 && Math.abs(e.clientY - oy) < 5) return;
        moved = true;
      }
      el.style.left = (sl + e.clientX - ox) + 'px';
      el.style.top  = (st + e.clientY - oy) + 'px';
      dpUpdateSelBox();
      dpSyncPosSize();
    }

    function onUp() {
      var wasMoved = moved;
      pending = false;
      moved = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      if (wasMoved) {
        var slide = getSlide(current);
        if (slide) persistCurrentEdit(current, slide);
      }
    }
  }

  /* ── Selection box ── */
  function dpSelectEl(el) {
    dpDeselectEl();
    if (!el) return;
    dpSelEl = el;
    el.classList.add('dp-selected');

    var slide = getSlide(current);
    dpSelBox = document.createElement('div');
    dpSelBox.className = 'dp-sel-box';

    ['nw','n','ne','e','se','s','sw','w'].forEach(function (dir) {
      var h = document.createElement('div');
      h.className = 'dp-sel-handle dp-sel-' + dir;
      h.dataset.dir = dir;
      dpSelBox.appendChild(h);
      dpInitResizeHandle(h, el);
    });

    slide.appendChild(dpSelBox);
    dpUpdateSelBox();

    /* Show props tab */
    if (dpTabProps) dpTabProps.style.display = '';
    dpActivateTab('props');
    dpRefreshProps();
  }

  function dpDeselectEl() {
    if (dpSelEl) {
      dpSelEl.classList.remove('dp-selected');
      if (dpSelEl.getAttribute('contenteditable') === 'true') {
        dpSelEl.setAttribute('contenteditable', 'false');
        var slide = getSlide(current);
        if (slide) persistCurrentEdit(current, slide);
      }
      dpSelEl = null;
    }
    if (dpSelBox) { dpSelBox.remove(); dpSelBox = null; }
    if (dpTabProps) dpTabProps.style.display = 'none';
  }

  function dpUpdateSelBox() {
    if (!dpSelBox || !dpSelEl) return;
    var slide = getSlide(current);
    var sr    = slide.getBoundingClientRect();
    var er    = dpSelEl.getBoundingClientRect();
    dpSelBox.style.left   = (er.left - sr.left) + 'px';
    dpSelBox.style.top    = (er.top  - sr.top)  + 'px';
    dpSelBox.style.width  = er.width  + 'px';
    dpSelBox.style.height = er.height + 'px';
  }

  /* ── Resize handles ── */
  function dpInitResizeHandle(handle, el) {
    var dragging = false, start = {};

    handle.addEventListener('mousedown', function (e) {
      if (!editMode) return;
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      var slide = getSlide(current);
      var sr    = slide.getBoundingClientRect();
      var er    = el.getBoundingClientRect();
      start = {
        mx: e.clientX, my: e.clientY,
        l: er.left - sr.left,
        t: er.top  - sr.top,
        w: er.width, h: er.height
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    function onMove(e) {
      if (!dragging) return;
      var dir = handle.dataset.dir;
      var dx = e.clientX - start.mx;
      var dy = e.clientY - start.my;
      var l = start.l, t = start.t, w = start.w, h = start.h;

      if (dir === 'e' || dir === 'ne' || dir === 'se')  w = Math.max(10, start.w + dx);
      if (dir === 'w' || dir === 'nw' || dir === 'sw') { w = Math.max(10, start.w - dx); l = start.l + start.w - w; }
      if (dir === 's' || dir === 'se' || dir === 'sw')  h = Math.max(10, start.h + dy);
      if (dir === 'n' || dir === 'ne' || dir === 'nw') { h = Math.max(10, start.h - dy); t = start.t + start.h - h; }

      el.style.left = l + 'px'; el.style.top  = t + 'px';
      el.style.width = w + 'px'; el.style.height = h + 'px';
      dpUpdateSelBox();
      dpSyncPosSize();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      var slide = getSlide(current);
      if (slide) persistCurrentEdit(current, slide);
    }
  }

  /* ── Properties panel ── */
  function dpRefreshProps() {
    if (!dpSelEl) return;
    var isText  = dpSelEl.classList.contains('dp-el-text');
    var isShape = dpSelEl.classList.contains('dp-el-shape');
    var tp = document.getElementById('dp-tp');
    var sp = document.getElementById('dp-sp');
    if (tp) tp.style.display = isText  ? '' : 'none';
    if (sp) sp.style.display = isShape ? '' : 'none';

    /* Text props */
    if (isText) {
      var fsi = document.getElementById('dp-fs');
      if (fsi) {
        var fsv = parseInt(dpSelEl.style.fontSize);
        if (isNaN(fsv)) fsv = Math.round(parseFloat(window.getComputedStyle(dpSelEl).fontSize)) || 24;
        fsi.value = fsv;
      }
      var tci = document.getElementById('dp-txt-color');
      if (tci) {
        var hex = dpColorVal(dpSelEl.style.color) || dpColorVal(window.getComputedStyle(dpSelEl).color);
        if (hex) {
          tci.value = hex;
          var tch = document.getElementById('dp-txt-color-hex');
          if (tch) tch.value = hex.toUpperCase();
        }
      }
    }

    /* Shape props */
    if (isShape) {
      var stype = dpSelEl.dataset.shapeType;
      var isLineShape = (stype === 'line' || stype === 'arrow');
      var fci = document.getElementById('dp-fill');
      if (fci) {
        var colorNode = isLineShape
          ? dpSelEl.querySelector('line')
          : dpSelEl.querySelector('[fill]');
        if (colorNode) {
          var colorVal = isLineShape
            ? colorNode.getAttribute('stroke')
            : colorNode.getAttribute('fill');
          if (colorVal && colorVal !== 'none') fci.value = colorVal;
        }
      }
      var swi = document.getElementById('dp-sw');
      var sci = document.getElementById('dp-stroke');
      var strokeNode = dpSelEl.querySelector('[stroke-width]');
      if (swi && strokeNode) swi.value = parseInt(strokeNode.getAttribute('stroke-width')) || 0;
      if (sci && strokeNode) {
        var sv = strokeNode.getAttribute('stroke');
        if (sv && sv !== 'none') sci.value = sv;
      }
      /* Hide border-radius for line/arrow/circle */
      var rdg = document.getElementById('dp-rg');
      if (rdg) rdg.style.display = (isLineShape || stype === 'circle') ? 'none' : '';
    }

    dpSyncPosSize();

    /* Opacity */
    var opi = document.getElementById('dp-op');
    var ovl = document.getElementById('dp-ov');
    var op  = parseFloat(dpSelEl.style.opacity);
    if (isNaN(op)) op = 1;
    if (opi) opi.value = op;
    if (ovl) ovl.textContent = Math.round(op * 100) + '%';
  }

  function dpSyncPosSize() {
    if (!dpSelEl) return;
    var slide = getSlide(current);
    if (!slide) return;
    var sr = slide.getBoundingClientRect();
    var er = dpSelEl.getBoundingClientRect();
    var px = document.getElementById('dp-px'); if (px) px.value = Math.round(er.left - sr.left);
    var py = document.getElementById('dp-py'); if (py) py.value = Math.round(er.top  - sr.top);
    var pw = document.getElementById('dp-pw'); if (pw) pw.value = Math.round(er.width);
    var ph = document.getElementById('dp-ph'); if (ph) ph.value = Math.round(er.height);
  }

  /* ── Wire-up properties controls ── */
  function dpInitProps() {
    /* Font size */
    var fsi = document.getElementById('dp-fs');
    var fsd = document.getElementById('dp-fs-dec');
    var fsi2= document.getElementById('dp-fs-inc');
    function dpSetFs(v) {
      if (!dpSelEl) return;
      dpSelEl.style.fontSize = v + 'px';
      if (fsi) fsi.value = v;
      persistCurrentEdit(current, getSlide(current));
    }
    if (fsi)  fsi.addEventListener('change', function () { dpSetFs(parseInt(this.value) || 24); });
    if (fsd)  fsd.addEventListener('click',  function () { dpSetFs(Math.max(6,  (parseInt(dpSelEl && dpSelEl.style.fontSize) || 24) - 2)); });
    if (fsi2) fsi2.addEventListener('click', function () { dpSetFs(Math.min(400,(parseInt(dpSelEl && dpSelEl.style.fontSize) || 24) + 2)); });

    /* B / I / U */
    ['bold','italic','underline'].forEach(function (cmd) {
      var btn = document.getElementById('dp-' + cmd.slice(0,1) + (cmd === 'bold' ? 'old' : cmd === 'italic' ? 'talic' : 'nderline'));
      /* id naming: dp-bold, dp-italic, dp-underline */
    });
    ['bold','italic','underline'].forEach(function (cmd) {
      var id = { bold:'dp-bold', italic:'dp-italic', underline:'dp-underline' }[cmd];
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        if (!dpSelEl || !dpSelEl.classList.contains('dp-el-text')) return;
        dpSelEl.setAttribute('contenteditable', 'true');
        dpSelEl.focus();
        var range = document.createRange();
        range.selectNodeContents(dpSelEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand(cmd);
        sel.removeAllRanges();
        dpSelEl.setAttribute('contenteditable', 'false');
        persistCurrentEdit(current, getSlide(current));
      });
    });

    /* Alignment */
    ['l','c','r'].forEach(function (a) {
      var btn = document.getElementById('dp-al-' + a);
      var map = { l: 'left', c: 'center', r: 'right' };
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (!dpSelEl) return;
        dpSelEl.style.textAlign = map[a];
        persistCurrentEdit(current, getSlide(current));
      });
    });

    /* Text color */
    var tci = document.getElementById('dp-txt-color');
    if (tci) tci.addEventListener('input', function () {
      if (!dpSelEl) return;
      if (dpSelEl.classList.contains('dp-el-text')) {
        dpSelEl.setAttribute('contenteditable', 'true');
        dpSelEl.focus();
        var range = document.createRange();
        range.selectNodeContents(dpSelEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('foreColor', false, this.value);
        sel.removeAllRanges();
        dpSelEl.setAttribute('contenteditable', 'false');
      } else {
        dpSelEl.style.color = this.value;
      }
      persistCurrentEdit(current, getSlide(current));
    });

    /* Fill (shape SVG) */
    var fci = document.getElementById('dp-fill');
    if (fci) fci.addEventListener('input', function () {
      if (!dpSelEl) return;
      var stype = dpSelEl.dataset.shapeType;
      var isLineShape = (stype === 'line' || stype === 'arrow');
      if (isLineShape) {
        /* Line/arrow: color = stroke */
        dpSelEl.querySelectorAll('line,polyline').forEach(function (n) {
          n.setAttribute('stroke', fci.value);
        });
      } else {
        /* Other shapes: color = fill */
        dpSelEl.querySelectorAll('[fill]').forEach(function (n) {
          if (n.getAttribute('fill') !== 'none') n.setAttribute('fill', fci.value);
        });
      }
      persistCurrentEdit(current, getSlide(current));
    });

    /* Stroke color + width */
    var sci = document.getElementById('dp-stroke');
    var swi = document.getElementById('dp-sw');
    function dpApplyStroke() {
      if (!dpSelEl) return;
      var sw = parseInt(swi ? swi.value : 0) || 0;
      var sc = sci ? sci.value : '#333333';
      dpSelEl.querySelectorAll('rect,ellipse,polygon,path,polyline').forEach(function (node) {
        node.setAttribute('stroke', sw > 0 ? sc : 'none');
        node.setAttribute('stroke-width', sw);
      });
      persistCurrentEdit(current, getSlide(current));
    }
    if (sci) sci.addEventListener('input', dpApplyStroke);
    if (swi) swi.addEventListener('change', dpApplyStroke);

    /* Border radius (shape div) */
    var rdi = document.getElementById('dp-radius');
    var rdv = document.getElementById('dp-rv');
    var rdg = document.getElementById('dp-rg');
    if (rdi) rdi.addEventListener('input', function () {
      if (!dpSelEl) return;
      var v = this.value;
      if (rdv) rdv.textContent = v + '%';
      dpSelEl.style.borderRadius = v + '%';
      /* For rect/roundrect: also update the rx on SVG rect */
      var rect = dpSelEl.querySelector('rect');
      if (rect) rect.setAttribute('rx', Math.round(parseInt(v) / 100 * 50));
      persistCurrentEdit(current, getSlide(current));
    });

    /* Opacity */
    var opi = document.getElementById('dp-op');
    var ovl = document.getElementById('dp-ov');
    if (opi) opi.addEventListener('input', function () {
      if (!dpSelEl) return;
      dpSelEl.style.opacity = this.value;
      if (ovl) ovl.textContent = Math.round(this.value * 100) + '%';
      persistCurrentEdit(current, getSlide(current));
    });

    /* Position / size inputs */
    ['px','py','pw','ph'].forEach(function (id) {
      var inp = document.getElementById('dp-' + id);
      if (!inp) return;
      inp.addEventListener('change', function () {
        if (!dpSelEl) return;
        var v = parseInt(this.value);
        if (isNaN(v)) return;
        if (id === 'px') dpSelEl.style.left   = v + 'px';
        if (id === 'py') dpSelEl.style.top    = v + 'px';
        if (id === 'pw') dpSelEl.style.width  = v + 'px';
        if (id === 'ph') dpSelEl.style.height = v + 'px';
        dpUpdateSelBox();
        persistCurrentEdit(current, getSlide(current));
      });
    });

    /* Z-order */
    var zff = document.getElementById('dp-zff');
    var zf  = document.getElementById('dp-zf');
    var zb  = document.getElementById('dp-zb');
    var zbb = document.getElementById('dp-zbb');
    if (zff) zff.addEventListener('click', function () { if (dpSelEl) { dpSelEl.style.zIndex = 9000; persistCurrentEdit(current, getSlide(current)); } });
    if (zf)  zf.addEventListener('click',  function () { if (dpSelEl) { dpSelEl.style.zIndex = (parseInt(dpSelEl.style.zIndex) || 10) + 1; persistCurrentEdit(current, getSlide(current)); } });
    if (zb)  zb.addEventListener('click',  function () { if (dpSelEl) { dpSelEl.style.zIndex = Math.max(1, (parseInt(dpSelEl.style.zIndex) || 10) - 1); persistCurrentEdit(current, getSlide(current)); } });
    if (zbb) zbb.addEventListener('click', function () { if (dpSelEl) { dpSelEl.style.zIndex = 1; persistCurrentEdit(current, getSlide(current)); } });

    /* Delete */
    var delBtn = document.getElementById('dp-del');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (!dpSelEl) return;
      var slide = getSlide(current);
      dpSelEl.remove();
      dpDeselectEl();
      if (slide) persistCurrentEdit(current, slide);
    });

    /* Background swatches */
    if (dpPanel) {
      dpPanel.querySelectorAll('.dp-swatch').forEach(function (sw) {
        sw.addEventListener('click', function () {
          var slide = getSlide(current);
          if (!slide) return;
          slide.style.background = this.dataset.bg;
          var bgci = document.getElementById('dp-bg-color');
          if (bgci) bgci.value = this.dataset.bg;
          persistCurrentEdit(current, slide);
        });
      });
    }

    var bgci = document.getElementById('dp-bg-color');
    if (bgci) bgci.addEventListener('input', function () {
      var slide = getSlide(current);
      if (!slide) return;
      slide.style.background = this.value;
      persistCurrentEdit(current, slide);
    });

    var bgReset = document.getElementById('dp-bg-reset');
    if (bgReset) bgReset.addEventListener('click', function () {
      var slide = getSlide(current);
      if (!slide) return;
      slide.style.background = '';
      persistCurrentEdit(current, slide);
    });

    /* Image upload */
    var imgInput = document.getElementById('dp-img-input');
    if (imgInput) imgInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        dpInsertImage(this.files[0]);
        this.value = '';
      }
    });

    /* Shape buttons */
    document.querySelectorAll('.dp-shape-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!editMode) return;
        dpInsertShape(this.dataset.shape);
      });
    });

    /* Text preset buttons */
    document.querySelectorAll('.dp-text-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!editMode) return;
        dpInsertText(parseInt(this.dataset.fs), this.dataset.fw);
      });
    });

    /* ── Hex color input sync ── */
    dpWireHexInput(document.getElementById('dp-txt-color'), document.getElementById('dp-txt-color-hex'));
    dpWireHexInput(document.getElementById('dp-fill'),      document.getElementById('dp-fill-hex'));
    dpWireHexInput(document.getElementById('dp-stroke'),    document.getElementById('dp-stroke-hex'));
    dpWireHexInput(document.getElementById('dp-bg-color'),  document.getElementById('dp-bg-color-hex'));
    dpWireHexInput(etColor, document.getElementById('et-color-hex'));

    /* ── Undo ── */
    if (etUndo) {
      etUndo.addEventListener('click', function () {
        var stack = undoStack[current];
        if (!stack || !stack.length) { showEtSaved('これ以上戻れません'); return; }
        var prevHtml = stack.pop();
        var slide = getSlide(current);
        if (!slide) return;
        dpDeselectEl();
        if (prevHtml === null || prevHtml === undefined) {
          var origFrag = document.createRange().createContextualFragment(factories[current]());
          var origEl   = origFrag.querySelector('.slide');
          if (origEl) slide.innerHTML = origEl.innerHTML;
          delete slideEdits[current];
        } else {
          slide.innerHTML = prevHtml;
          slideEdits[current] = prevHtml;
        }
        dpRestoreElements(slide);
        try { localStorage.setItem(EDITS_KEY, JSON.stringify(slideEdits)); } catch (e) {}
        showEtSaved('元に戻しました');
      });
    }

    /* ── Discard ── */
    if (etDiscard) {
      etDiscard.addEventListener('click', discardEdit);
    }
  }

  /* ── Click: dp-el → makeDraggable; native slide el → convert+select; elsewhere → deselect ── */
  stage.addEventListener('mousedown', function (e) {
    if (!editMode) return;
    /* Check if target is inside a dp-el or handle */
    var check = e.target;
    while (check && check !== stage) {
      if (check.classList && check.classList.contains('dp-el')) return; /* makeDraggable handles */
      if (check.classList && check.classList.contains('dp-sel-handle')) return;
      check = check.parentElement;
    }
    /* Check if target is inside the current slide */
    var slide = getSlide(current);
    if (!slide || !slide.contains(e.target) || e.target === slide) { dpDeselectEl(); return; }
    /* Find the topmost child of slide containing the target */
    var nativeEl = e.target;
    while (nativeEl && nativeEl.parentElement !== slide) {
      nativeEl = nativeEl.parentElement;
    }
    if (!nativeEl || nativeEl.classList.contains('dp-sel-box')) { dpDeselectEl(); return; }
    /* Convert native element to dp-el, then re-dispatch so makeDraggable handles drag */
    if (!nativeEl.classList.contains('dp-el')) {
      e.preventDefault();
      e.stopPropagation();
      dpConvertNativeEl(nativeEl, slide);
      nativeEl.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true,
        clientX: e.clientX, clientY: e.clientY,
        button: e.button, buttons: e.buttons
      }));
    }
  }, true);

  /* ── Double-click text box → inline edit ── */
  stage.addEventListener('dblclick', function (e) {
    if (!editMode) return;
    var el = e.target;
    while (el && el !== stage) {
      if (el.classList && el.classList.contains('dp-el-text')) {
        e.stopPropagation();
        el.setAttribute('contenteditable', 'true');
        el.focus();
        return;
      }
      el = el.parentElement;
    }
  });

  /* ── Text box blur → save ── */
  stage.addEventListener('blur', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('dp-el-text') &&
        el.getAttribute('contenteditable') === 'true') {
      el.setAttribute('contenteditable', 'false');
      persistCurrentEdit(current, getSlide(current));
    }
  }, true);

  /* ── Re-attach drag/select to dp-el restored from localStorage ── */
  function dpRestoreElements(slide) {
    if (!slide) return;
    slide.querySelectorAll('.dp-el').forEach(function (el) {
      el.setAttribute('contenteditable', 'false');
      delete el.dataset.dpDrag; /* clear serialized flag so handler re-attaches */
      dpMakeDraggable(el);
    });
  }

  /* Patch ensureRendered to re-attach after restore */
  var _origEnsureRendered = ensureRendered;
  /* (ensureRendered already defined above — wrap via override) */
  /* We call dpRestoreElements at init instead */

  /* ---------- Init ---------- */
  dpInitProps();
  buildSectionNav();
  buildSidebar();
  current = parseHash();
  ensureRendered(current);
  ensureRendered(current + 1);
  var first = getSlide(current);
  if (first) first.classList.add('active');
  updateSectionNav();
  updateSidebar();
  updateScriptPanel();
  window.addEventListener('popstate', function () { goTo(parseHash()); });
})();
