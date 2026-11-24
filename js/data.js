window.LG_DATA = (() => {
  const SAVE_KEY = 'moying_wuxia_boundless_v3';
  const DEL_PASS_DEFAULT = '1234';

  // 五大原創武俠宗門（絕不使用天堂職業名稱）
  const CLASSES = {
    royal: {
      id:'royal', n:'天策皇朝', title:'紫微帝君', col:'#e2b857',
      hp:175, mp:115, str:13, con:12, dex:11, wis:12, int:11,
      rng:105, wpnStyle:'greatsword', armorCol:'#9c6f24', cloakCol:'#7a181e'
    },
    knight: {
      id:'knight', n:'玄甲戰殿', title:'鎮獄霸主', col:'#d64545',
      hp:220, mp:80, str:17, con:16, dex:11, wis:8, int:7,
      rng:98, wpnStyle:'katana', armorCol:'#7d8590', cloakCol:'#8c1d22'
    },
    elf: {
      id:'elf', n:'追風獵盟', title:'蒼穹神羿', col:'#49a87e',
      hp:150, mp:130, str:11, con:10, dex:17, wis:13, int:11,
      rng:335, wpnStyle:'bow', armorCol:'#2d6e4e', cloakCol:'#1f4f38'
    },
    mage: {
      id:'mage', n:'太虛靈院', title:'星河大宗師', col:'#58a6ff',
      hp:130, mp:195, str:8, con:9, dex:10, wis:15, int:18,
      rng:310, wpnStyle:'staff', armorCol:'#284b82', cloakCol:'#192c4d'
    },
    darkelf: {
      id:'darkelf', n:'幽冥影閣', title:'無相修羅', col:'#b078f0',
      hp:160, mp:115, str:15, con:11, dex:16, wis:10, int:10,
      rng:94, wpnStyle:'dual', armorCol:'#42295e', cloakCol:'#261538'
    }
  };

  // 化神變身系統（原創神魔化神形態）
  const MORPHS = {
    none:       {id:'none',       n:'本尊真身',   atkSpd:1.0,  moveSpd:1.0,  dmgMult:1.0,  col:null},
    asura:      {id:'asura',      n:'九幽修羅神', atkSpd:1.45, moveSpd:1.28, dmgMult:1.32, col:'#ff4d4f'},
    celestial:  {id:'celestial',  n:'紫微星君',   atkSpd:1.40, moveSpd:1.30, dmgMult:1.36, col:'#ffd666'},
    shadowlord: {id:'shadowlord', n:'無相夜叉王', atkSpd:1.50, moveSpd:1.36, dmgMult:1.28, col:'#b078f0'},
    phoenix:    {id:'phoenix',    n:'焚天朱雀尊', atkSpd:1.42, moveSpd:1.26, dmgMult:1.34, col:'#ff8c42'},
    taichu:     {id:'taichu',     n:'太初混沌體', atkSpd:1.65, moveSpd:1.42, dmgMult:1.55, col:'#58a6ff'}
  };

  // 12 項八荒天賦能力（可自由加點強化）
  const ABILITIES = [
    {id:'critRate', n:'會心一擊', desc:'每級提升 1.5% 暴擊率', max:25},
    {id:'critDmg',  n:'破軍狂暴', desc:'每級提升 8% 暴擊傷害倍率', max:25},
    {id:'lifeSteal',n:'嗜血真氣', desc:'每級攻擊回復 0.8% 造成傷害的生命', max:20},
    {id:'armorPen', n:'貫甲神勁', desc:'每級無視目標 2.5% 護體防禦', max:25},
    {id:'atkSpd',   n:'疾風連斬', desc:'每級提升 2% 基礎出招速度', max:25},
    {id:'hpRegen',  n:'生生不息', desc:'每級每秒額外恢復 0.35% 最大氣血', max:20},
    {id:'mpRegen',  n:'靈泉湧動', desc:'每級每秒額外恢復 0.5% 最大內力', max:20},
    {id:'expBonus', n:'悟道天資', desc:'每級額外獲得 4% 狩獵修為經驗', max:25},
    {id:'goldBonus',n:'聚寶鴻運', desc:'每級額外獲得 5% 銀兩掉落', max:25},
    {id:'dodge',    n:'凌波微步', desc:'每級提升 1.2% 完全閃避敵擊機率', max:20},
    {id:'bossSlayer',n:'屠魔聖印',desc:'每級對首領級強敵傷害 +3%', max:25},
    {id:'petBond',  n:'御獸心訣', desc:'每級隨行靈獸全屬性 +4%', max:25}
  ];

  // 每宗門 30 招完全原創武學與神通（共 150 招，擴充 30 倍技能深度）
  const SKILL_TEMPLATES = {
    royal: [
      ['紫氣東來斬','slash',1.85],['皇道龍威','buff',1.25],['鎮嶽印','ring',2.2],['玄金護體功','buff',1.3],['赤霄劍氣','proj',2.6],
      ['山河破碎斬','line',3.0],['帝王號令','buff',1.35],['天罡八卦陣','ring',3.4],['裂空皇極劍','dash',3.7],['紫微星爆','ring',4.1],
      ['九鼎鎮魂波','line',4.5],['真龍護體訣','buff',1.45],['焚天帝炎斬','arc',4.9],['萬劍歸宗式','fan',5.3],['乾坤無極印','ring',5.8],
      ['太阿破軍刺','dash',6.2],['皇極驚世錄','line',6.7],['聖皇不滅身','buff',1.55],['星河倒懸斬','arc',7.2],['蒼穹帝劍訣','proj',7.8],
      ['八荒六合掌','ring',8.4],['天子封神印','line',9.0],['九霄龍吟破','fan',9.6],['紫金神雷斬','dash',10.3],['無上皇道領域','ring',11.0],
      ['太初帝皇訣','buff',1.7],['混沌開天劍','line',11.8],['萬世永昌斬','arc',12.6],['九天十地唯我尊','ring',13.5],['蒼穹無界帝王斬','nova',15.0]
    ],
    knight: [
      ['破軍三連斬','arc',1.95],['玄鐵金鐘罩','buff',1.25],['震地裂山擊','ring',2.3],['反震護體罡','ring',2.6],['疾風拔刀斬','dash',3.0],
      ['狂戰血怒訣','buff',1.4],['開山裂地斬','line',3.4],['修羅煉獄旋','ring',3.8],['霸王舉鼎式','arc',4.2],['血戰八方斬','fan',4.6],
      ['不動明王身','buff',1.5],['隕星重嶽劈','line',5.1],['鬼神一刀流','dash',5.6],['怒海狂濤斬','arc',6.1],['焚血戰神訣','buff',1.6],
      ['天崩地裂波','ring',6.6],['滅世魔刀斬','line',7.2],['龍象般若功','buff',1.65],['蒼狼嘯月斬','dash',7.8],['煉獄修羅陣','ring',8.5],
      ['千軍橫掃式','arc',9.2],['玄甲不破壁','buff',1.75],['九幽冥火刀','line',9.9],['擎天巨靈斬','ring',10.7],['戰神降臨訣','buff',1.85],
      ['混沌破滅刀','dash',11.5],['星辰粉碎擊','ring',12.4],['無雙霸皇斬','arc',13.3],['太古魔神變','nova',14.2],['蒼穹無界霸王訣','nova',16.0]
    ],
    elf: [
      ['連珠三箭','fan',1.45],['御風心訣','buff',1.25],['疾電步法','buff',1.3],['穿雲破風箭','proj',2.5],['暴雨梨花箭','fan',2.9],
      ['藤蔓纏繞陣','ring',3.3],['烈陽焚天箭','proj',3.7],['追星趕月式','dash',4.1],['寒霜冰封矢','fan',4.5],['自然之靈護佑','heal',1.0],
      ['九天落日箭','line',5.0],['風雷雙翼訣','buff',1.45],['萬箭穿心陣','ring',5.5],['幽冥毒龍矢','proj',6.0],['蒼鷹俯衝擊','dash',6.5],
      ['星辰隕落箭','ring',7.1],['神羿開天弓','line',7.7],['翡翠生命泉','heal',1.25],['極光幻影箭','fan',8.3],['颶風龍捲陣','ring',9.0],
      ['破魔聖光矢','proj',9.7],['踏雪無痕訣','buff',1.6],['九星連珠射','fan',10.5],['雷霆萬鈞箭','line',11.3],['蒼穹箭雨風暴','ring',12.1],
      ['神風無影步','dash',13.0],['太古星神箭','proj',13.9],['焚世鳳凰矢','fan',14.8],['天穹滅魔箭陣','nova',15.8],['蒼穹無界神羿訣','nova',17.2]
    ],
    mage: [
      ['太虛靈彈','proj',1.95],['回春甘霖訣','heal',1.0],['玄冰刺骨術','proj',2.4],['焚天業火陣','ring',2.9],['九天引雷術','line',3.4],
      ['星辰護體結界','buff',1.45],['極寒暴風雪','ring',3.9],['赤炎流星火球','proj',4.4],['紫霄神雷轟','line',5.0],['大日如來咒','heal',1.3],
      ['隕石天降術','ring',5.6],['太極兩儀陣','ring',6.2],['虚空裂縫斬','line',6.8],['元素潮汐訣','buff',1.55],['九幽寒冰獄','ring',7.5],
      ['焚世太陽真火','proj',8.2],['天劫雷罰陣','line',8.9],['星河倒灌術','fan',9.6],['不死鳳凰涅槃','heal',1.6],['混沌黑洞術','ring',10.4],
      ['太虛神光破','line',11.2],['萬象天引陣','ring',12.0],['九天玄女守護','buff',1.75],['滅世紅蓮業火','fan',12.9],['宇宙星爆術','nova',13.8],
      ['時空凝滯咒','ring',14.7],['太初混沌神雷','line',15.6],['創世神光審判','nova',16.6],['無極大道真言','buff',1.95],['蒼穹無界星辰訣','nova',18.5]
    ],
    darkelf: [
      ['鬼影迷蹤步','buff',1.3],['無相雙刃斬','arc',2.1],['暗夜毒牙刺','dash',2.5],['血影遁形訣','buff',1.35],['修羅殺意決','buff',1.45],
      ['迴旋幽冥刃','ring',3.2],['瞬獄影殺陣','dash',3.7],['碎甲破軍刺','line',4.2],['千手修羅舞','arc',4.7],['暗影分身斬','fan',5.2],
      ['九幽噬魂刃','dash',5.8],['夜叉鬼面訣','buff',1.55],['血月輪迴斬','ring',6.4],['絕命連環刺','line',7.0],['無影幻殺陣','dash',7.6],
      ['幽冥鬼火閃','arc',8.3],['修羅煉獄殺','ring',9.0],['暗黑聖堂步','buff',1.65],['百鬼夜行斬','fan',9.8],['一劍封喉式','dash',10.6],
      ['深淵魔影破','line',11.4],['嗜血狂魔訣','buff',1.75],['九天十地絕殺','ring',12.3],['虛空暗殺術','dash',13.2],['萬劫不復斬','arc',14.1],
      ['影魔真身降臨','buff',1.9],['滅魂無相刃','fan',15.1],['終焉審判之影','nova',16.2],['太古修羅血祭','nova',17.4],['蒼穹無界暗影訣','nova',19.0]
    ]
  };

  const SKILLS = {};
  for(const [cls, list] of Object.entries(SKILL_TEMPLATES)){
    SKILLS[cls] = list.map((item, idx) => {
      const reqLv = idx === 0 ? 1 : Math.min(360, idx * 11);
      const mpCost = Math.round(10 + idx * 6.5);
      const cd = Number((2.2 + (idx % 6) * 1.15).toFixed(2));
      return [item[0], reqLv, mpCost, cd, item[2], item[1]];
    });
  }

  // 10 大品階武器與防具（超過 80 件神兵寶甲，擴充 30 倍裝備深度）
  const TIER_NAMES = ['精鐵','百鍊','寒玉','赤霄','紫電','玄冥','星隕','蒼穹','混沌','太初'];
  const WPN_ARCHETYPES = [
    ['短刃','wpn',8,1,6,45,'#c8d2dc'],
    ['長劍','wpn',14,2,6,110,'#e8f0f8'],
    ['戰刀','wpn',18,2,6,160,'#f2b866'],
    ['神弓','wpn',17,4,6,170,'#63d49c'],
    ['靈杖','wpn',20,3,6,190,'#6bb5ff'],
    ['雙刺','wpn',21,4,6,210,'#b078f0'],
    ['重戟','wpn',26,3,6,260,'#ff7875']
  ];
  const ARM_ARCHETYPES = [
    ['布衣','arm',4,30,6,40,'#8c6239'],
    ['皮甲','arm',7,65,6,95,'#3d8c66'],
    ['鎖子甲','arm',11,110,5,150,'#5c7cfa'],
    ['玄鐵重鎧','arm',16,175,4,220,'#9aa4b0'],
    ['法袍披風','arm',13,220,4,240,'#9775fa']
  ];

  const GEAR_DB = [];
  TIER_NAMES.forEach((tName, tIdx) => {
    const tier = tIdx + 1;
    const scale = Math.pow(1.48, tIdx);
    WPN_ARCHETYPES.forEach(([wName, slot, baseAtk, baseHit, safe, basePrice, col], wIdx) => {
      GEAR_DB.push({
        id: `wpn_t${tier}_${wIdx}`,
        name: `${tName}${wName}`,
        slot,
        atk: Math.round(baseAtk * scale),
        hit: Math.round(baseHit + tIdx * 1.5),
        safe,
        price: Math.round(basePrice * Math.pow(1.62, tIdx)),
        tier,
        col
      });
    });
    ARM_ARCHETYPES.forEach(([aName, slot, baseAc, baseHp, safe, basePrice, col], aIdx) => {
      GEAR_DB.push({
        id: `arm_t${tier}_${aIdx}`,
        name: `${tName}${aName}`,
        slot,
        ac: Math.round(baseAc * scale),
        hp: Math.round(baseHp * scale),
        safe,
        price: Math.round(basePrice * Math.pow(1.62, tIdx)),
        tier,
        col
      });
    });
  });

  // 靈丹、符籙與鍛造神符（原創道具）
  const ITEMS = {
    redPot:      {id:'redPot',      n:'金瘡藥(小)',   desc:'立即恢復 40% 最大氣血', price:15},
    orangePot:   {id:'orangePot',   n:'九轉大還丹',   desc:'立即恢復 78% 最大氣血', price:45},
    superPot:    {id:'superPot',    n:'太乙神仙露',   desc:'立即全滿恢復氣血與內力', price:140},
    mpPot:       {id:'mpPot',       n:'聚靈回氣丹',   desc:'立即恢復 65% 最大內力', price:35},
    greenPot:    {id:'greenPot',    n:'疾風神行丹',   desc:'60秒內出招速度與移速 +30%', price:35},
    ragePot:     {id:'ragePot',     n:'龍虎大力丸',   desc:'60秒內全攻擊力暴增 +35%', price:80},
    expScroll:   {id:'expScroll',   n:'悟道雙倍丹',   desc:'120秒內狩獵獲得修為經驗翻倍', price:180},
    homeScroll:  {id:'homeScroll',  n:'青雲回城符',   desc:'瞬間傳送回青雲古鎮安全區', price:25},
    wpnScroll:   {id:'wpnScroll',   n:'神兵鍛造符',   desc:'強化武器 +1（超過安定值可能碎裂）', price:95},
    armScroll:   {id:'armScroll',   n:'護甲鍛造符',   desc:'強化防具 +1（超過安定值可能碎裂）', price:85},
    blessWpn:    {id:'blessWpn',    n:'天工造化神符', desc:'強化武器 +1~+3（高機率跳階）', price:280},
    blessArm:    {id:'blessArm',    n:'玄武護靈神符', desc:'強化防具 +1~+2（大幅提升成功率）', price:250},
    safeStone:   {id:'safeStone',   n:'女媧補天石',   desc:'防止一次強化失敗碎裂（自動消耗）', price:420},
    morphScroll: {id:'morphScroll', n:'上古化神丹',   desc:'120秒內化身為上古神魔（全能力暴漲）', price:90}
  };

  // 10 種上古靈獸（各有獨立造型、定位與數值）
  const PETS = {
    wolf:    {id:'wolf',    n:'嘯月蒼狼',   role:'疾風連咬 · 忠犬護主', col:'#8a99ad', baseAtk:18, baseHp:180, spd:220, cd:1.0,  cost:100},
    bear:    {id:'bear',    n:'撼地玄熊',   role:'重掌震嶽 · 鐵壁坦怪', col:'#9e693b', baseAtk:25, baseHp:340, spd:165, cd:1.45, cost:240},
    hawk:    {id:'hawk',    n:'金翅大鵬',   role:'烈陽羽箭 · 遠程狙擊', col:'#e2b857', baseAtk:22, baseHp:170, spd:250, cd:1.05, cost:360},
    fox:     {id:'fox',     n:'九尾天狐',   role:'魅惑靈火 · 群體灼燒', col:'#ff85a2', baseAtk:28, baseHp:210, spd:240, cd:1.1,  cost:580},
    tiger:   {id:'tiger',   n:'雷霆白虎',   role:'紫電撲殺 · 極致暴擊', col:'#f0f4f8', baseAtk:36, baseHp:290, spd:245, cd:0.95, cost:880},
    turtle:  {id:'turtle',  n:'北海玄武',   role:'玄冥水盾 · 震盪反傷', col:'#38a3a5', baseAtk:30, baseHp:520, spd:150, cd:1.4,  cost:1250},
    phoenix: {id:'phoenix', n:'焚天朱雀',   role:'紅蓮鳳焰 · 廣域爆裂', col:'#ff595e', baseAtk:44, baseHp:320, spd:260, cd:1.0,  cost:1800},
    qilin:   {id:'qilin',   n:'祥瑞火麒麟', role:'麒麟聖踏 · 破甲神威', col:'#ffbe0b', baseAtk:54, baseHp:450, spd:245, cd:0.95, cost:2600},
    dragon:  {id:'dragon',  n:'太古應龍',   role:'九霄龍息 · 貫穿雷霆', col:'#4cc9f0', baseAtk:68, baseHp:560, spd:265, cd:0.9,  cost:3800},
    taotie:  {id:'taotie',  n:'混沌饕餮',   role:'吞天噬地 · 終極神獸', col:'#b5179e', baseAtk:88, baseHp:760, spd:255, cd:0.85, cost:5500}
  };

  // 50 倍廣闊主地圖 + 30 座獨立地宮（dun1 ~ dun30，最高 Lv.399 首領）
  const MAPS = {
    island: {
      id:'island', n:'青雲大荒原（五十倍無界）', w:22000, h:18000, theme:'island',
      safe:{x:10600, y:8600, w:800, h:640, n:'青雲古鎮 · 絕對安全區'},
      portals:[
        {x:11000, y:8650, label:'無盡地宮傳送陣：前往第 1 重【幽冥礦坑】', toMap:'dun1', tx:420, ty:420}
      ]
    }
  };

  const DUNGEON_NAMES = [
    '幽冥礦坑','白骨荒塚','毒霧沼澤','黑風寨秘窟','赤焰熔岩洞','寒冰玄晶淵','千機機關城','血月祭壇','萬蛇窟深處','修羅試煉場',
    '鬼哭幽谷','天魔封印塔','紫電雷池','沉淪古戰場','九幽黃泉道','煉獄炎魔殿','星隕廢墟','無相幻境','太古龍骨淵','混沌裂隙一層',
    '冥河擺渡口','天劫試煉殿','血海修羅界','諸神黃昏陵','太虛破碎境','九天鎮魔塔','魔神心臟核心','鴻蒙禁區','混沌邊界','太初滅世神殿'
  ];

  for(let f=1; f<=30; f++){
    const id = `dun${f}`;
    const prevMap = f === 1 ? 'island' : `dun${f-1}`;
    const prevTx = f === 1 ? 11000 : 2800;
    const prevTy = f === 1 ? 8850 : 2300;
    const theme = f <= 10 ? 'dungeon' : (f <= 20 ? 'abyss' : 'celestial');
    const portals = [
      {x:360, y:360, label:`返回：${f===1?'青雲古鎮':`第 ${f-1} 重地宮`}`, toMap:prevMap, tx:prevTx, ty:prevTy}
    ];
    if(f < 30){
      portals.push({
        x:3100, y:2500,
        label:`深淵傳送門：前往第 ${f+1} 重【${DUNGEON_NAMES[f]}】`,
        toMap:`dun${f+1}`, tx:400, ty:400
      });
    }
    MAPS[id] = {
      id,
      n: `第 ${f} 重地宮 · ${DUNGEON_NAMES[f-1]}`,
      floor: f,
      w: 3600 + f * 60,
      h: 3000 + f * 50,
      theme,
      safe: {x:260, y:260, w:320, h:280, n:`第 ${f} 重結界營地 · 安全區`},
      portals
    };
  }

  // 80+ 原創異獸與 30 層地宮首領（直達 Lv.399 太初魔尊）
  const MONSTERS = {
    // 荒野基礎異獸 (Lv.1 ~ Lv.35)
    goblin:   {id:'goblin',   n:'腐牙山魈',   lv:1,   hp:55,    atk:8,    ac:0,   exp:18,   adena:[8,18],     spd:95,  r:15, lawful:10,  aggro:180, acd:1.15, shape:'goblin', col:'#5c9c48'},
    boar:     {id:'boar',     n:'赤眼獠豬',   lv:3,   hp:90,    atk:13,   ac:2,   exp:28,   adena:[14,28],    spd:105, r:17, lawful:15,  aggro:190, acd:1.1,  shape:'beast',  col:'#8d5b4c'},
    werewolf: {id:'werewolf', n:'銀背魔狼',   lv:6,   hp:155,   atk:21,   ac:4,   exp:52,   adena:[24,45],    spd:118, r:18, lawful:25,  aggro:215, acd:1.05, shape:'wolf',   col:'#6d7a8c'},
    orc:      {id:'orc',      n:'黑風寨刀客', lv:10,  hp:260,   atk:32,   ac:7,   exp:90,   adena:[40,75],    spd:98,  r:19, lawful:35,  aggro:225, acd:1.1,  shape:'orc',    col:'#4a7c3a'},
    viper:    {id:'viper',    n:'碧鱗毒蟒',   lv:15,  hp:410,   atk:46,   ac:11,  exp:145,  adena:[65,120],   spd:112, r:19, lawful:50,  aggro:240, acd:1.0,  shape:'serpent',col:'#2a9d8f'},
    shelob:   {id:'shelob',   n:'鬼面人面蛛', lv:22,  hp:720,   atk:68,   ac:16,  exp:250,  adena:[110,190],  spd:110, r:22, lawful:75,  aggro:255, acd:1.0,  shape:'spider', col:'#5a189a'},
    golem:    {id:'golem',    n:'千鈞玄鐵傀儡',lv:30, hp:1250,  atk:95,   ac:25,  exp:420,  adena:[180,310],  spd:80,  r:25, lawful:110, aggro:250, acd:1.25, shape:'golem',  col:'#6c757d'}
  };

  // 為 30 座地宮動態生成對應等級小怪與首領（第 30 層首領精準達到 Lv.399！）
  const MOB_PREFIX = ['幽冥','白骨','赤炎','寒霜','紫電','血煞','修羅','混沌','太古','滅世'];
  const MOB_ARCH = [
    ['骷髏刀衛','skel','#ded8c8'],
    ['煉獄魔蛛','spider','#6a040f'],
    ['玄晶巨像','golem','#48cae4'],
    ['九幽魔狼','wolf','#7209b7'],
    ['深淵雙頭蟒','serpent','#38b000'],
    ['墮落魔修','orc','#9d0208']
  ];

  for(let f=1; f<=30; f++){
    const baseLv = Math.round(10 + (f - 1) * 12.6);
    const pref = MOB_PREFIX[(f - 1) % MOB_PREFIX.length];
    const arch1 = MOB_ARCH[(f * 2) % MOB_ARCH.length];
    const arch2 = MOB_ARCH[(f * 2 + 1) % MOB_ARCH.length];

    const makeStats = (lv, isBoss) => {
      const mult = isBoss ? 5.2 : 1.0;
      const hp = Math.round((65 + Math.pow(lv, 1.72) * 14) * mult);
      const atk = Math.round((10 + Math.pow(lv, 1.24) * 3.1) * (isBoss ? 1.48 : 1.0));
      const ac = Math.round((2 + lv * 1.15) * (isBoss ? 1.35 : 1.0));
      const exp = Math.round((25 + Math.pow(lv, 1.48) * 9) * (isBoss ? 6.5 : 1.0));
      const goldMin = Math.round((15 + lv * 9) * (isBoss ? 8 : 1));
      return { hp, atk, ac, exp, adena:[goldMin, Math.round(goldMin * 1.65)] };
    };

    const m1 = makeStats(baseLv, false);
    MONSTERS[`d${f}_m1`] = {
      id:`d${f}_m1`, n:`${pref}${arch1[0]}`, lv:baseLv, ...m1,
      spd:102 + (f % 15), r:18 + Math.min(8, Math.floor(f/5)),
      lawful:20 + f * 8, aggro:240, acd:1.05, shape:arch1[1], col:arch1[2]
    };

    const m2Lv = baseLv + 4;
    const m2 = makeStats(m2Lv, false);
    MONSTERS[`d${f}_m2`] = {
      id:`d${f}_m2`, n:`狂暴·${pref}${arch2[0]}`, lv:m2Lv, ...m2,
      spd:108 + (f % 15), r:20 + Math.min(8, Math.floor(f/5)),
      lawful:30 + f * 10, aggro:255, acd:1.0, shape:arch2[1], col:arch2[2]
    };

    // 第 30 重地宮首領等級 = 399！
    const bossLv = f === 30 ? 399 : Math.round(18 + (f - 1) * 13.1);
    const bs = makeStats(bossLv, true);
    const bossName = f === 30 ? '混沌滅世魔尊·太初' : `${DUNGEON_NAMES[f-1]}霸主·${pref}魔君`;
    MONSTERS[`d${f}_boss`] = {
      id:`d${f}_boss`, n:bossName, lv:bossLv, ...bs,
      spd:115, r:34, lawful:200 + f * 35, aggro:360, acd:0.95,
      shape: f % 2 === 0 ? 'dkboss' : 'boss',
      col: f === 30 ? '#ff0055' : '#c82333',
      boss:true, dungeonFloor:f
    };
  }

  return { SAVE_KEY, DEL_PASS_DEFAULT, CLASSES, MORPHS, ABILITIES, SKILLS, GEAR_DB, ITEMS, PETS, MAPS, MONSTERS };
})();