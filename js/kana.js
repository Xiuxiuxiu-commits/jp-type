/* kana.js — 罗马字 ↔ 假名 转换（供「打字」模式与提示使用） */
(function (global) {
  'use strict';

  // ---------- 基础表：罗马字 -> 假名 ----------
  var MAP = Object.create(null);

  function put(romaji, kana) { MAP[romaji] = kana; }
  function putMany(list, kana) { list.forEach(function (r) { put(r, kana); }); }

  // 五十音
  putMany(['a'], 'あ'); putMany(['i'], 'い'); putMany(['u'], 'う');
  putMany(['e'], 'え'); putMany(['o'], 'お');

  putMany(['ka'], 'か'); putMany(['ki'], 'き'); putMany(['ku'], 'く');
  putMany(['ke'], 'け'); putMany(['ko'], 'こ');

  putMany(['sa'], 'さ'); putMany(['si', 'shi'], 'し'); putMany(['su'], 'す');
  putMany(['se'], 'せ'); putMany(['so'], 'そ');

  putMany(['ta'], 'た'); putMany(['ti', 'chi'], 'ち'); putMany(['tu', 'tsu'], 'つ');
  putMany(['te'], 'て'); putMany(['to'], 'と');

  putMany(['na'], 'な'); putMany(['ni'], 'に'); putMany(['nu'], 'ぬ');
  putMany(['ne'], 'ね'); putMany(['no'], 'の');

  putMany(['ha'], 'は'); putMany(['hi'], 'ひ'); putMany(['hu', 'fu'], 'ふ');
  putMany(['he'], 'へ'); putMany(['ho'], 'ほ');

  putMany(['ma'], 'ま'); putMany(['mi'], 'み'); putMany(['mu'], 'む');
  putMany(['me'], 'め'); putMany(['mo'], 'も');

  putMany(['ya'], 'や'); putMany(['yu'], 'ゆ'); putMany(['yo'], 'よ');
  putMany(['yi'], 'い');

  putMany(['ra'], 'ら'); putMany(['ri'], 'り'); putMany(['ru'], 'る');
  putMany(['re'], 'れ'); putMany(['ro'], 'ろ');

  putMany(['wa'], 'わ'); putMany(['wo'], 'を'); putMany(['n'], 'ん');

  putMany(['ga'], 'が'); putMany(['gi'], 'ぎ'); putMany(['gu'], 'ぐ');
  putMany(['ge'], 'げ'); putMany(['go'], 'ご');

  putMany(['za'], 'ざ'); putMany(['zi', 'ji'], 'じ'); putMany(['zu'], 'ず');
  putMany(['ze'], 'ぜ'); putMany(['zo'], 'ぞ');

  putMany(['da'], 'だ'); putMany(['di'], 'ぢ'); putMany(['du'], 'づ');
  putMany(['de'], 'で'); putMany(['do'], 'ど');

  putMany(['ba'], 'ば'); putMany(['bi'], 'び'); putMany(['bu'], 'ぶ');
  putMany(['be'], 'べ'); putMany(['bo'], 'ぼ');

  putMany(['pa'], 'ぱ'); putMany(['pi'], 'ぴ'); putMany(['pu'], 'ぷ');
  putMany(['pe'], 'ぺ'); putMany(['po'], 'ぽ');

  putMany(['vu'], 'ゔ');

  // 拗音
  putMany(['kya'], 'きゃ'); putMany(['kyu'], 'きゅ'); putMany(['kyo'], 'きょ');
  putMany(['gya'], 'ぎゃ'); putMany(['gyu'], 'ぎゅ'); putMany(['gyo'], 'ぎょ');
  putMany(['sha', 'sya'], 'しゃ'); putMany(['shu', 'syu'], 'しゅ'); putMany(['sho', 'syo'], 'しょ');
  putMany(['ja', 'jya', 'zya'], 'じゃ'); putMany(['ju', 'jyu', 'zyu'], 'じゅ'); putMany(['jo', 'jyo', 'zyo'], 'じょ');
  putMany(['cha', 'cya', 'tya'], 'ちゃ'); putMany(['chu', 'cyu', 'tyu'], 'ちゅ'); putMany(['cho', 'cyo', 'tyo'], 'ちょ');
  putMany(['nya'], 'にゃ'); putMany(['nyu'], 'にゅ'); putMany(['nyo'], 'にょ');
  putMany(['hya'], 'ひゃ'); putMany(['hyu'], 'ひゅ'); putMany(['hyo'], 'ひょ');
  putMany(['bya'], 'びゃ'); putMany(['byu'], 'びゅ'); putMany(['byo'], 'びょ');
  putMany(['pya'], 'ぴゃ'); putMany(['pyu'], 'ぴゅ'); putMany(['pyo'], 'ぴょ');
  putMany(['mya'], 'みゃ'); putMany(['myu'], 'みゅ'); putMany(['myo'], 'みょ');
  putMany(['rya'], 'りゃ'); putMany(['ryu'], 'りゅ'); putMany(['ryo'], 'りょ');

  // 外来音（片假名词）
  putMany(['fa'], 'ふぁ'); putMany(['fi'], 'ふぃ'); putMany(['fe'], 'ふぇ'); putMany(['fo'], 'ふぉ');
  putMany(['va'], 'ゔぁ'); putMany(['vi'], 'ゔぃ'); putMany(['ve'], 'ゔぇ'); putMany(['vo'], 'ゔぉ');
  putMany(['she'], 'しぇ');
  putMany(['che'], 'ちぇ');
  putMany(['je', 'zie'], 'じぇ');
  putMany(['thi'], 'てぃ'); putMany(['dhi'], 'でぃ');
  putMany(['twu'], 'とぅ'); putMany(['dwu'], 'どぅ');
  putMany(['wi'], 'うぃ'); putMany(['we'], 'うぇ');
  putMany(['kwa'], 'くぁ'); putMany(['kwi'], 'くぃ'); putMany(['kwe'], 'くぇ'); putMany(['kwo'], 'くぉ');
  putMany(['ye'], 'いぇ');
  putMany(['wha'], 'うぁ'); putMany(['whi'], 'うぃ'); putMany(['whe'], 'うぇ'); putMany(['who'], 'うぉ');
  putMany(['tsa'], 'つぁ'); putMany(['tsi'], 'つぃ'); putMany(['tse'], 'つぇ'); putMany(['tso'], 'つぉ');
  putMany(['dyi'], 'でぃ');

  // 小写假名（x / l 前缀）
  putMany(['xa', 'la'], 'ぁ'); putMany(['xi', 'li'], 'ぃ'); putMany(['xu', 'lu'], 'ぅ');
  putMany(['xe', 'le'], 'ぇ'); putMany(['xo', 'lo'], 'ぉ');
  putMany(['xya', 'lya'], 'ゃ'); putMany(['xyu', 'lyu'], 'ゅ'); putMany(['xyo', 'lyo'], 'ょ');
  putMany(['xtu', 'ltu', 'xtsu', 'ltsu'], 'っ');
  putMany(['xwa', 'lwa'], 'ゎ');

  // 浊音化的片假名拗音（ティ etc. 已覆盖；再补几个常用）
  putMany(['fyu'], 'ふゅ');
  putMany(['vyu'], 'ゔゅ');

  var MAXLEN = 5;
  var VOWELS = 'aiueo';
  var CONSONANTS = 'kgsztdnhbpmrwyfvjcqxl';

  // ---------- 片假名 <-> 平假名 ----------
  var KATA_TO_HIRA = {};
  (function () {
    var kata = 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲンヴヵヶヽヾ';
    var hira = 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをんゔゕゖゝゞ';
    for (var i = 0; i < kata.length; i++) KATA_TO_HIRA[kata[i]] = hira[i];
  })();

  function toHiragana(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) out += (KATA_TO_HIRA[s[i]] || s[i]);
    return out;
  }

  function toKatakana(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c >= 'ぁ' && c <= 'ゖ') {
        out += String.fromCharCode(c.charCodeAt(0) + 0x60);
      } else out += c;
    }
    return out;
  }

  var KANA_RE = /[ぁ-ゖァ-ヺー・]/;

  // ---------- 罗马字 -> 假名（流式，输入到哪转到哪） ----------
  function romajiToKana(input) {
    var buf = (input || '').toLowerCase();
    var out = '';
    var i = 0;
    var n = buf.length;

    while (i < n) {
      var ch = buf[i];

      // 已经是假名：直接保留
      if (KANA_RE.test(ch)) {
        out += ch;
        i++;
        continue;
      }

      // 长音符
      if (ch === '-' || ch === '=') { out += 'ー'; i++; continue; }

      // n 的特殊处理：n 后接非元音非 y 的辅音 -> ん
      if (ch === 'n') {
        var nxt = buf[i + 1];
        if (nxt === "'") { out += 'ん'; i += 2; continue; }
        if (nxt === undefined) { out += 'ん'; i++; continue; }
        // nn：n 前先出 ん，剩下的 n 交给后续规则（nna -> んな）
        if (nxt === 'n') { out += 'ん'; i++; continue; }
        if (VOWELS.indexOf(nxt) < 0 && nxt !== 'y') { out += 'ん'; i++; continue; }
      }

      // 促音：同一辅音重复
      if (ch === 't' && buf.substr(i, 3) === 'tch') {
        out += 'っ'; i++; continue;
      }
      if (CONSONANTS.indexOf(ch) >= 0 && buf[i + 1] === ch && ch !== 'n') {
        out += 'っ'; i++; continue;
      }

      // 最长匹配
      var matched = false;
      for (var len = Math.min(MAXLEN, n - i); len >= 1; len--) {
        var seg = buf.substr(i, len);
        if (MAP[seg]) { out += MAP[seg]; i += len; matched = true; break; }
      }
      if (matched) continue;

      // 未匹配：辅音先挂起（不输出），其余原样输出
      if (CONSONANTS.indexOf(ch) >= 0) { i++; continue; }
      out += ch; i++;
    }
    return out;
  }

  // ---------- 假名 -> 罗马字（提示用，Hepburn 风格） ----------
  var REV = Object.create(null);
  var REV_PREFER = {
    'し': 'shi', 'ち': 'chi', 'つ': 'tsu', 'ふ': 'fu', 'じ': 'ji', 'ぢ': 'di', 'づ': 'du',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'を': 'wo', 'ん': 'n', 'っ': 'xtu'
  };
  (function () {
    Object.keys(MAP).forEach(function (r) {
      var k = MAP[r];
      if (REV_PREFER[k] && REV_PREFER[k] !== r) return;
      if (!REV[k] || r.length < REV[k].length) REV[k] = r;
    });
    Object.keys(REV_PREFER).forEach(function (k) {
      if (MAP[REV_PREFER[k]] === k) REV[k] = REV_PREFER[k];
    });
  })();

  var REV_MAXLEN = 3;

  function kanaToRomaji(kana) {
    var s = toHiragana(kana || '');
    var out = '';
    var i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === 'ー') { out += '-'; i++; continue; }
      if (ch === 'っ') {
        // 促音：把下一个音的首辅音重复
        var rest = kanaToRomaji(s.slice(i + 1, i + 4));
        out += rest ? rest[0] : '';
        i++;
        continue;
      }
      var matched = false;
      for (var len = Math.min(REV_MAXLEN, s.length - i); len >= 1; len--) {
        var seg = s.substr(i, len);
        if (REV[seg]) { out += REV[seg]; i += len; matched = true; break; }
      }
      if (!matched) { out += ch; i++; }
    }
    return out;
  }

  // ---------- 比对工具 ----------
  function norm(s) {
    return toHiragana((s || '').trim().replace(/\s+/g, ''));
  }

  /**
   * 逐字比较输入与目标（均已归一化），返回：
   * { ok: 是否全对, pos: 第一个错的位置, done: 输入长度 >= 目标长度 }
   */
  function compare(typed, target) {
    var t = norm(typed);
    var g = norm(target);
    var len = Math.min(t.length, g.length);
    for (var i = 0; i < len; i++) {
      if (t[i] !== g[i]) return { ok: false, pos: i, done: false };
    }
    return { ok: t === g, pos: -1, done: t.length >= g.length };
  }

  // ---------- 宽松归一化（打字判分用） ----------
  // ぢ/づ/を 视为 じ/ず/お；ゔ 视为 ぶ（不苛求输入法细节）
  function norm2(s) {
    return toHiragana(s || '')
      .replace(/ぢ/g, 'じ').replace(/づ/g, 'ず')
      .replace(/を/g, 'お').replace(/ゔ/g, 'ぶ')
      .replace(/ゐ/g, 'い').replace(/ゑ/g, 'え');
  }

  var VOWEL_SET = 'あいうえお';

  /**
   * 把输入与目标读音对齐，逐字符给出状态。
   * 返回 { st:[], badAt, okAll, filled, total }
   *   st[i] ∈ 'ok' | 'pending' | 'skip' | 'bad'
   * 容错：长音「ー」可省略；元音+ー 可写成重复元音；小写拗音写成大写；促音漏写。
   */
  function align(typed, target) {
    var t = norm2(typed), g = norm2(target);
    var st = new Array(g.length);
    for (var i = 0; i < g.length; i++) st[i] = 'pending';
    var ti = 0, gi = 0, badAt = -1;
    while (gi < g.length) {
      var gc = g[gi];
      var tc = ti < t.length ? t[ti] : null;
      // 长音符：可省略；也可写成任意元音（るーと ← ruuto / ruto）
      if (gc === 'ー') {
        if (tc && VOWEL_SET.indexOf(tc) >= 0) { st[gi] = 'ok'; ti++; gi++; continue; }
        st[gi] = 'skip'; gi++; continue;
      }
      if (tc === null) break;
      if (tc === gc) { st[gi] = 'ok'; ti++; gi++; continue; }
      // 「元音 + ー」被写成重复元音（こう ← kou）
      if (g[gi + 1] === 'ー' && tc === gc) { st[gi] = 'ok'; ti++; gi += 2; continue; }
      // 小写拗音写成大写（しゃ ← siya）
      if ('ゃゅょ'.indexOf(gc) >= 0 && 'やゆよ'.indexOf(tc) >= 0) {
        st[gi] = 'ok'; ti++; gi++; continue;
      }
      // 促音漏写
      if (gc === 'っ') { st[gi] = 'skip'; gi++; continue; }
      badAt = gi; st[gi] = 'bad'; break;
    }
    var okAll = badAt < 0 && st.every(function (x) { return x === 'ok' || x === 'skip'; });
    var filled = 0;
    for (var k = 0; k < st.length; k++) if (st[k] === 'ok') filled++;
    return { st: st, badAt: badAt, okAll: okAll, filled: filled, total: g.length };
  }

  var api = {
    romajiToKana: romajiToKana,
    kanaToRomaji: kanaToRomaji,
    toHiragana: toHiragana,
    toKatakana: toKatakana,
    norm: norm,
    norm2: norm2,
    compare: compare,
    align: align,
    isKana: function (ch) { return KANA_RE.test(ch); }
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  global.Kana = api;
})(typeof window !== 'undefined' ? window : globalThis);
