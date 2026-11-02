// reclassify_grammar.js — 把平铺+N级 的 grammar.json 重组为思维导图结构
const fs = require('fs');
const path = 'C:/Users/lenovo/Documents/deepseek-harness/default-workspace/jp-type/data/grammar.json';

const src = JSON.parse(fs.readFileSync(path, 'utf8'));
const items = src.items;

// 三阶修道难度（取代 N1~N5）
const TIER = {
  zhuji:   { id: 'zhuji',   name: '筑基', order: 1, note: '入门根基 · 日常必会' },
  ningqi:  { id: 'ningqi',  name: '凝气', order: 2, note: '进阶运化 · 表达更细' },
  huashen: { id: 'huashen', name: '化神', order: 3, note: '登顶心法 · N1 高阶' }
};
function tierOf(level) {
  if (level === 'n5' || level === 'n4') return 'zhuji';
  if (level === 'n3' || level === 'n2') return 'ningqi';
  return 'huashen';
}

// id -> [trunkId, branchId]
const MAP = {
  // T1 时态·体态
  'n5-masu':'t_time|b_conj','n5-te':'t_time|b_conj','n5-ta':'t_time|b_conj','n5-nai':'t_time|b_conj','n5-nakatta':'t_time|b_conj','n5-mada':'t_time|b_conj','n4-tokoroda':'t_time|b_conj',
  'n5-teiru':'t_time|b_aspect','n5-tearu':'t_time|b_aspect','n5-kotoga':'t_time|b_aspect','n3-koto-ga-dekiru':'t_time|b_aspect','n4-kotogaaru':'t_time|b_aspect',
  'n5-simau':'t_time|b_perfect','n3-teishimau':'t_time|b_perfect','n5-ok':'t_time|b_perfect','n4-teok':'t_time|b_perfect','n3-teoku-prep':'t_time|b_perfect','n2-teoku-n2':'t_time|b_perfect','n2-teoku-n3':'t_time|b_perfect',
  'n5-iku-kuru':'t_time|b_tend','n2-teiku':'t_time|b_tend','n2-tekuru':'t_time|b_tend',
  'n4-mada':'t_time|b_conj',
  'n5-moii':'t_time|b_modal','n5-waikenai':'t_time|b_modal','n5-nakerebanaranai':'t_time|b_modal','n4-nchigai':'t_time|b_modal','n1-zaru':'t_time|b_modal','n1-beki':'t_time|b_modal','n2-koto-ni':'t_time|b_modal','n1-zuniwa':'t_time|b_modal','n1-inai-de':'t_time|b_modal','n1-miso3':'t_time|b_modal',
  // T2 条件·假定
  'n5-ba':'t_cond|b_basic','n5-to':'t_cond|b_basic','n5-tara':'t_cond|b_basic','n5-nara':'t_cond|b_basic',
  'n3-to-nitemo':'t_cond|b_suppose','n1-toie':'t_cond|b_suppose','n2-toie':'t_cond|b_suppose','n1-toite':'t_cond|b_suppose','n1-toiutemo':'t_cond|b_suppose','n1-toiutemo2':'t_cond|b_suppose','n1-itte':'t_cond|b_suppose','n1-toieba':'t_cond|b_suppose','n1-toiereba':'t_cond|b_suppose',
  // T3 因果·理由
  'n5-node':'t_cause|b_obj','n5-kara':'t_cause|b_obj','n4-node-conf':'t_cause|b_obj','n3-nakute':'t_cause|b_obj','n3-node-soft':'t_cause|b_obj','n1-node-ya':'t_cause|b_obj','n1-node-ka':'t_cause|b_obj','n1-node-ya2':'t_cause|b_obj','n1-node-ya3':'t_cause|b_obj',
  'n3-mono':'t_cause|b_subj','n3-monoda':'t_cause|b_subj','n4-kuse':'t_cause|b_subj','n3-kuseni':'t_cause|b_subj','n2-kuse-n2':'t_cause|b_subj',
  'n3-okagade':'t_cause|b_procon','n3-sewa':'t_cause|b_procon',
  // T4 逆接·转折
  'n3-nchigau-yo':'t_contrast|b_plain','n2-node-ni':'t_contrast|b_plain','n2-nagara':'t_contrast|b_plain','n2-kawari':'t_contrast|b_plain','n3-kawari':'t_contrast|b_plain','n1-mono-wo':'t_contrast|b_plain',
  'n4-temoii':'t_contrast|b_concede','n3-node-demo':'t_contrast|b_concede','n2-teikanai':'t_contrast|b_concede','n1-miso':'t_contrast|b_concede','n1-node-niwa':'t_contrast|b_concede','n1-miso2':'t_contrast|b_concede','n1-miso4':'t_contrast|b_concede','n1-miso5':'t_contrast|b_concede','n5-exclam':'t_contrast|b_concede',
  // T5 语气·推测
  'n5-soudesu':'t_mood|b_guess','n5-rashii':'t_mood|b_guess','n4-hazu':'t_mood|b_guess','n4-kamosirenai':'t_mood|b_guess','n4-nchigainai':'t_mood|b_guess','n4-souda-hearsay':'t_mood|b_guess','n2-ppoi2':'t_mood|b_guess','n3-ka-douka':'t_mood|b_guess','n2-ka-wa':'t_mood|b_guess',
  'n5-mitai':'t_mood|b_appear','n1-maka4':'t_mood|b_appear','n1-ppan3':'t_mood|b_appear','n1-ppan4':'t_mood|b_appear','n1-ppan5':'t_mood|b_appear','n2-ppan':'t_mood|b_appear','n1-gotoki':'t_mood|b_appear','n1-nbakari':'t_mood|b_appear',
  'n5-tai':'t_mood|b_wish','n4-tsumori':'t_mood|b_wish','n3-tsumori-de':'t_mood|b_wish','n4-yotei':'t_mood|b_wish','n3-naritai':'t_mood|b_wish','n3-youni-naru':'t_mood|b_wish','n4-naruhodo':'t_mood|b_wish','n3-tekudasai':'t_mood|b_wish','n5-mashou':'t_mood|b_wish','n4-tekure':'t_mood|b_wish','n5-garu':'t_mood|b_wish','n1-beku':'t_mood|b_wish','n1-yari':'t_mood|b_wish',
  'n5-nomitai':'t_mood|b_wish',
  // T6 授受·敬语
  'n5-kureru':'t_give|b_basic','n4-teagemasu':'t_give|b_hon','n3-teage':'t_give|b_hon','n4-nchigau':'t_contrast|b_plain',
  // T7 被动·使役
  'n5-passive':'t_voice|b_pass','n5-causative':'t_voice|b_caus','n3-causative-passive':'t_voice|b_causpass',
  // T8 目的·手段·依据
  'n5-niiku':'t_purpose|b_purp','n3-tame-ni':'t_purpose|b_purp','n5-youni':'t_purpose|b_purp',
  'n4-teform':'t_purpose|b_means','n2-womotte':'t_purpose|b_means','n2-ikande':'t_purpose|b_means','n1-ppan2':'t_purpose|b_means','n1-ikkan':'t_purpose|b_means','n1-katagata':'t_purpose|b_means',
  'n2-toitukara':'t_purpose|b_rel','n2-tajyou':'t_purpose|b_rel','n2-node-oni':'t_purpose|b_rel','n2-awase':'t_purpose|b_rel',
  // T9 名词化·引用·说明
  'n4-no':'t_nominal|b_nom','n4-youni-iu':'t_nominal|b_quote','n3-no-desu':'t_nominal|b_quote','n4-ka':'t_nominal|b_quote','n4-kke':'t_nominal|b_quote','n3-koto-ni-suru':'t_nominal|b_quote','n2-koto-ni':'t_nominal|b_quote',
  'n1-taru':'t_nominal|b_status','n2-maka':'t_nominal|b_status',
  // T10 限定·强调·列举
  'n4-dake':'t_limit|b_lim','n4-shika':'t_limit|b_lim','n2-shika-nai':'t_limit|b_lim','n2-shika-nai2':'t_limit|b_lim','n3-kiri':'t_limit|b_lim','n1-maka9':'t_limit|b_lim','n2-kagiri':'t_limit|b_lim','n2-kagiride':'t_limit|b_lim',
  'n2-koso':'t_limit|b_emph','n2-sae':'t_limit|b_emph','n1-koso':'t_limit|b_emph','n1-koso2':'t_limit|b_emph','n1-koso3':'t_limit|b_emph','n1-nominarazu':'t_limit|b_emph','n1-dani':'t_limit|b_emph','n3-kara-ii':'t_limit|b_emph','n2-mono-ka':'t_limit|b_emph','n1-sokonomu':'t_limit|b_emph','n1-maka7':'t_limit|b_emph',
  'n5-tari-tari':'t_limit|b_enum','n4-bakaride':'t_limit|b_enum','n3-nado':'t_limit|b_enum','n1-yara':'t_limit|b_enum','n1-tari':'t_limit|b_enum','n1-maka3':'t_limit|b_enum','n1-maka5':'t_limit|b_enum','n1-maka8':'t_limit|b_enum','n1-maka10':'t_limit|b_enum','n1-o-hajime':'t_limit|b_enum',
  'n2-dokoro':'t_limit|b_progneg','n3-bakari-ill':'t_limit|b_progneg',
  // T11 程度·结果·极致
  'n4-bakari':'t_degree|b_deg','n4-nounikui':'t_degree|b_deg','n2-bakari':'t_degree|b_deg','n2-gachi':'t_degree|b_deg',
  'n5-hougaii':'t_degree|b_comp','n3-naihougaii':'t_degree|b_comp',
  'n2-node-res':'t_degree|b_res','n1-node-res2':'t_degree|b_res','n1-node-res3':'t_degree|b_res','n1-node-res4':'t_degree|b_res',
  'n1-makade':'t_degree|b_extreme','n1-maka2':'t_degree|b_extreme','n1-maka6':'t_degree|b_extreme',
  // T12 契机·时点·期间
  'n2-tohan':'t_timing|b_chance','n2-tohan2':'t_timing|b_chance','n2-tohan3':'t_timing|b_chance','n2-tohan4':'t_timing|b_chance','n2-tohan5':'t_timing|b_chance','n1-tohan6':'t_timing|b_chance','n1-tohan7':'t_timing|b_chance','n1-tohan8':'t_timing|b_chance','n1-tohan9':'t_timing|b_chance','n1-tohan10':'t_timing|b_chance','n1-tohan11':'t_timing|b_chance','n1-tohan12':'t_timing|b_chance','n1-aatte':'t_timing|b_chance','n1-atarashite':'t_timing|b_chance',
  'n2-aida':'t_timing|b_time','n2-ouchi':'t_timing|b_time','n5-toki':'t_timing|b_time','n3-kotogaaru':'t_timing|b_time','n1-sobakara':'t_timing|b_time',
  'n1-hayai':'t_timing|b_instant','n1-ka-to':'t_timing|b_instant'
};

// 主干与分支定义
const TRUNKS = [
  { id:'t_time', name:'时间的流转', icon:'⏳', color:'#7fd1b0', desc:'时态、体态、完成与情态——时间如何在句中流淌', branches:[
    { id:'b_conj', name:'接续与时态', desc:'基本形、过去、否定、尚未' },
    { id:'b_aspect', name:'进行与状态', desc:'正在进行、结果状态、能力' },
    { id:'b_perfect', name:'完成·准备·存续', desc:'做完、预先准备、保持状态' },
    { id:'b_tend', name:'趋向移动', desc:'……下去 / ……过来' },
    { id:'b_modal', name:'情态·义务', desc:'可以、禁止、必须、不得不' }
  ]},
  { id:'t_cond', name:'条件的门径', icon:'🚪', color:'#9bd1a0', desc:'假设、条件、若然——说出“如果”的千百种姿态', branches:[
    { id:'b_basic', name:'基本条件', desc:'ば / と / たら / なら' },
    { id:'b_suppose', name:'假定与若然', desc:'即便、虽说、若如此' }
  ]},
  { id:'t_cause', name:'因果的因由', icon:'🌿', color:'#88c0d0', desc:'原因、理由、利弊——前因如何结出后果', branches:[
    { id:'b_obj', name:'客观原因', desc:'因为（客观、礼貌）' },
    { id:'b_subj', name:'主观理由', desc:'因为（辩解、强调）' },
    { id:'b_procon', name:'利弊缘由', desc:'多亏 / 都怪' }
  ]},
  { id:'t_contrast', name:'逆流的转折', icon:'🍂', color:'#d8c79a', desc:'然而、虽然、即便——转折处的张力', branches:[
    { id:'b_plain', name:'单纯逆接', desc:'但是、却、代替' },
    { id:'b_concede', name:'让步与极限', desc:'即使…也、并非不…' }
  ]},
  { id:'t_mood', name:'心念的语气', icon:'🔮', color:'#c8a2c8', desc:'推测、传闻、样态、愿望——心之所向', branches:[
    { id:'b_guess', name:'推测与传闻', desc:'好像、也许、听说' },
    { id:'b_appear', name:'样态与比喻', desc:'看起来、像…一般' },
    { id:'b_wish', name:'愿望与意向', desc:'想、打算、请、为了' }
  ]},
  { id:'t_give', name:'施与受', icon:'🤝', color:'#e0a96d', desc:'授受与敬语——谁为谁做', branches:[
    { id:'b_basic', name:'基础授受', desc:'给我 / 我给 / 我请' },
    { id:'b_hon', name:'敬语授受', desc:'自谦与尊敬的表达' }
  ]},
  { id:'t_voice', name:'受制与驱使', icon:'⛓️', color:'#b08dab', desc:'被动、使役、使役被动', branches:[
    { id:'b_pass', name:'被动', desc:'被…' },
    { id:'b_caus', name:'使役', desc:'让…做' },
    { id:'b_causpass', name:'使役被动', desc:'被迫…' }
  ]},
  { id:'t_purpose', name:'行事之法', icon:'🎯', color:'#a3c9a8', desc:'目的、手段、依据、关联', branches:[
    { id:'b_purp', name:'目的', desc:'为了…' },
    { id:'b_means', name:'手段与依据', desc:'用…、基于…' },
    { id:'b_rel', name:'关联与对象', desc:'关于、对、伴随' }
  ]},
  { id:'t_nominal', name:'言辞化境', icon:'📜', color:'#c9b458', desc:'名词化、引用、说明、资格', branches:[
    { id:'b_nom', name:'名词化', desc:'こと / の' },
    { id:'b_quote', name:'引用与说明', desc:'说…、是…的' },
    { id:'b_status', name:'资格与状态', desc:'作为…、保持…' }
  ]},
  { id:'t_limit', name:'收束之力', icon:'🔒', color:'#d98c7a', desc:'限定、强调、列举、递进', branches:[
    { id:'b_lim', name:'限定', desc:'只、仅、无非' },
    { id:'b_emph', name:'强调', desc:'正是、连、哪怕' },
    { id:'b_enum', name:'列举并列', desc:'又…又…、…等' },
    { id:'b_progneg', name:'递进与否定', desc:'别说…连…、一味' }
  ]},
  { id:'t_degree', name:'量之衡', icon:'⚖️', color:'#c0a0c0', desc:'程度、比较、结果、极致', branches:[
    { id:'b_deg', name:'程度与倾向', desc:'容易、往往、带有…' },
    { id:'b_comp', name:'比较与建议', desc:'最好、不如不' },
    { id:'b_res', name:'结果归结', desc:'最后、经过…' },
    { id:'b_extreme', name:'极致', desc:'…之极、…之至' }
  ]},
  { id:'t_timing', name:'机缘际会', icon:'🕰️', color:'#9aa7d8', desc:'契机、时点、期间、即刻', branches:[
    { id:'b_chance', name:'契机与节点', desc:'以…为契机、当…时' },
    { id:'b_time', name:'期间与时点', desc:'趁…、在…期间' },
    { id:'b_instant', name:'即刻', desc:'刚…就…' }
  ]}
];

// 校验覆盖
const missing = items.filter(function(it){ return !MAP[it.id]; });
if (missing.length) { console.log('UNMAPPED:', missing.map(function(m){return m.id;}).join(', ')); }

const byId = {};
items.forEach(function(it){
  var mb = MAP[it.id];
  var trunk = mb ? mb.split('|')[0] : 't_time';
  var branch = mb ? mb.split('|')[1] : 'b_conj';
  var tier = tierOf(it.level);
  byId[it.id] = it;
  it.trunk = trunk; it.branch = branch; it.tier = tier;
});

// 组装 trunks 树（只含已映射的 branch/point）
var outTrunks = TRUNKS.map(function(t){
  var brs = t.branches.map(function(b){
    var pts = items.filter(function(it){ return it.trunk===t.id && it.branch===b.id; })
                    .map(function(it){ return it.id; });
    return { id:b.id, name:b.name, desc:b.desc, points:pts };
  }).filter(function(b){ return b.points.length; });
  return { id:t.id, name:t.name, icon:t.icon, color:t.color, desc:t.desc, branches:brs,
           count: brs.reduce(function(s,b){ return s+b.points.length; },0) };
});

const out = {
  books: src.books,
  tiers: [TIER.zhuji, TIER.ningqi, TIER.huashen],
  trunks: outTrunks,
  items: items.map(function(it){
    return { id:it.id, pattern:it.pattern, reading:it.reading, kana:it.kana, mean:it.mean,
             book:it.book, note:it.note, tier:it.tier, trunk:it.trunk, branch:it.branch, examples:it.examples };
  })
};
fs.writeFileSync(path, JSON.stringify(out, null, 1), 'utf8');
console.log('OK items=' + items.length + ' trunks=' + outTrunks.length);
outTrunks.forEach(function(t){ console.log('  ' + t.name + ' (' + t.count + ')'); });
