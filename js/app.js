/* app.js — JP-Type 日语打字背词 */
(function () {
  'use strict';

  var K = window.Kana;

  // ---------------------------------------------------------------- 常量
  var LEVELS = [
    { id: 'n1', label: 'N1', sub: '4044' },
    { id: 'n12', label: 'N1+N2', sub: '7257' },
    { id: 'n2', label: 'N2', sub: '3213' },
    { id: 'n3', label: 'N3', sub: '1814' },
    { id: 'n4', label: 'N4', sub: '756' },
    { id: 'n5', label: 'N5', sub: '805' }
  ];

  var MODES = [
    { id: 'study', label: '背词', tip: '看词记义' },
    { id: 'copy', label: '跟打', tip: '看词打读音' },
    { id: 'dictation', label: '听写', tip: '听音打读音' },
    { id: 'recall', label: '默写', tip: '看中文写读音' },
    { id: 'quiz', label: '辨认', tip: '选正确中文' }
  ];

  var FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'star', label: '★ 重点' },
    { id: 'star2', label: '★+ 重点/次重点' },
    { id: 'weak', label: '待复习' },
    { id: 'new', label: '没学过' }
  ];

  var LS_SET = 'jptype:set:v1';
  var LS_STAT = 'jptype:stat:v1';

  // ---------------------------------------------------------------- 状态
  var S = {
    level: 'n1',
    mode: 'copy',
    filter: 'all',
    round: [],
    idx: 0,
    done: 0,
    wrong: 0,
    cur: null,
    answered: false,
    showAnswer: false,
    settings: { roundSize: 20, autoNext: true, showKana: false, autoSpeak: false }
  };

  var stat = {};
  var cache = {};

  // ---------------------------------------------------------------- 工具
  function $(id) { return document.getElementById(id); }

  function loadSet() {
    try {
      var raw = localStorage.getItem(LS_SET);
      if (raw) Object.assign(S.settings, JSON.parse(raw));
    } catch (e) {}
  }
  function saveSet() {
    try { localStorage.setItem(LS_SET, JSON.stringify(S.settings)); } catch (e) {}
  }
  function loadStat() {
    try {
      var raw = localStorage.getItem(LS_STAT);
      if (raw) stat = JSON.parse(raw) || {};
    } catch (e) { stat = {}; }
  }
  var statTimer = null;
  function saveStat() {
    if (statTimer) clearTimeout(statTimer);
    statTimer = setTimeout(function () {
      try { localStorage.setItem(LS_STAT, JSON.stringify(stat)); } catch (e) {}
    }, 400);
  }
  function statOf(w) {
    var s = stat[w];
    return s ? { right: s[0], wrong: s[1], seen: s[2] } : { right: 0, wrong: 0, seen: 0 };
  }
  function bumpStat(w, ok) {
    var s = stat[w] || [0, 0, 0];
    s[2] += 1;
    if (ok) s[0] += 1; else s[1] += 1;
    stat[w] = s;
    saveStat();
  }

  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  // ---------------------------------------------------------------- 数据
  var rawCache = {};

  function fetchLevel(lv) {
    if (rawCache[lv]) return Promise.resolve(rawCache[lv]);
    var embedded = (window.JP_DATA && window.JP_DATA[lv]) || null;
    var p = embedded
      ? Promise.resolve(embedded)
      : fetch('data/' + lv + '.json', { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('加载失败 ' + r.status);
          return r.json();
        });
    return p.then(function (j) {
      var list = j.words.map(function (r) {
        return {
          word: r[0], reading: r[1], meaning: r[2], pos: r[3],
          accent: r[4], tags: r[5] || '', examples: r[6] || [], focus: r[7] || 0,
          key: lv + ':' + r[0], lv: lv
        };
      });
      rawCache[lv] = list;
      return list;
    });
  }

  // n12 = N1 与 N2 合并池（冲 N1 时补基础）
  function loadLevel(lv) {
    if (cache[lv]) return Promise.resolve(cache[lv]);
    var p = (lv === 'n12')
      ? Promise.all([fetchLevel('n1'), fetchLevel('n2')]).then(function (arr) {
          return arr[0].concat(arr[1]);
        })
      : fetchLevel(lv);
    return p.then(function (list) { cache[lv] = list; return list; });
  }

  function pool() {
    var list = cache[S.level] || [];
    var f = S.filter;
    return list.filter(function (w) {
      if (f === 'star') return w.focus === 3;
      if (f === 'star2') return w.focus >= 2;
      if (f === 'weak') {
        var s = statOf(w.key);
        return s.seen > 0 && s.wrong > 0 && s.wrong >= s.right;
      }
      if (f === 'new') return statOf(w.key).seen === 0;
      return true;
    });
  }

  function countFor(fid) {
    var list = cache[S.level];
    if (!list) return null;
    if (fid === 'all') return list.length;
    if (fid === 'star') return list.filter(function (w) { return w.focus === 3; }).length;
    if (fid === 'star2') return list.filter(function (w) { return w.focus >= 2; }).length;
    if (fid === 'weak') return list.filter(function (w) {
      var s = statOf(w.key); return s.seen > 0 && s.wrong > 0 && s.wrong >= s.right;
    }).length;
    if (fid === 'new') return list.filter(function (w) { return statOf(w.key).seen === 0; }).length;
    return null;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------------------------------------------------------------- 对齐比较
  function align(typed, target) { return K.align(typed, target); }

  // ---------------------------------------------------------------- 朗读
  var jaVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) {
      if (/ja[-_]JP/i.test(vs[i].lang)) { jaVoice = vs[i]; break; }
    }
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('此浏览器不支持朗读'); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.92;
      if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) { toast('朗读失败'); }
  }

  // ---------------------------------------------------------------- 渲染：导航
  function buildTabs() {
    var lv = $('levelTabs');
    lv.innerHTML = '';
    LEVELS.forEach(function (L) {
      var b = document.createElement('button');
      b.className = 'tab' + (S.level === L.id ? ' on' : '');
      b.innerHTML = L.label + '<small>' + L.sub + ' 词</small>';
      b.onclick = function () { switchLevel(L.id); };
      lv.appendChild(b);
    });

    var md = $('modeTabs');
    md.innerHTML = '';
    MODES.forEach(function (M) {
      var b = document.createElement('button');
      b.className = 'tab' + (S.mode === M.id ? ' on' : '');
      b.innerHTML = M.label + '<small>' + M.tip + '</small>';
      b.onclick = function () { S.mode = M.id; buildTabs(); startRound(); };
      md.appendChild(b);
    });

    var ch = $('filterChips');
    ch.innerHTML = '';
    FILTERS.forEach(function (F) {
      var b = document.createElement('button');
      b.className = 'chip' + (S.filter === F.id ? ' on' : '');
      var n = countFor(F.id);
      b.textContent = F.label + (n === null ? '' : ' ' + n);
      b.onclick = function () { S.filter = F.id; buildTabs(); startRound(); };
      ch.appendChild(b);
    });
  }

  function switchLevel(lv) {
    S.level = lv;
    buildTabs();
    renderLoading();
    loadLevel(lv).then(function () { buildTabs(); startRound(); }).catch(function (e) {
      toast('数据加载失败：' + e.message);
    });
  }

  function renderLoading() {
    $('wordLine').textContent = '加载中…';
    $('readingLine').textContent = '';
    $('meaningLine').textContent = '';
    $('cells').innerHTML = '';
    $('options').innerHTML = '';
    $('feedback').textContent = '';
  }

  // ---------------------------------------------------------------- 回合
  function startRound() {
    S.diag = false;
    S.diagTarget = null;
    if ($('btnDiag')) $('btnDiag').hidden = false;
    var p = pool();
    if (!p.length) {
      $('wordLine').textContent = '这个筛选下没有词';
      $('readingLine').textContent = '换个筛选条件试试';
      $('cells').innerHTML = '';
      $('options').innerHTML = '';
      return;
    }
    var size = Math.min(S.settings.roundSize, p.length);
    S.round = shuffle(p.slice()).slice(0, size);
    S.idx = 0;
    S.done = 0;
    S.wrong = 0;
    nextQuestion();
  }

  function nextQuestion() {
    if (S.idx >= S.round.length) { finishRound(); return; }
    S.cur = S.round[S.idx];
    S.answered = false;
    S.showAnswer = false;
    renderQuestion();
  }

  // ---------------------------------------------------------------- 摸底测试
  var DIAG_LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
  var DIAG_PER = 5;

  function startDiag() {
    S.diag = true;
    S.mode = 'copy';
    $('btnDiag').hidden = true;
    Promise.all(DIAG_LEVELS.map(fetchLevel)).then(function (arr) {
      var round = [];
      arr.forEach(function (list, i) {
        var stars = list.filter(function (w) { return w.focus >= 2; });
        var src = stars.length >= DIAG_PER ? stars : list;
        round = round.concat(shuffle(src.slice()).slice(0, DIAG_PER));
      });
      S.round = shuffle(round);
      S.idx = 0; S.done = 0; S.wrong = 0; S.diagRight = {};
      S.answered = false; S.showAnswer = false;
      buildTabs();
      nextQuestion();
      toast('摸底 ' + S.round.length + ' 词，看词打罗马字，答不出就跳过');
    }).catch(function (e) { toast('摸底加载失败：' + e.message); S.diag = false; });
  }

  function finishDiag() {
    var r = S.diagRight || {};
    var lines = [];
    var passed = null;
    DIAG_LEVELS.forEach(function (lv) {
      var c = r[lv] || { right: 0, total: 0 };
      var acc = c.total ? Math.round(c.right / c.total * 100) : 0;
      lines.push(lv.toUpperCase() + ' ' + c.right + '/' + c.total + ' (' + acc + '%)');
      if (c.total && acc >= 60) passed = lv;
    });
    var start;
    if (!passed) {
      start = 'n5';
    } else {
      var idx = DIAG_LEVELS.indexOf(passed);
      start = DIAG_LEVELS[Math.min(idx + 1, DIAG_LEVELS.length - 1)];
    }
    var overall = S.round.length ? Math.round(S.done / S.round.length * 100) : 0;
    $('wordLine').textContent = '摸底完成 · ' + overall + '%';
    $('readingLine').textContent = lines.join(' · ');
    $('meaningLine').textContent = '建议起点：' + start.toUpperCase() + '（★+ 重点/次重点）';
    $('metaLine').textContent = '';
    $('badges').innerHTML = '';
    $('cells').innerHTML = '';
    $('options').innerHTML = '';
    $('feedback').innerHTML = passed
      ? '从 <b>' + start.toUpperCase() + '</b> 开始，用「★+ 重点/次重点」筛选先过一遍高频词。'
      : '基础还不稳，从 <b>N5</b> 过一遍读音和假名手感，再往上走。';
    $('inputRow').style.display = 'none';
    $('btnNext').textContent = '去 ' + start.toUpperCase() + ' 开始';
    $('btnNext').disabled = false;
    S.diagTarget = start;
    $('btnHint').disabled = true;
    $('btnSkip').disabled = true;
    $('btnSpeak').disabled = true;
    updateProgress();
    updateStats();
  }

  function finishRound() {
    if (S.diag) { finishDiag(); return; }
    var n = S.round.length;
    var acc = n ? Math.round(S.done / n * 100) : 0;
    $('wordLine').textContent = '本轮完成';
    $('readingLine').textContent = n + ' 个词 · 一次答对 ' + S.done + ' · 正确率 ' + acc + '%';
    $('meaningLine').textContent = '';
    $('metaLine').textContent = '';
    $('badges').innerHTML = '';
    $('cells').innerHTML = '';
    $('options').innerHTML = '';
    $('feedback').innerHTML = '<b>继续加油。</b>可以再来一轮，或换级别/模式。';
    $('inputRow').style.display = 'none';
    $('btnNext').textContent = '再来一轮';
    $('btnNext').disabled = false;
    $('btnHint').disabled = true;
    $('btnSkip').disabled = true;
    $('btnSpeak').disabled = true;
    updateProgress();
    updateStats();
  }

  function renderQuestion() {
    var w = S.cur;
    var study = (S.mode === 'study');
    var hideWord = (S.mode === 'dictation' || S.mode === 'recall');
    var hideReading = (S.mode !== 'copy' && !study);
    var hideMeaning = (S.mode !== 'recall' && S.mode !== 'quiz' && !study);

    // badges
    var bd = $('badges');
    bd.innerHTML = '';
    function badge(txt, cls) {
      var b = document.createElement('span');
      b.className = 'badge ' + (cls || '');
      b.textContent = txt;
      bd.appendChild(b);
    }
    badge((w.lv || S.level).toUpperCase(), 'lv');
    if (w.focus === 3) badge('★ 重点', 'star3');
    else if (w.focus === 2) badge('☆ 次重点', 'star2');
    var tags = w.tags.split('/').filter(Boolean);
    tags.forEach(function (t) { badge(t, 'tag'); });

    // 词 / 读音 / 释义
    $('wordLine').className = 'word' + (hideWord ? ' hidden' : '');
    $('wordLine').textContent = w.word;

    $('readingLine').className = 'reading' + ((hideReading && !S.showAnswer) ? ' hidden' : '');
    $('readingLine').textContent = w.reading;

    $('metaLine').textContent = (w.pos || '') + (w.accent ? ' · 音调 ' + w.accent : '');

    $('meaningLine').className = 'meaning' + ((hideMeaning && !S.showAnswer) ? ' hidden' : '');
    $('meaningLine').textContent = w.meaning;

    // 输入 / 选项
    $('inputRow').style.display = (S.mode === 'quiz' || study) ? 'none' : 'flex';
    $('options').innerHTML = '';
    $('feedback').textContent = '';
    $('typed').value = '';
    $('typed').disabled = false;
    $('btnNext').textContent = '下一个';
    $('btnNext').disabled = true;
    $('btnHint').disabled = false;
    $('btnSkip').disabled = false;
    $('btnSpeak').disabled = false;

    // study 模式：隐藏打字的按钮条，改用 认识/不认识/发音 三键
    $('actions').hidden = study;
    $('studyBar').hidden = !study;

    if (study) {
      renderStudy();
    } else if (S.mode === 'quiz') {
      renderOptions();
    } else {
      renderCells(null);
      setTimeout(function () { $('typed').focus(); }, 60);
    }

    if (S.mode === 'dictation' || S.settings.autoSpeak) {
      setTimeout(function () { speak(w.reading); }, 120);
    }
    updateProgress();
    updateStats();
  }

  // 背词模式：词 + 读音 + 音调 + 释义 + 全部例句，无判分
  function renderStudy() {
    var w = S.cur;
    $('cells').innerHTML = '';
    var ex = '';
    if (w.examples && w.examples.length) {
      w.examples.slice(0, 3).forEach(function (e) {
        var ja = e[0] || '';
        var zh = e[1] || '';
        var fg = e[3] || '';
        ex += '<div class="ex-item"><div class="ex-ja">' + escapeHtml(ja) + '</div>' +
              (fg ? '<div class="ex-fg">' + escapeHtml(fg) + '</div>' : '') +
              (zh ? '<div class="ex-zh">' + escapeHtml(zh) + '</div>' : '') + '</div>';
      });
    }
    $('feedback').innerHTML =
      '<div class="study-acc">' + escapeHtml(w.accent ? '音调 ' + w.accent : '') + '</div>' + ex;
  }

  function renderCells(res) {
    var w = S.cur;
    var box = $('cells');
    box.innerHTML = '';
    var reading = w.reading;
    var reveal = (S.mode === 'copy') || S.showAnswer || S.answered ||
                 (S.settings.showKana && S.mode === 'dictation');
    for (var i = 0; i < reading.length; i++) {
      var c = document.createElement('span');
      c.className = 'cell';
      var ch = reading[i];
      var stt = res ? res.st[i] : 'pending';
      if (!reveal && stt !== 'ok') ch = '·';
      if (stt === 'ok') c.classList.add('ok');
      else if (stt === 'bad') c.classList.add('bad');
      else if (stt === 'skip') c.classList.add('ok');
      c.textContent = ch;
      if (res && i === res.badAt) c.classList.add('bad');
      box.appendChild(c);
    }
  }

  function renderOptions() {
    var w = S.cur;
    var list = cache[S.level] || [];
    var wrongs = [];
    var guard = 0;
    while (wrongs.length < 3 && guard < 400) {
      guard++;
      var cand = list[Math.floor(Math.random() * list.length)];
      if (!cand || cand.key === w.key) continue;
      if (cand.meaning === w.meaning) continue;
      if (wrongs.some(function (x) { return x.meaning === cand.meaning; })) continue;
      wrongs.push(cand);
    }
    var opts = wrongs.concat([w]).sort(function () { return Math.random() - 0.5; });
    var box = $('options');
    box.innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.textContent = o.meaning;
      b.onclick = function () { answerQuiz(b, o, w); };
      box.appendChild(b);
    });
  }

  function answerQuiz(btn, o, w) {
    if (S.answered) return;
    S.answered = true;
    var ok = (o.key === w.key);
    Array.prototype.forEach.call($('options').children, function (el) {
      el.disabled = true;
      if (el.textContent === w.meaning) el.classList.add('ok');
    });
    if (!ok) btn.classList.add('bad');
    settle(ok);
  }

  // ---------------------------------------------------------------- 作答
  function onType() {
    if (S.answered || S.mode === 'quiz' || S.mode === 'study' || !S.cur) return;
    var raw = $('typed').value;
    var kana = K.romajiToKana(raw);
    var res = align(kana, S.cur.reading);
    renderCells(res);
    if (res.okAll) {
      S.answered = true;
      $('typed').disabled = true;
      settle(true);
    }
  }

  function settle(ok) {
    var w = S.cur;
    bumpStat(w.key, ok);
    if (S.diag) {
      var r = S.diagRight[w.lv] || (S.diagRight[w.lv] = { right: 0, total: 0 });
      r.total += 1;
      if (ok) r.right += 1;
    }
    if (ok) {
      S.done += 1;
      if (S.settings.autoSpeak) speak(w.reading);
    } else {
      S.wrong += 1;
    }
    $('wordLine').className = 'word';
    $('readingLine').className = 'reading';
    $('meaningLine').className = 'meaning';
    if (S.mode !== 'quiz') renderCells(align(K.romajiToKana($('typed').value), w.reading));
    $('feedback').innerHTML = feedbackHtml(ok);
    $('btnNext').disabled = false;
    $('btnHint').disabled = true;
    updateStats();
    if (ok && S.settings.autoNext) {
      setTimeout(function () {
        if (S.answered) { S.idx++; nextQuestion(); }
      }, 520);
    } else {
      setTimeout(function () { $('btnNext').focus(); }, 80);
    }
  }

  // 背词模式：只记录「认识 / 不认识」，不判分，记完直接下一词
  function markStudy(ok) {
    var w = S.cur;
    if (!w) return;
    bumpStat(w.key, ok);
    if (ok) S.done += 1; else S.wrong += 1;
    S.answered = true;
    updateStats();
    S.idx++;
    nextQuestion();
  }

  function feedbackHtml(ok) {
    var w = S.cur;
    var head = ok ? '<b style="color:#7ee0a3">✓ 正确</b>' : '<b style="color:#ff9aa6">✗ 再记一次</b>';
    var line = '读音 <b>' + w.reading + '</b> · ' + w.meaning;
    var ex = '';
    if (w.examples && w.examples.length) {
      var e = w.examples[0];
      var ja = e[0] || '';
      var zh = e[1] || '';
      ex = '<span class="ex"><i>' + escapeHtml(ja) + '</i><br>' + escapeHtml(zh) + '</span>';
    }
    return head + '　' + line + ex;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function updateProgress() {
    var n = S.round.length || 1;
    var p = Math.min(S.idx, n) / n * 100;
    $('progressFill').style.width = p + '%';
    $('counter').textContent = Math.min(S.idx + (S.idx < n ? 1 : 0), n) + ' / ' + n;
  }

  function updateStats() {
    var all = Object.keys(stat);
    var seen = 0, right = 0, wrong = 0;
    all.forEach(function (k) {
      var s = stat[k];
      if (!s) return;
      seen += s[2] || 0; right += s[0] || 0; wrong += s[1] || 0;
    });
    var acc = seen ? Math.round(right / seen * 100) : 0;
    $('stats').innerHTML =
      '已练 <b>' + all.length + '</b> 词　累计正确率 <b>' + acc + '%</b>' +
      '　本轮 <b>' + S.done + '</b>/<b>' + (S.round.length || 0) + '</b>' +
      '<br><span style="opacity:.7">★ 重点 = 近年真题高频考点 · 手机横竖屏都可用</span>';
  }

  // ---------------------------------------------------------------- 交互按钮
  function bind() {
    $('typed').addEventListener('input', onType);
    $('typed').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (S.answered) { S.idx++; nextQuestion(); }
      }
    });
    $('btnClear').onclick = function () {
      $('typed').value = '';
      $('typed').focus();
      if (!S.answered) renderCells(null);
    };
    $('btnNext').onclick = function () {
      if (S.diagTarget) {
        var t = S.diagTarget;
        S.diagTarget = null;
        S.diag = false;
        S.filter = 'star2';
        switchLevel(t);
        return;
      }
      if (S.idx >= S.round.length) { startRound(); return; }
      S.idx++;
      nextQuestion();
    };
    if ($('btnDiag')) $('btnDiag').onclick = function () { startDiag(); };
    $('btnSkip').onclick = function () {
      if (S.answered || !S.cur) return;
      S.answered = true;
      settle(false);
    };
    $('btnHint').onclick = function () {
      if (!S.cur) return;
      S.showAnswer = true;
      S.answered = true;
      $('wordLine').className = 'word';
      $('readingLine').className = 'reading';
      $('meaningLine').className = 'meaning';
      renderCells(align(K.romajiToKana($('typed').value), S.cur.reading));
      $('btnNext').disabled = false;
      $('btnHint').disabled = true;
      bumpStat(S.cur.key, false);
      S.wrong += 1;
      $('feedback').innerHTML = '<b>答案</b>　读音 <b>' + S.cur.reading + '</b> · ' + S.cur.meaning;
      updateStats();
    };
    $('btnSpeak').onclick = function () { if (S.cur) speak(S.cur.reading); };

    // 背词模式
    if ($('btnKnow')) $('btnKnow').onclick = function () { if (S.cur) markStudy(true); };
    if ($('btnNoKnow')) $('btnNoKnow').onclick = function () { if (S.cur) markStudy(false); };
    if ($('btnStudySpeak')) $('btnStudySpeak').onclick = function () { if (S.cur) speak(S.cur.reading); };

    // 词表（页面版）：搜索/筛选实时渲染
    if ($('listSearch')) $('listSearch').addEventListener('input', function () { renderList(); });
    if ($('listFocus')) $('listFocus').onchange = function () { renderList(); };

    // 设置面板
    $('btnSettings').onclick = function () {
      $('sheetMask').hidden = false;
      $('setRoundSize').value = String(S.settings.roundSize);
      $('setAutoNext').checked = !!S.settings.autoNext;
      $('setShowKana').checked = !!S.settings.showKana;
      $('setAutoSpeak').checked = !!S.settings.autoSpeak;
    };
    $('btnCloseSheet').onclick = function () { $('sheetMask').hidden = true; };
    $('sheetMask').onclick = function (e) { if (e.target === $('sheetMask')) $('sheetMask').hidden = true; };
    $('setRoundSize').onchange = function () { S.settings.roundSize = +this.value; saveSet(); startRound(); };
    $('setAutoNext').onchange = function () { S.settings.autoNext = this.checked; saveSet(); };
    $('setShowKana').onchange = function () { S.settings.showKana = this.checked; saveSet(); };
    $('setAutoSpeak').onchange = function () { S.settings.autoSpeak = this.checked; saveSet(); };
    $('btnResetProgress').onclick = function () {
      if (!confirm('清空所有学习记录？')) return;
      stat = {};
      try { localStorage.removeItem(LS_STAT); } catch (e) {}
      toast('已清空');
      startRound();
    };

    document.addEventListener('keydown', function (e) {
      if ($('sheetMask').hidden === false) return;
      if (e.key === 'Tab') return;
      if (e.key === 'Escape') { $('btnSkip').click(); }
    });
  }

  // ---------------------------------------------------------------- 词表（页面版）
  var WORD_REALM = { all: ['n5', 'n4', 'n3', 'n2', 'n1'], zhuji: ['n5', 'n4'], ningqi: ['n3', 'n2'], huashen: ['n1'] };
  var wordRealm = 'all';
  function openList() {
    $('listFocus').value = (S.filter === 'star' ? '3' : S.filter === 'star2' ? '2' : '0');
    $('listSearch').value = '';
    if ($('wordRealmBar')) {
      Array.prototype.forEach.call($('wordRealmBar').querySelectorAll('.realm-chip'), function (b) {
        b.onclick = function () {
          Array.prototype.forEach.call($('wordRealmBar').querySelectorAll('.realm-chip'), function (x) { x.classList.toggle('on', x === b); });
          wordRealm = b.getAttribute('data-realm');
          ensureRealmLoaded().then(renderList);
        };
      });
    }
    ensureRealmLoaded().then(renderList).catch(function () {
      var body = $('listBody');
      if (body) body.innerHTML = '<div class="list-empty">词库加载失败</div>';
    });
    setTimeout(function () { if ($('listBody')) $('listBody').scrollTop = 0; }, 0);
  }

  // 确保当前境界所需词卷都已就绪
  function ensureRealmLoaded() {
    var levels = WORD_REALM[wordRealm] || WORD_REALM.all;
    return Promise.all(levels.map(function (lv) { return loadLevel(lv); }));
  }

  // 词卷 → 境界名
  function wordRealmOf(lv) {
    if (lv === 'n1') return '化神';
    if (lv === 'n2' || lv === 'n3') return '凝气';
    if (lv === 'n4' || lv === 'n5') return '筑基';
    return '';
  }

  // ---------------------------------------------------------------- 进度页
  function renderProgress() {
    var grid = $('progressGrid');
    if (!grid) return;
    var all = Object.keys(stat);
    var seen = 0, right = 0, wrong = 0, stars = 0, weak = 0;
    all.forEach(function (k) {
      var s = stat[k];
      if (!s) return;
      seen += s[2] || 0; right += s[0] || 0; wrong += s[1] || 0;
      if (s[2] >= 3 && s[0] >= s[1] * 3) stars++;
      if (s[2] > 0 && s[1] >= s[0]) weak++;
    });
    var acc = seen ? Math.round(right / seen * 100) : 0;
    var cards = [
      { n: all.length, t: '已修行词数' },
      { n: acc + '%', t: '累计正确率' },
      { n: seen, t: '累计作答次数' },
      { n: right, t: '答对数' },
      { n: weak, t: '待复习词' },
      { n: stars, t: '已掌握★词' }
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="pg-card"><div class="pg-n">' + c.n + '</div><div class="pg-t">' + c.t + '</div></div>';
    }).join('');
  }

  function renderList() {
    var levels = WORD_REALM[wordRealm] || WORD_REALM.all;
    var list = [];
    levels.forEach(function (lv) { (cache[lv] || []).forEach(function (w) { list.push(w); }); });
    var q = ($('listSearch').value || '').trim().toLowerCase();
    var fv = +($('listFocus').value || 0);
    var body = $('listBody');
    var out = list.filter(function (w) {
      if (fv && w.focus < fv) return false;
      if (!q) return true;
      return (w.word + ' ' + w.reading + ' ' + w.meaning).toLowerCase().indexOf(q) >= 0;
    });
    var cap = 400;
    var shown = out.slice(0, cap);
    body.innerHTML = '';
    if (!shown.length) {
      body.innerHTML = '<div class="list-empty">没有匹配的词</div>';
      return;
    }
    var frag = document.createDocumentFragment();
    shown.forEach(function (w) {
      var b = document.createElement('button');
      b.className = 'list-item';
      var star = w.focus === 3 ? '<span class="lstar">★</span>'
               : w.focus === 2 ? '<span class="lstar" style="opacity:.6">☆</span>' : '';
      var rn = wordRealmOf(w.lv);
      b.innerHTML = '<span class="lw">' + escapeHtml(w.word) + '</span>' +
                    '<span class="lr">' + escapeHtml(w.reading) + '</span>' + star +
                    '<span class="lrealm">' + escapeHtml(rn) + '</span>' +
                    '<div class="lm">' + escapeHtml(w.meaning) + '</div>';
      b.onclick = function () {
        S.mode = 'study';
        buildTabs();
        S.round = [w];
        S.idx = 0; S.done = 0; S.wrong = 0;
        S.answered = false; S.showAnswer = false;
        S.cur = w;
        showPage('practice');
        renderQuestion();
      };
      frag.appendChild(b);
    });
    body.appendChild(frag);
    if (out.length > cap) {
      var more = document.createElement('div');
      more.className = 'list-empty';
      more.textContent = '共 ' + out.length + ' 词，只显示前 ' + cap + ' 个，用搜索缩小范围';
      body.appendChild(more);
    }
  }

  // ---------------------------------------------------------------- 启动
  function boot() {
    loadSet();
    loadStat();
    buildTabs();
    renderLoading();
    loadLevel(S.level)
      .then(function () { buildTabs(); startRound(); })
      .catch(function (e) {
        $('wordLine').textContent = '数据加载失败';
        $('readingLine').textContent = String(e.message || e);
      });
    loadGrammar().catch(function (e) { /* 语法页打开时再提示 */ });
    loadScenes().catch(function (e) { /* 场景页打开时再提示 */ });
    // 预取全部五卷，供词表境界切换即时展示
    ['n5', 'n4', 'n3', 'n2', 'n1'].forEach(function (lv) { loadLevel(lv).catch(function () {}); });
    $('versionNote').textContent = 'N1修道之路 · 词库 kotoba-local (CC BY-NC 4.0) · 离线可用';
    bind();
    bindIntro();
    bindPages();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  // ---------------------------------------------------------------- 开场动画
  function bindIntro() {
    var intro = $('intro');
    var enter = $('btnEnter');
    if (!intro || !enter) return;
    function close() {
      intro.classList.add('leave');
      setTimeout(function () { intro.hidden = true; }, 700);
    }
    enter.onclick = close;
    intro.addEventListener('click', function (e) {
      if (e.target === intro && !intro.classList.contains('leave')) close();
    });
    // 自动进入（如用户已看过动画）
    try {
      if (localStorage.getItem('n1way:seenIntro') || /[?&]noIntro=1/.test(location.search)) {
        intro.classList.add('leave');
        intro.hidden = true;
        intro.style.display = 'none';
      }
    } catch (e) {}
    enter.addEventListener('click', function () {
      try { localStorage.setItem('n1way:seenIntro', '1'); } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- 多页切换
  var PAGES = ['practice', 'grammar', 'words', 'progress', 'about'];
  function showPage(name) {
    PAGES.forEach(function (p) {
      var sec = $('page' + p.charAt(0).toUpperCase() + p.slice(1));
      if (sec) sec.hidden = (p !== name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-page') === name);
    });
    if (name === 'words') { openList(); }
    if (name === 'progress') { renderProgress(); }
    if (name === 'grammar') { renderGrammarChannel(); }
  }
  function bindPages() {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.onclick = function () { showPage(b.getAttribute('data-page')); };
    });
    if ($('btnAboutSettings')) $('btnAboutSettings').onclick = function () {
      showPage('practice');
      $('btnSettings').click();
    };
    // 语法页：渠道切换 + 各渠道交互
    if ($('gramChannels')) {
      Array.prototype.forEach.call($('gramChannels').querySelectorAll('.gch'), function (c) {
        c.onclick = function () {
          Array.prototype.forEach.call($('gramChannels').querySelectorAll('.gch'), function (x) { x.classList.toggle('on', x === c); });
          renderGrammarChannel();
        };
      });
    }
    if ($('grammarSearch')) $('grammarSearch').addEventListener('input', function () { renderGrammarTree(); });

    // 深链：#语法页?ch=realm 之类，便于分享与验证
    try {
      var m = /[?&]page=([a-z]+)/.exec(location.search + location.hash);
      var chm = /[?&]ch=(use|realm|scene)/.exec(location.search + location.hash);
      var rm = /[?&]realm=(all|zhuji|ningqi|huashen)/.exec(location.search + location.hash);
      var trm = /[?&]trunk=([a-z_]+)/.exec(location.search + location.hash);
      var brm = /[?&]branch=([a-z_]+)/.exec(location.search + location.hash);
      var tirm = /[?&]tier=(all|zhuji|ningqi|huashen)/.exec(location.search + location.hash);
      var fmm = /[?&]fam=([a-z_]+)/.exec(location.search + location.hash);
      if (rm && $('wordRealmBar')) {
        var wb = $('wordRealmBar').querySelector('.realm-chip[data-realm="' + rm[1] + '"]');
        if (wb) { Array.prototype.forEach.call($('wordRealmBar').querySelectorAll('.realm-chip'), function (x) { x.classList.toggle('on', x === wb); }); wordRealm = rm[1]; }
      }
      if (m && PAGES.indexOf(m[1]) >= 0) {
        showPage(m[1]);
        if (m[1] === 'grammar' && chm && $('gramChannels')) {
          var btn = $('gramChannels').querySelector('.gch[data-ch="' + chm[1] + '"]');
          if (btn) { btn.click(); }
          // 下钻深链：tier / trunk / branch / fam
          var patched = false;
          if (tirm && tirm[1] !== 'all') { realmTier = tirm[1]; grammarTier = tirm[1]; patched = true; }
          if (trm) { usePath.trunk = trm[1]; realmPath.trunk = trm[1]; patched = true; }
          if (brm) { usePath.branch = brm[1]; realmPath.branch = brm[1]; patched = true; }
          if (fmm) { sceneFamily = fmm[1]; patched = true; }
          if (patched) renderGrammarChannel();
        }
        if (m[1] === 'words' && rm) { ensureRealmLoaded().then(renderList); }
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------- 语法（句法心诀）
  var GR = { books: [], tiers: [], trunks: [], items: [], byId: {} };
  var GS = { families: [] }; // 场景多义
  var grammarTier = null; // 当前选中的修道三阶（null = 全部）
  function loadGrammar() {
    if (GR.items.length) return Promise.resolve(GR);
    var embedded = (window.JP_GRAMMAR) || null;
    var p = embedded
      ? Promise.resolve(embedded)
      : fetch('data/grammar.json', { cache: 'force-cache' }).then(function (r) {
          if (!r.ok) throw new Error('语法数据加载失败 ' + r.status);
          return r.json();
        });
    return p.then(function (j) {
      GR.books = j.books || [];
      GR.tiers = (j.tiers || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      GR.trunks = j.trunks || [];
      GR.items = j.items || [];
      GR.items.forEach(function (it) { GR.byId[it.id] = it; });
      // 主干下挂的语法点（trunk.branches[].points 只是 id 列表，补全字段）
      GR.trunks.forEach(function (T) {
        var total = 0;
        (T.branches || []).forEach(function (B) {
          B._items = (B.points || []).map(function (id) { return GR.byId[id]; }).filter(Boolean);
          total += B._items.length;
        });
        T._count = total;
        T._items = (T.branches || []).reduce(function (a, B) { return a.concat(B._items || []); }, []);
      });
      return GR;
    });
  }
  function loadScenes() {
    if (GS.families.length) return Promise.resolve(GS);
    return fetch('data/scenes.json', { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('场景数据加载失败'); return r.json(); })
      .then(function (j) { GS.families = j.families || []; return GS; });
  }

  function grammarStageState() {
    return grammarTier; // null = 全部
  }

  // 渠道分发：作用脉络 / 境界修行 / 场景多义
  function renderGrammarChannel() {
    var ch = 'use';
    var onBtn = $('gramChannels') && $('gramChannels').querySelector('.gch.on');
    if (onBtn) ch = onBtn.getAttribute('data-ch');
    ['use', 'realm', 'scene'].forEach(function (c) {
      var v = $('gram' + (c === 'use' ? 'Use' : c === 'realm' ? 'Realm' : 'Scene'));
      if (v) v.hidden = (c !== ch);
    });
    if (ch === 'use') {
      loadGrammar().then(function () { renderGrammarStage(); renderGrammarTree(); })
        .catch(function (e) { var m = $('grammarMap'); if (m) m.innerHTML = '<div class="list-empty">语法数据加载失败: ' + escapeHtml(String(e && e.message || e)) + '</div>'; });
    } else if (ch === 'realm') {
      loadGrammar().then(renderGrammarRealm)
        .catch(function (e) { var m = $('grammarRealmMap'); if (m) m.innerHTML = '<div class="list-empty">语法数据加载失败: ' + escapeHtml(String(e && e.message || e)) + '</div>'; });
    } else if (ch === 'scene') {
      Promise.all([loadGrammar(), loadScenes()]).then(function () { renderGrammarScene(); })
        .catch(function (e) { var m = $('grammarSceneMap'); if (m) m.innerHTML = '<div class="list-empty">场景数据加载失败: ' + escapeHtml(String(e && e.message || e)) + '</div>'; });
    }
  }

  // ================= 通用：面包屑 / 卡片网格 / 叶子网格 =================
  function crumbBar(parts) {
    var html = '<div class="gm-crumb">';
    parts.forEach(function (p, i) {
      if (i) html += '<span class="gm-crumb-sep">›</span>';
      html += '<span class="gm-crumb-item' + (p.on ? ' on' : '') + '"' +
              (p.go ? ' data-go="' + i + '"' : '') + '>' + escapeHtml(p.label) + '</span>';
    });
    return html + '</div>';
  }
  function bindCrumbs(map, parts) {
    Array.prototype.forEach.call(map.querySelectorAll('.gm-crumb-item[data-go]'), function (el) {
      el.onclick = function () {
        var p = parts[+el.getAttribute('data-go')];
        if (p && p.go) p.go();
      };
    });
  }
  function tilesHtml(list) {
    return '<div class="gm-tile-grid">' + list.map(function (t) {
      return '<div class="gm-tile" style="--tile-color:' + (t.color || 'var(--accent)') + '">' +
               '<span class="gm-tile-arrow">›</span>' +
               '<span class="gm-tile-icon">' + escapeHtml(t.icon || '◆') + '</span>' +
               '<span class="gm-tile-title">' + escapeHtml(t.title) + '</span>' +
               (t.desc ? '<span class="gm-tile-desc">' + escapeHtml(t.desc) + '</span>' : '') +
               '<span class="gm-tile-count">' + escapeHtml(t.count || '') + '</span>' +
             '</div>';
    }).join('') + '</div>';
  }
  function bindTiles(map, list) {
    Array.prototype.forEach.call(map.querySelectorAll('.gm-tile'), function (el, i) {
      if (list[i] && list[i].go) el.onclick = list[i].go;
    });
  }
  function leavesHtml(items) {
    return '<div class="gm-leaf-grid">' + items.map(leafHtml).join('') + '</div>';
  }
  function bindLeaves(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.gm-leaf'), function (lf) {
      lf.onclick = function () { speak(lf.getAttribute('data-kana') || ''); };
    });
  }
  function tierOf(id) {
    return GR.tiers.filter(function (t) { return t.id === id; })[0] || null;
  }

  // ================= 渠道二：境界修行（下钻） =================
  var realmTier = null;                                  // null = 三阶总览
  var realmPath = { trunk: null, branch: null };
  function renderGrammarRealm() {
    var map = $('grammarRealmMap');
    var bar = $('gramRealmBar');
    if (!map) return;
    if (!GR.items.length) {
      map.innerHTML = '<div class="list-empty">心诀加载中…</div>';
      loadGrammar().then(renderGrammarRealm);
      return;
    }
    if (bar) {
      var html = '<button class="realm-chip' + (realmTier === null ? ' on' : '') + '" data-tier="all">三阶总览<small>' + GR.items.length + ' 诀</small></button>';
      html += GR.tiers.map(function (T) {
        var n = GR.items.filter(function (it) { return it.tier === T.id; }).length;
        return '<button class="realm-chip' + (realmTier === T.id ? ' on' : '') + '" data-tier="' + T.id + '">' +
               T.name + '<small>' + n + ' 诀</small></button>';
      }).join('');
      bar.innerHTML = html;
      Array.prototype.forEach.call(bar.querySelectorAll('.realm-chip'), function (b) {
        b.onclick = function () {
          var v = b.getAttribute('data-tier');
          realmTier = (v === 'all') ? null : v;
          realmPath = { trunk: null, branch: null };
          renderGrammarRealm();
        };
      });
    }

    var tierFilter = function (it) { return !realmTier || it.tier === realmTier; };
    map.innerHTML = '';

    // 一级：三阶总览 → 三个境界卡片
    if (!realmTier) {
      var tierTiles = GR.tiers.map(function (T) {
        var n = GR.items.filter(function (it) { return it.tier === T.id; }).length;
        return { icon: '✦', title: T.name, desc: T.note || '', color: 'var(--accent)',
                 count: n + ' 诀 · ' + GR.trunks.filter(function (tk) {
                   return GR.items.some(function (it) { return it.tier === T.id && it.trunk === tk.id; });
                 }).length + ' 域',
                 go: function () { realmTier = T.id; realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } };
      });
      map.innerHTML = crumbBar([{ label: '三阶总览', on: true }, { label: '择境而入' }]) + tilesHtml(tierTiles);
      bindTiles(map, tierTiles);
      return;
    }

    var T = tierOf(realmTier);

    // 二级：该境下的主干卡片
    if (!realmPath.trunk) {
      var trunkTiles = GR.trunks.map(function (tk) {
        var items = (tk._items || []).filter(tierFilter);
        if (!items.length) return null;
        return { icon: tk.icon, title: tk.name, desc: tk.desc, color: tk.color,
                 count: items.length + ' 诀',
                 go: function () { realmPath.trunk = tk.id; renderGrammarRealm(); } };
      }).filter(Boolean);
      map.innerHTML = crumbBar([
        { label: '三阶总览', go: function () { realmTier = null; realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } },
        { label: T ? T.name : '', on: true },
        { label: trunkTiles.length + ' 域' }
      ]) + (trunkTiles.length ? tilesHtml(trunkTiles) : '<div class="list-empty">该境暂无心诀</div>');
      bindTiles(map, trunkTiles);
      bindCrumbs(map, [{ go: function () { realmTier = null; realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } }]);
      return;
    }

    var tk2 = GR.trunks.filter(function (x) { return x.id === realmPath.trunk; })[0];

    // 三级：该主干下的分支卡片
    if (!realmPath.branch) {
      var brTiles = ((tk2 && tk2.branches) || []).map(function (B) {
        var items = (B._items || []).filter(tierFilter);
        if (!items.length) return null;
        return { icon: '▸', title: B.name, desc: B.desc, color: tk2.color,
                 count: items.length + ' 诀',
                 go: function () { realmPath.branch = B.id; renderGrammarRealm(); } };
      }).filter(Boolean);
      map.innerHTML = crumbBar([
        { label: '三阶总览', go: function () { realmTier = null; realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } },
        { label: T ? T.name : '', go: function () { realmPath.trunk = null; renderGrammarRealm(); } },
        { label: tk2 ? tk2.icon + ' ' + tk2.name : '', on: true },
        { label: brTiles.length + ' 脉' }
      ]) + (brTiles.length ? tilesHtml(brTiles) : '<div class="list-empty">该境此域暂无心诀</div>');
      bindTiles(map, brTiles);
      return;
    }

    // 四级：语法点
    var br2 = ((tk2 && tk2.branches) || []).filter(function (x) { return x.id === realmPath.branch; })[0];
    var leaves = ((br2 && br2._items) || []).filter(tierFilter);
    map.innerHTML = crumbBar([
      { label: T ? T.name : '', go: function () { realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } },
      { label: tk2 ? tk2.icon + ' ' + tk2.name : '', go: function () { realmPath.branch = null; renderGrammarRealm(); } },
      { label: br2 ? br2.name : '分支', on: true },
      { label: leaves.length + ' 诀' }
    ]) + (leaves.length ? leavesHtml(leaves) : '<div class="list-empty">此脉暂无该阶心诀</div>');
    bindLeaves(map);
    bindCrumbs(map, [
      null,
      { go: function () { realmPath = { trunk: null, branch: null }; renderGrammarRealm(); } },
      { go: function () { realmPath.branch = null; renderGrammarRealm(); } }
    ]);
  }

  // ================= 渠道三：场景多义（下钻） =================
  var sceneFamily = null;
  function renderGrammarScene() {
    var map = $('grammarSceneMap');
    if (!map) return;
    if (!GR.items.length || !GS.families.length) {
      map.innerHTML = '<div class="list-empty">场景数据加载中…</div>';
      Promise.all([loadGrammar(), loadScenes()]).then(renderGrammarScene);
      return;
    }
    map.innerHTML = '';

    // 一级：场景家族卡片
    if (!sceneFamily) {
      var famTiles = GS.families.map(function (f) {
        var ids = [];
        f.scenes.forEach(function (sc) { (sc.ids || []).forEach(function (id) { if (GR.byId[id]) ids.push(id); }); });
        return { icon: '❖', title: f.name, desc: f.desc, color: 'var(--accent)',
                 count: f.scenes.length + ' 境 · ' + ids.length + ' 诀',
                 go: function () { sceneFamily = f.id; renderGrammarScene(); } };
      });
      map.innerHTML = crumbBar([{ label: '一形多义', on: true }, { label: famTiles.length + ' 族' }]) + tilesHtml(famTiles);
      bindTiles(map, famTiles);
      return;
    }

    // 二级：该家族下的场景分镜
    var f = GS.families.filter(function (x) { return x.id === sceneFamily; })[0];
    if (!f) { sceneFamily = null; renderGrammarScene(); return; }
    var blocks = f.scenes.map(function (sc) {
      var ls = (sc.ids || []).map(function (id) { return GR.byId[id]; }).filter(Boolean);
      var ex = sc.example ? '<div class="gm-scn-ex"><div class="ex-ja">' + escapeHtml(sc.example.ja) +
        ' <span class="ex-kn">(' + escapeHtml(sc.example.kana || '') + ')</span></div>' +
        (sc.example.zh ? '<div class="ex-zh">' + escapeHtml(sc.example.zh) + '</div>' : '') + '</div>' : '';
      return '<div class="gm-scn"><div class="gm-scn-head">▸ ' + escapeHtml(sc.scene) + '</div>' +
               (sc.note ? '<div class="gm-scn-note">' + escapeHtml(sc.note) + '</div>' : '') +
               '<div class="gm-scn-body">' + ls.map(leafHtml).join('') + '</div>' + ex + '</div>';
    }).join('');
    map.innerHTML = crumbBar([
      { label: '一形多义', go: function () { sceneFamily = null; renderGrammarScene(); } },
      { label: f.name, on: true },
      { label: f.scenes.length + ' 境' }
    ]) + '<div class="gm-sec-title">' + escapeHtml(f.desc || '') + '</div>' + blocks;
    bindLeaves(map);
    bindCrumbs(map, [{}, { go: function () { sceneFamily = null; renderGrammarScene(); } }]);
  }

  function renderGrammarStage() {
    var box = $('grammarStage');
    if (!box) return;
    var sel = grammarTier;
    var html = '<button class="stage-chip' + (sel === null ? ' on' : '') + '" data-tier="all">全部心诀' +
               '<small>' + GR.items.length + ' 诀</small></button>';
    html += GR.tiers.map(function (T) {
      var n = GR.items.filter(function (it) { return it.tier === T.id; }).length;
      var on = (sel === T.id) ? ' on' : '';
      return '<button class="stage-chip' + on + '" data-tier="' + T.id + '">' + T.name +
             '<small>' + n + ' 诀</small></button>';
    }).join('');
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll('.stage-chip'), function (b) {
      b.onclick = function () {
        grammarTier = b.getAttribute('data-tier');
        if (grammarTier === 'all') grammarTier = null;
        renderGrammarStage();
        renderGrammarTree();
      };
    });
  }

  // 把一条语法点渲染成思维导图叶子（可点开看例句）
  function leafHtml(it) {
    var bk = '';
    for (var k = 0; k < GR.books.length; k++) if (GR.books[k].id === it.book) bk = GR.books[k].name;
    var tierName = '';
    for (var t = 0; t < GR.tiers.length; t++) if (GR.tiers[t].id === it.tier) tierName = GR.tiers[t].name;
    var ex = (it.examples || []).slice(0, 3).map(function (e) {
      return '<div class="ex-item"><div class="ex-ja">' + escapeHtml(e.ja) + ' <span class="ex-kn">(' + escapeHtml(e.kana || '') + ')</span></div>' +
             (e.zh ? '<div class="ex-zh">' + escapeHtml(e.zh) + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="gm-leaf" data-kana="' + escapeHtml(it.kana || it.reading || it.pattern) + '">' +
             '<div class="gm-leaf-head"><span class="gm-pat">' + escapeHtml(it.pattern) + '</span>' +
             '<span class="gm-tier">' + escapeHtml(tierName) + '</span></div>' +
             '<div class="gm-read">' + escapeHtml(it.reading || '') + '</div>' +
             '<div class="gm-mean">' + escapeHtml(it.mean) + '</div>' +
             (bk ? '<div class="gm-book">出典：' + escapeHtml(bk) + '</div>' : '') +
             (ex ? '<div class="gm-ex">' + ex + '</div>' : '') +
           '</div>';
  }

  // ================= 渠道一：作用脉络（下钻） =================
  var usePath = { trunk: null, branch: null };
  function renderGrammarTree() {
    var map = $('grammarMap');
    if (!map) return;
    if (!GR.items.length) {
      map.innerHTML = '<div class="list-empty">心诀加载中…</div>';
      loadGrammar().then(function () { renderGrammarStage(); renderGrammarTree(); });
      return;
    }
    var tier = grammarStageState();
    var q = ($('grammarSearch') ? $('grammarSearch').value : '').trim().toLowerCase();
    var pass = function (it) {
      if (tier && it.tier !== tier) return false;
      if (!q) return true;
      return (it.pattern + ' ' + (it.reading || '') + ' ' + it.mean).toLowerCase().indexOf(q) >= 0;
    };
    map.innerHTML = '';

    // 搜索时：直接平铺命中结果
    if (q) {
      var hits = GR.items.filter(pass);
      map.innerHTML = crumbBar([{ label: '检索「' + q + '」', on: true }, { label: hits.length + ' 诀' }]) +
        (hits.length ? leavesHtml(hits) : '<div class="list-empty">没有匹配的心诀，换个关键词试试</div>');
      bindLeaves(map);
      return;
    }

    // 一级：十二主干
    if (!usePath.trunk) {
      var trunkTiles = GR.trunks.map(function (tk) {
        var n = (tk._items || []).filter(function (it) { return !tier || it.tier === tier; }).length;
        if (!n) return null;
        return { icon: tk.icon, title: tk.name, desc: tk.desc, color: tk.color, count: n + ' 诀',
                 go: function () { usePath.trunk = tk.id; renderGrammarTree(); } };
      }).filter(Boolean);
      map.innerHTML = crumbBar([{ label: '作用脉络', on: true }, { label: trunkTiles.length + ' 域' }]) +
        (trunkTiles.length ? tilesHtml(trunkTiles) : '<div class="list-empty">该阶暂无心诀</div>');
      bindTiles(map, trunkTiles);
      return;
    }

    var T = GR.trunks.filter(function (x) { return x.id === usePath.trunk; })[0];
    if (!T) { usePath.trunk = null; renderGrammarTree(); return; }

    // 二级：该主干下各分支
    if (!usePath.branch) {
      var brTiles = (T.branches || []).map(function (B) {
        var items = (B._items || []).filter(pass);
        if (!items.length) return null;
        return { icon: '▸', title: B.name, desc: B.desc, color: T.color, count: items.length + ' 诀',
                 go: function () { usePath.branch = B.id; renderGrammarTree(); } };
      }).filter(Boolean);
      map.innerHTML = crumbBar([
        { label: '作用脉络', go: function () { usePath = { trunk: null, branch: null }; renderGrammarTree(); } },
        { label: T.icon + ' ' + T.name, on: true },
        { label: brTiles.length + ' 脉' }
      ]) + '<div class="gm-sec-title">' + escapeHtml(T.desc || '') + '</div>' +
        (brTiles.length ? tilesHtml(brTiles) : '<div class="list-empty">此域暂无匹配心诀</div>');
      bindTiles(map, brTiles);
      bindCrumbs(map, [{ go: function () { usePath = { trunk: null, branch: null }; renderGrammarTree(); } }]);
      return;
    }

    // 三级：语法点
    var B2 = (T.branches || []).filter(function (x) { return x.id === usePath.branch; })[0];
    var leaves = ((B2 && B2._items) || []).filter(pass);
    map.innerHTML = crumbBar([
      { label: '作用脉络', go: function () { usePath = { trunk: null, branch: null }; renderGrammarTree(); } },
      { label: T.icon + ' ' + T.name, go: function () { usePath.branch = null; renderGrammarTree(); } },
      { label: B2 ? B2.name : '分支', on: true },
      { label: leaves.length + ' 诀' }
    ]) + (leaves.length ? leavesHtml(leaves) : '<div class="list-empty">此脉暂无匹配心诀</div>');
    bindLeaves(map);
    bindCrumbs(map, [
      { go: function () { usePath = { trunk: null, branch: null }; renderGrammarTree(); } },
      { go: function () { usePath.branch = null; renderGrammarTree(); } }
    ]);
  }

  if (document.readyState === 'loading') {    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
