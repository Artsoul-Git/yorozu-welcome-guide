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

  /* ---------- Slide edits (localStorage) ---------- */
  var slideEdits = {};
  try { slideEdits = JSON.parse(localStorage.getItem(EDITS_KEY) || '{}'); } catch (e) {}
  var editMode        = false;
  var editAutoSaveTimer = null;
  var etSavedTimer    = null;
  var etColorSavedRange = null;

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
  }

  function getSlide(index) {
    return stage.querySelector('.slide[data-index="' + index + '"]');
  }

  /* ---------- Navigate ---------- */
  function goTo(index) {
    if (index < 0 || index >= totalSlides) return;
    /* In edit mode: save + deactivate current slide before switching */
    if (editMode) {
      var leaving = getSlide(current);
      if (leaving && leaving.contentEditable === 'true') {
        leaving.removeAttribute('contentEditable');
        persistCurrentEdit(current, leaving);
      }
    }
    ensureRendered(index);
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
    slideEdits[index] = slide.innerHTML;
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
    editMode = true;
    document.body.classList.add('edit-mode');
    if (editModeBtn) { editModeBtn.classList.add('active'); editModeBtn.textContent = '保存'; }
    if (editToolbar) editToolbar.classList.add('show');
    var slide = getSlide(current);
    if (slide) {
      document.execCommand('styleWithCSS', false, true);
      slide.contentEditable = 'true';
      slide.focus();
    }
  }

  function exitEditMode() {
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

  /* ---------- Init ---------- */
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
