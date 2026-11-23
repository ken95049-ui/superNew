(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { SAVE_KEY, DEL_PASS_DEFAULT, CLASSES, MORPHS, ABILITIES, SKILLS, GEAR_DB, ITEMS, PETS, MAPS, MONSTERS } = window.LG_DATA;
  const { worldToIso, isoToWorld, drawIsoFloor, drawIsoPillar, drawHero, drawPet, drawMonster } = window.LG_RENDER;
  const SFX = window.LG_AUDIO;

  const memStore = {};
  const sGet = k => { try{ return localStorage.getItem(k); }catch(_){ return memStore[k] || null; } };
  const sSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(_){} memStore[k] = v; };
  const sDel = k => { try{ localStorage.removeItem(k); }catch(_){} delete memStore[k]; };

  const rand = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const inRect = (r, x, y, m=0) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;

  function broadcast(msg){
    const el = $('sysBanner');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(broadcast._t);
    broadcast._t = setTimeout(()=>el.classList.remove('on'), 2800);
  }

  let mode = 'menu', selCls = 'knight', P = null;
  let curMapId = 'island', enemies = [], projs = [], fx = [], floats = [], pillars = [];
  let t = 0, camX = 11000, camY = 8900, shake = 0;
  const inp = {mx:0, my:0, atk:false}, keys = {};

  function makePet(typeId='wolf'){
    const pt = PETS[typeId] || PETS.wolf;
    return {
      type: pt.id, name: pt.n, lv: 1, exp: 0, nextExp: 45,
      skillLv: 1, skillPts: 0, statPts: 0, bAtk: 0, bHp: 0, cd: 0,
      x: 11040, y: 8940, z: 0, vz: 0, hp: pt.baseHp
    };
  }
  const petBondMult = () => 1 + ((P?.abilities?.petBond || 0) * 0.04);
  const petMaxHp = pet => Math.round(((PETS[pet.type]?.baseHp || 180) + (pet.lv-1)*32 + pet.bHp*25) * petBondMult());
  const petAtk = pet => Math.round(((PETS[pet.type]?.baseAtk || 18) + (pet.lv-1)*7.5 + pet.bAtk*5 + (pet.skillLv-1)*4) * petBondMult());

  function recalc(p){
    const c = CLASSES[p.cls] || CLASSES.knight;
    const wpn = p.eqWpn ? GEAR_DB.find(g=>g.id===p.eqWpn) : null;
    const arm = p.eqArm ? GEAR_DB.find(g=>g.id===p.eqArm) : null;
    const wPlus = p.wpnPlus || 0;
    const aPlus = p.armPlus || 0;

    p.mhp = Math.round(c.hp + (p.lv-1)*28 + (p.con - c.con)*18 + (arm ? (arm.hp||0) + aPlus*16 : 0));
    p.mmp = Math.round(c.mp + (p.lv-1)*11 + (p.wis - c.wis)*13 + (p.int - c.int)*7);
    p.atk = Math.round(
      c.str*1.8 + c.dex*0.7 + (p.lv-1)*4.2 + (p.str - c.str)*4.8 + (p.int - c.int)*3.0 +
      (wpn ? wpn.atk + wPlus*6.5 : 0)
    );
    p.ac = Math.round(c.con*0.8 + c.dex*0.6 + (p.lv-1)*1.6 + (p.dex - c.dex)*2.2 + (arm ? arm.ac + aPlus*3.2 : 0));
    p.spd = Math.round(170 + (p.dex - c.dex)*3.2 + (p.lv-1)*0.6);
    p.nextExp = Math.round(55 * Math.pow(p.lv, 1.68));
    p.hp = clamp(p.hp, 0, p.mhp);
    p.mp = clamp(p.mp, 0, p.mmp);
  }

  function createPlayer(cls, customName, saved){
    const c = CLASSES[cls] || CLASSES.knight;
    const p = {
      name: (customName && customName.trim()) ? customName.trim().slice(0,10) : '青雲少俠',
      cls, lv:1, exp:0, nextExp:55, lawful:0,
      adena:300,
      items:{ redPot:10, orangePot:3, superPot:0, mpPot:3, greenPot:3, ragePot:1, expScroll:1, homeScroll:4, wpnScroll:3, armScroll:3, blessWpn:1, blessArm:0, safeStone:1, morphScroll:2 },
      statPts:0, skillPts:0, abilityPts:0,
      str:c.str, con:c.con, dex:c.dex, wis:c.wis, int:c.int,
      abilities:{},
      skillLv:{},
      eqWpn:'wpn_t1_0', wpnPlus:0,
      eqArm:'arm_t1_0', armPlus:0,
      bag:[],
      pets:[makePet('wolf')], activePet:'wolf',
      morph:'none', morphT:0, hasteT:0, rageT:0, expT:0, buffT:0,
      // 9 格快捷欄預設配置（熱鍵 1~9）
      slots:['s0','s1','s2','s3','s4','redPot','orangePot','greenPot','homeScroll'],
      mapId:'island', x:11000, y:8900, z:0, vz:0, face:0,
      atkCd:0, atkAnim:0, sCd:new Array(30).fill(0), invT:0, alive:true, reviveT:0, moving:false
    };
    (SKILLS[cls] || SKILLS.knight).forEach((_, i)=>{ p.skillLv[i] = i === 0 ? 1 : 0; });

    if(saved){
      Object.assign(p, saved);
      p.cls = cls;
      if(!p.items) p.items = { redPot:6, orangePot:1, greenPot:2, homeScroll:3, wpnScroll:2, armScroll:2 };
      if(!p.pets || !p.pets.length) p.pets = [makePet('wolf')];
      if(!p.activePet || !p.pets.some(x=>x.type===p.activePet)) p.activePet = p.pets[0].type;
      if(!Array.isArray(p.slots) || p.slots.length !== 9) p.slots = ['s0','s1','s2','s3','s4','redPot','orangePot','greenPot','homeScroll'];
      if(!p.skillLv) p.skillLv = {0:1};
      if(!p.abilities) p.abilities = {};
      if(!Array.isArray(p.sCd) || p.sCd.length < 30) p.sCd = new Array(30).fill(0);
      if(!MAPS[p.mapId]) p.mapId = 'island';
      p.alive = true; p.invT = 0; p.atkCd = 0; p.atkAnim = 0;
    }
    recalc(p);
    if(!saved){ p.hp = p.mhp; p.mp = p.mmp; }
    return p;
  }

  function saveGame(){
    if(!P) return;
    const out = {
      name:P.name, cls:P.cls, lv:P.lv, exp:P.exp, lawful:P.lawful, adena:P.adena,
      items:P.items, statPts:P.statPts, skillPts:P.skillPts, abilityPts:P.abilityPts,
      str:P.str, con:P.con, dex:P.dex, wis:P.wis, int:P.int, abilities:P.abilities,
      skillLv:P.skillLv, eqWpn:P.eqWpn, wpnPlus:P.wpnPlus, eqArm:P.eqArm, armPlus:P.armPlus,
      bag:P.bag, pets:P.pets, activePet:P.activePet,
      morph:P.morph, morphT:P.morphT, hasteT:P.hasteT, rageT:P.rageT, expT:P.expT,
      slots:P.slots, mapId:P.mapId, x:P.x, y:P.y, hp:P.hp, mp:P.mp,
      pass:DEL_PASS_DEFAULT
    };
    sSet(SAVE_KEY, JSON.stringify(out));
    refreshMenuSaves();
  }

  function loadRawSave(){
    const raw = sGet(SAVE_KEY);
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch(_){ return null; }
  }

  function refreshMenuSaves(){
    const sv = loadRawSave();
    const ok = !!(sv && CLASSES[sv.cls]);
    $('bCont').style.display = ok ? 'inline-block' : 'none';
    $('bDelChar').style.display = ok ? 'inline-block' : 'none';
    if(ok) $('bCont').textContent = `繼續修煉「${sv.name || '少俠'}」(Lv.${sv.lv} ${CLASSES[sv.cls].n})`;
  }

  function loadMap(mapId, tx, ty){
    curMapId = MAPS[mapId] ? mapId : 'island';
    const m = MAPS[curMapId];
    if(P){
      P.mapId = curMapId;
      if(typeof tx === 'number') P.x = tx;
      if(typeof ty === 'number') P.y = ty;
      const pet = activePet();
      if(pet){ pet.x = P.x + 35; pet.y = P.y + 35; }
    }
    camX = P ? P.x : m.w/2;
    camY = P ? P.y : m.h/2;

    pillars = []; enemies = []; projs = []; fx = []; floats = [];
    let seed = curMapId === 'island' ? 1013 : (2000 + (m.floor || 1) * 97);
    const rnd = ()=>{ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    const pillarCount = curMapId === 'island' ? 280 : 48;
    for(let i=0; i<pillarCount; i++){
      const px = 220 + rnd()*(m.w - 440);
      const py = 220 + rnd()*(m.h - 440);
      if(inRect(m.safe, px, py, 140)) continue;
      pillars.push({x:px, y:py, r:20 + rnd()*12, h:36 + rnd()*20});
    }

    const addMob = (tp, x, y)=>{
      const d = MONSTERS[tp];
      if(!d) return;
      enemies.push({
        tp, name:d.n, lv:d.lv, r:d.r, col:d.col, shape:d.shape, lawful:d.lawful,
        hp:d.hp, mhp:d.hp, atk:d.atk, ac:d.ac, exp:d.exp, adena:d.adena,
        spd:d.spd, aggro:d.aggro, acd:d.acd, boss:!!d.boss,
        x, y, z:0, vz:0, hx:x, hy:y, cd:0, hitT:0, dead:false, respT:0, ai:'idle', wt:0, wx:0, wy:0
      });
    };

    const scatter = (tp, n)=>{
      for(let i=0; i<n; i++){
        const x = 180 + rnd()*(m.w - 360), y = 180 + rnd()*(m.h - 360);
        if(!inRect(m.safe, x, y, 110)) addMob(tp, x, y);
      }
    };

    if(curMapId === 'island'){
      const sx = m.safe.x + m.safe.w/2, sy = m.safe.y + m.safe.h/2;
      const gateMobs = [
        [sx + m.safe.w/2 + 85, sy - 40, 'goblin'], [sx + m.safe.w/2 + 150, sy + 60, 'boar'],
        [sx - m.safe.w/2 - 85, sy - 40, 'goblin'], [sx - m.safe.w/2 - 150, sy + 60, 'werewolf'],
        [sx - 50, sy - m.safe.h/2 - 85, 'goblin'], [sx + 60, sy - m.safe.h/2 - 150, 'orc'],
        [sx - 50, sy + m.safe.h/2 + 85, 'boar'],   [sx + 60, sy + m.safe.h/2 + 150, 'werewolf']
      ];
      gateMobs.forEach(([x,y,tp])=>addMob(tp, x, y));

      scatter('goblin', 85);
      scatter('boar', 75);
      scatter('werewolf', 70);
      scatter('orc', 65);
      scatter('viper', 55);
      scatter('shelob', 45);
      scatter('golem', 35);
    }else{
      const f = m.floor || 1;
      scatter(`d${f}_m1`, 26);
      scatter(`d${f}_m2`, 22);
      addMob(`d${f}_boss`, m.w * 0.72, m.h * 0.68);
    }
  }

  const activePet = () => (!P || !P.pets || !P.pets.length) ? null : (P.pets.find(x=>x.type===P.activePet) || P.pets[0]);
  const addFloat = (x, y, z, text, col='#fff') => floats.push({x, y, z:z+28, text, col, life:0.9, max:0.9});
  const addFx = (kind, x, y, r, col='#e2b857', angle=0) => fx.push({kind, x, y, r, col, angle, life:0.36, max:0.36});
  const spawnProj = (x, y, ang, spd, mult, col, pierce, style='orb') => projs.push({x, y, z:18, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, ang, mult, col, pierce:!!pierce, style, hitIds:new Set(), life:0.95});

  function grantPetExp(pet, amt){
    if(!pet) return;
    pet.exp += amt;
    while(pet.exp >= pet.nextExp){
      pet.exp -= pet.nextExp;
      pet.lv++;
      pet.statPts += 2;
      pet.skillPts += 1;
      pet.nextExp = Math.round(45 * Math.pow(pet.lv, 1.45));
      pet.hp = petMaxHp(pet);
      addFloat(pet.x, pet.y, 22, `${pet.name} 突破至 Lv.${pet.lv}!`, '#7bf2b6');
    }
  }

  function gainExp(amt){
    if(!P) return;
    const bonus = 1 + (P.abilities?.expBonus || 0) * 0.04;
    const expMult = (P.expT > 0 ? 2.0 : 1.0) * bonus;
    P.exp += Math.round(amt * expMult);
    let up = false;
    while(P.exp >= P.nextExp){
      P.exp -= P.nextExp;
      P.lv++;
      P.statPts += 3;
      P.skillPts += 3;
      P.abilityPts = (P.abilityPts || 0) + 2;
      recalc(P);
      P.hp = P.mhp;
      P.mp = P.mmp;
      up = true;
      addFx('nova', P.x, P.y, 145, '#ffe066');
      addFloat(P.x, P.y, 40, `境界突破 Lv.${P.lv}! (+3屬性 +3武學 +2天賦)`, '#ffe484');
    }
    if(up){
      SFX.levelUp();
      broadcast(`【江湖傳音】恭喜 ${P.name} 突破至 Lv.${P.lv}！獲得屬性、武學與天賦點數`);
      saveGame();
    }
  }

  function killEnemy(e){
    e.dead = true;
    e.respT = e.boss ? 28 : 10;
    gainExp(e.exp);
    P.lawful = clamp((P.lawful || 0) + e.lawful, -99999, 99999);

    const goldMult = 1 + (P.abilities?.goldBonus || 0) * 0.05;
    const gold = Math.round(rand(e.adena[0], e.adena[1]) * goldMult);
    P.adena += gold;
    addFloat(e.x, e.y, 16, `+${gold} 銀兩`, '#ffd666');

    const pet = activePet();
    if(pet) grantPetExp(pet, Math.max(6, Math.round(e.exp * 0.48)));

    if(Math.random() < (e.boss ? 1 : 0.28)){
      P.items.redPot = (P.items.redPot || 0) + 1;
      addFloat(e.x + 14, e.y, 26, '獲得：金瘡藥', '#ff7b89');
    }
    if(Math.random() < (e.boss ? 1 : 0.16)){
      const roll = Math.random();
      if(roll < 0.34){
        P.items.wpnScroll = (P.items.wpnScroll || 0) + 1;
        addFloat(e.x - 14, e.y, 34, '掉落【神兵鍛造符】', '#ffe066');
      }else if(roll < 0.68){
        P.items.armScroll = (P.items.armScroll || 0) + 1;
        addFloat(e.x - 14, e.y, 34, '掉落【護甲鍛造符】', '#7ec8ff');
      }else if(roll < 0.86){
        P.items.greenPot = (P.items.greenPot || 0) + 1;
        addFloat(e.x - 14, e.y, 34, '掉落【疾風神行丹】', '#7df2a8');
      }else{
        P.items.morphScroll = (P.items.morphScroll || 0) + 1;
        addFloat(e.x - 14, e.y, 34, '掉落【上古化神丹】', '#d49bff');
      }
    }
    if(e.boss){
      P.items.blessWpn = (P.items.blessWpn || 0) + 1;
      if(e.lv >= 200) P.items.safeStone = (P.items.safeStone || 0) + 1;
      broadcast(`【全服震動】俠客 ${P.name} 斬殺了 Lv.${e.lv}「${e.name}」，獲得【天工造化神符】！`);
    }
    if(Math.random() < (e.boss ? 0.95 : 0.18)){
      const maxTier = Math.min(10, Math.max(1, Math.ceil(e.lv / 38)));
      const pool = GEAR_DB.filter(g => g.tier <= maxTier && g.tier >= Math.max(1, maxTier - 2));
      const pick = pool[Math.floor(Math.random() * pool.length)] || GEAR_DB[0];
      P.bag.push({id:pick.id, plus:0});
      addFloat(e.x, e.y, 44, `獲得神兵寶甲【${pick.name}】`, '#c792ff');
    }
    saveGame();
  }

  function dealDamage(e, mult, byPet=false){
    if(e.dead) return;
    const morph = MORPHS[P.morph || 'none'] || MORPHS.none;
    const rageMult = P.rageT > 0 ? 1.35 : 1;
    const bossSlayer = e.boss ? (1 + (P.abilities?.bossSlayer || 0) * 0.03) : 1;
    const base = byPet ? petAtk(activePet()) : P.atk * morph.dmgMult * rageMult * bossSlayer * (P.buffT > 0 ? 1.35 : 1);

    const critChance = (byPet ? 0.15 : 0.18) + (P.abilities?.critRate || 0) * 0.015;
    const critMult = 1.75 + (P.abilities?.critDmg || 0) * 0.08;
    const crit = Math.random() < critChance;

    const pen = Math.min(0.75, (P.abilities?.armorPen || 0) * 0.025);
    const effAc = e.ac * (1 - pen);
    const raw = base * mult * rand(0.92, 1.1) * (crit ? critMult : 1);
    const dmg = Math.max(1, Math.round(raw - effAc * 0.55));
    e.hp -= dmg;
    e.hitT = 0.15;
    e.vz = 75;
    e.ai = 'chase';

    if(!byPet && (P.abilities?.lifeSteal || 0) > 0){
      const steal = Math.round(dmg * (P.abilities.lifeSteal * 0.008));
      if(steal > 0) P.hp = Math.min(P.mhp, P.hp + steal);
    }

    addFloat(e.x, e.y, e.r*1.3, (crit ? '會心! ' : '') + dmg, crit ? '#ffd659' : (byPet ? '#8cf0be' : '#ffffff'));
    SFX.hit(crit);
    if(e.hp <= 0) killEnemy(e);
  }

  function hurtPlayer(raw){
    const m = MAPS[curMapId];
    if(!P || !P.alive || P.invT > 0 || inRect(m.safe, P.x, P.y, 10)) return;
    const dodgeChance = Math.min(0.45, (P.abilities?.dodge || 0) * 0.012);
    if(Math.random() < dodgeChance){
      addFloat(P.x, P.y, 32, '凌波閃避！', '#72d5ff');
      return;
    }
    const dmg = Math.max(1, Math.round(raw - P.ac * 0.65));
    P.hp = Math.max(0, P.hp - dmg);
    P.invT = 0.34;
    shake = Math.min(12, shake + 4);
    addFloat(P.x, P.y, 28, `-${dmg}`, '#ff6b6b');
    if(P.hp <= 0){
      P.alive = false;
      P.reviveT = 2.0;
      broadcast('氣血耗盡重傷倒地，正傳送回青雲古鎮醫館療傷…');
    }
  }

  function findNearestEnemy(maxRange){
    let best = null, bd = maxRange;
    for(const e of enemies){
      if(e.dead) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y) - e.r;
      if(d < bd){ bd = d; best = e; }
    }
    return best;
  }

  function performAttack(){
    if(!P || !P.alive || P.atkCd > 0) return;
    const cls = CLASSES[P.cls] || CLASSES.knight;
    const morph = MORPHS[P.morph || 'none'] || MORPHS.none;
    const abSpd = 1 + (P.abilities?.atkSpd || 0) * 0.02;
    const hasteMult = (P.hasteT > 0 ? 1.3 : 1) * morph.atkSpd * abSpd;

    const tg = findNearestEnemy(cls.rng + 95);
    if(tg) P.face = Math.atan2(tg.y - P.y, tg.x - P.x);

    P.atkCd = Math.max(0.15, (cls.wpnStyle === 'bow' ? 0.42 : 0.36) / hasteMult);
    P.atkAnim = 0.28;
    P.vz = 55;

    if((cls.wpnStyle === 'bow' || cls.wpnStyle === 'staff') && P.morph === 'none'){
      const col = cls.wpnStyle === 'bow' ? '#63e6be' : '#6cb4ff';
      spawnProj(P.x, P.y, P.face, 640, 1.0, col, false, cls.wpnStyle === 'bow' ? 'arrow' : 'orb');
      addFx('slash', P.x, P.y, 50, col, P.face);
      SFX.tone(cls.wpnStyle === 'bow' ? 540 : 420, 0.08, 'triangle', 0.04, 260);
    }else{
      const rng = P.morph !== 'none' ? 124 : cls.rng;
      addFx('slash', P.x, P.y, rng, P.morph !== 'none' ? morph.col : cls.col, P.face);
      SFX.tone(250, 0.09, 'sawtooth', 0.045, 105);
      for(const e of enemies){
        if(e.dead) continue;
        const dx = e.x - P.x, dy = e.y - P.y, dist = Math.hypot(dx, dy) - e.r;
        if(dist < rng){
          let diff = Math.abs(Math.atan2(dy, dx) - P.face);
          if(diff > Math.PI) diff = Math.PI*2 - diff;
          if(dist < 28 || diff < 1.25) dealDamage(e, 1.0, false);
        }
      }
    }
  }

  // 全面重製武功與神通特效
  function castSkill(idx){
    if(!P || !P.alive) return;
    const list = SKILLS[P.cls] || SKILLS.knight;
    const def = list[idx];
    if(!def) return;
    const lv = P.skillLv[idx] || 0;
    if(lv <= 0){ broadcast(`【${def[0]}】尚未領悟，請開啟「經脈/武學」修煉`); return; }
    if(P.sCd[idx] > 0){ broadcast(`${def[0]} 調息冷卻中`); return; }
    const mpCost = def[2] + Math.floor(lv * 0.4);
    if(P.mp < mpCost){ broadcast('內力(MP)不足'); return; }

    const tg = findNearestEnemy(380);
    if(tg) P.face = Math.atan2(tg.y - P.y, tg.x - P.x);
    P.mp -= mpCost;
    P.sCd[idx] = Math.max(0.95, def[3] - lv * 0.015);
    const mult = def[4] + (lv - 1) * 0.16;
    const kind = def[5];
    const col = CLASSES[P.cls].col;
    SFX.skill();
    shake = Math.min(16, shake + 6);

    if(kind === 'heal'){
      const healAmt = Math.round(P.mhp * (0.38 + lv * 0.008));
      P.hp = Math.min(P.mhp, P.hp + healAmt);
      addFx('bagua', P.x, P.y, 105, '#7df2b8', P.face);
      addFloat(P.x, P.y, 34, `${def[0]} +${healAmt} 氣血`, '#7df2b8');
    }else if(kind === 'buff'){
      P.buffT = 14 + lv * 0.25;
      P.invT = Math.max(P.invT, 1.1);
      addFx('bagua', P.x, P.y, 115, '#ffe066', P.face);
      addFloat(P.x, P.y, 34, `${def[0]} 護體神功啟動！`, '#ffe066');
    }else if(kind === 'dash'){
      const m = MAPS[curMapId];
      const ox = P.x, oy = P.y;
      const nx = clamp(P.x + Math.cos(P.face)*185, 40, m.w-40);
      const ny = clamp(P.y + Math.sin(P.face)*185, 40, m.h-40);
      addFx('lightning', ox, oy, 185, col, P.face);
      P.x = nx; P.y = ny; P.invT = Math.max(P.invT, 0.6);
      addFx('slash', P.x, P.y, 125, col, P.face);
      for(const e of enemies) if(!e.dead && Math.hypot(e.x-P.x, e.y-P.y) - e.r < 130) dealDamage(e, mult, false);
    }else if(kind === 'ring'){
      addFx('bagua', P.x, P.y, 175, col, P.face);
      for(const e of enemies) if(!e.dead && Math.hypot(e.x-P.x, e.y-P.y) - e.r < 175) dealDamage(e, mult, false);
    }else if(kind === 'nova'){
      addFx('nova', P.x, P.y, 260, '#ffd666', P.face);
      for(const e of enemies) if(!e.dead && Math.hypot(e.x-P.x, e.y-P.y) - e.r < 260) dealDamage(e, mult, false);
    }else if(kind === 'line'){
      addFx('lightning', P.x, P.y, 265, col, P.face);
      const ca = Math.cos(P.face), sa = Math.sin(P.face);
      for(const e of enemies){
        if(e.dead) continue;
        const dx = e.x - P.x, dy = e.y - P.y;
        const fwd = dx*ca + dy*sa, lat = Math.abs(-dx*sa + dy*ca);
        if(fwd > -16 && fwd < 275 + e.r && lat < 68 + e.r) dealDamage(e, mult, false);
      }
    }else if(kind === 'fan'){
      for(let k=-3; k<=3; k++) spawnProj(P.x, P.y, P.face + k*0.14, 620, mult, col, false, 'arrow');
      addFx('slash', P.x, P.y, 90, col, P.face);
    }else if(kind === 'slash' || kind === 'arc'){
      addFx('slash', P.x, P.y, 145, col, P.face);
      for(const e of enemies){
        if(e.dead) continue;
        const dx = e.x - P.x, dy = e.y - P.y, dist = Math.hypot(dx, dy) - e.r;
        if(dist < 145){
          let diff = Math.abs(Math.atan2(dy, dx) - P.face);
          if(diff > Math.PI) diff = Math.PI*2 - diff;
          if(dist < 35 || diff < 1.45) dealDamage(e, mult, false);
        }
      }
    }else{
      spawnProj(P.x, P.y, P.face, 660, mult, col, true, 'sword');
    }
  }

  function useItem(itemKey){
    if(!P || !P.alive) return;
    const cnt = P.items[itemKey] || 0;
    if(cnt <= 0){ broadcast(`${ITEMS[itemKey]?.n || '物品'} 數量不足`); return; }

    if(itemKey === 'redPot' || itemKey === 'orangePot' || itemKey === 'superPot'){
      if(itemKey !== 'superPot' && P.hp >= P.mhp){ broadcast('氣血已充盈'); return; }
      P.items[itemKey]--;
      if(itemKey === 'superPot'){
        P.hp = P.mhp; P.mp = P.mmp;
        addFloat(P.x, P.y, 30, '氣血內力全滿！', '#72d5ff');
      }else{
        const ratio = itemKey === 'orangePot' ? 0.78 : 0.40;
        const heal = Math.round(P.mhp * ratio);
        P.hp = Math.min(P.mhp, P.hp + heal);
        addFloat(P.x, P.y, 28, `+${heal} 氣血`, '#ff8594');
      }
      SFX.heal();
    }else if(itemKey === 'mpPot'){
      P.items.mpPot--;
      const rec = Math.round(P.mmp * 0.65);
      P.mp = Math.min(P.mmp, P.mp + rec);
      SFX.heal();
      addFloat(P.x, P.y, 28, `+${rec} 內力`, '#72d5ff');
    }else if(itemKey === 'greenPot'){
      P.items.greenPot--;
      P.hasteT = 60;
      SFX.heal();
      addFx('bagua', P.x, P.y, 95, '#68e89e', P.face);
      broadcast('服下【疾風神行丹】，60秒內出招與身法速度大幅提升！');
    }else if(itemKey === 'ragePot'){
      P.items.ragePot--;
      P.rageT = 60;
      SFX.heal();
      addFx('nova', P.x, P.y, 105, '#ff6b6b', P.face);
      broadcast('服下【龍虎大力丸】，60秒內攻擊力暴增 35%！');
    }else if(itemKey === 'expScroll'){
      P.items.expScroll--;
      P.expT = 120;
      SFX.heal();
      broadcast('服下【悟道雙倍丹】，120秒內狩獵修為經驗翻倍！');
    }else if(itemKey === 'homeScroll'){
      P.items.homeScroll--;
      loadMap('island', 11000, 8900);
      P.vz = 110;
      SFX.heal();
      addFx('bagua', P.x, P.y, 120, '#72d5ff', P.face);
      broadcast('催動【青雲回城符】，已瞬移回青雲古鎮安全區');
    }else if(itemKey === 'morphScroll'){
      openSheet('pet');
    }
    saveGame();
  }

  function triggerSlot(idx){
    if(mode !== 'play' || !P || !P.alive) return;
    const code = P.slots[idx];
    if(!code || code === 'none') return;
    if(code.startsWith('s')){
      const sIdx = parseInt(code.slice(1), 10);
      if(!Number.isNaN(sIdx)) castSkill(sIdx);
    }else{
      useItem(code);
    }
  }

  function enchantGear(slot, useBless=false){
    const scrollKey = slot === 'wpn' ? (useBless ? 'blessWpn' : 'wpnScroll') : (useBless ? 'blessArm' : 'armScroll');
    if((P.items[scrollKey] || 0) <= 0){ broadcast('鍛造符籙不足'); return; }
    const gearId = slot === 'wpn' ? P.eqWpn : P.eqArm;
    if(!gearId){ broadcast(`目前未裝備${slot === 'wpn' ? '神兵' : '護甲'}`); return; }
    const g = GEAR_DB.find(x=>x.id===gearId);
    if(!g) return;

    P.items[scrollKey]--;
    const curPlus = slot === 'wpn' ? (P.wpnPlus || 0) : (P.armPlus || 0);
    const safe = g.safe || 6;

    let rate = 1.0;
    if(curPlus >= safe){
      const over = curPlus - safe;
      rate = Math.max(0.20, 0.58 - over * 0.10 + (useBless ? 0.16 : 0));
    }

    if(Math.random() <= rate){
      const jump = (useBless && slot === 'wpn' && curPlus < safe + 3 && Math.random() < 0.48) ? (Math.random()<0.3?3:2) : 1;
      const nextPlus = curPlus + jump;
      if(slot === 'wpn') P.wpnPlus = nextPlus; else P.armPlus = nextPlus;
      recalc(P);
      SFX.enchantSuccess();
      addFx('nova', P.x, P.y, 145, '#ffe066', P.face);
      broadcast(`【神兵出世】${P.name} 的「+${curPlus} ${g.name}」引動天地靈氣，晉升為【+${nextPlus} ${g.name}】！`);
    }else if((P.items.safeStone || 0) > 0){
      P.items.safeStone--;
      SFX.heal();
      broadcast(`【女媧補天石顯靈】鍛造失敗但消耗 1 顆補天石，保住了「+${curPlus} ${g.name}」！`);
    }else{
      if(slot === 'wpn'){ P.eqWpn = null; P.wpnPlus = 0; }
      else{ P.eqArm = null; P.armPlus = 0; }
      recalc(P);
      SFX.enchantFail();
      shake = 14;
      broadcast(`【鍛造碎裂】${P.name} 的「+${curPlus} ${g.name}」承受不住靈壓化為齏粉…`);
    }
    saveGame();
    renderSheetBody();
    updateHud();
  }

  function updPlayer(dt){
    const m = MAPS[curMapId];
    if(!P.alive){
      P.reviveT -= dt;
      if(P.reviveT <= 0){
        P.alive = true; P.hp = P.mhp; P.mp = P.mmp;
        loadMap('island', 11000, 8900);
        broadcast('已在青雲古鎮神醫館調息復活');
        saveGame();
      }
      return;
    }

    let mx = inp.mx, my = inp.my;
    if(keys.a || keys.ArrowLeft) mx -= 1;
    if(keys.d || keys.ArrowRight) mx += 1;
    if(keys.w || keys.ArrowUp) my -= 1;
    if(keys.s || keys.ArrowDown) my += 1;
    const mag = Math.hypot(mx, my);
    if(mag > 1){ mx /= mag; my /= mag; }

    if(mag > 0.08){
      P.moving = true;
      const isoWx = (mx + my) * 0.7071;
      const isoWy = (my - mx) * 0.7071;
      const morph = MORPHS[P.morph || 'none'] || MORPHS.none;
      const spd = P.spd * (P.hasteT > 0 ? 1.3 : 1) * morph.moveSpd;
      const nx = clamp(P.x + isoWx * spd * dt, 36, m.w - 36);
      const ny = clamp(P.y + isoWy * spd * dt, 36, m.h - 36);
      let blocked = false;
      for(const pl of pillars){
        if(Math.hypot(nx - pl.x, ny - pl.y) < pl.r + 12){ blocked = true; break; }
      }
      if(!blocked){ P.x = nx; P.y = ny; }
      P.face = Math.atan2(isoWy, isoWx);
    }else{
      P.moving = false;
    }

    if(P.z > 0 || P.vz !== 0){
      P.z += P.vz * dt; P.vz -= 420 * dt;
      if(P.z <= 0){ P.z = 0; P.vz = 0; }
    }

    P.atkCd = Math.max(0, P.atkCd - dt);
    P.atkAnim = Math.max(0, P.atkAnim - dt);
    P.invT = Math.max(0, P.invT - dt);
    P.hasteT = Math.max(0, P.hasteT - dt);
    P.rageT = Math.max(0, P.rageT - dt);
    P.expT = Math.max(0, P.expT - dt);
    P.buffT = Math.max(0, P.buffT - dt);
    if(P.morph !== 'none'){
      P.morphT = Math.max(0, P.morphT - dt);
      if(P.morphT <= 0){
        P.morph = 'none';
        broadcast('化神時效已過，真身歸位');
      }
    }
    for(let i=0; i<P.sCd.length; i++) P.sCd[i] = Math.max(0, P.sCd[i] - dt);

    if(inp.atk || keys.j || keys[' ']) performAttack();

    const hpReg = (P.abilities?.hpRegen || 0) * 0.0035;
    const mpReg = (P.abilities?.mpRegen || 0) * 0.005;

    if(inRect(m.safe, P.x, P.y)){
      P.hp = Math.min(P.mhp, P.hp + P.mhp * 0.16 * dt);
      P.mp = Math.min(P.mmp, P.mp + P.mmp * 0.20 * dt);
    }else{
      if(hpReg > 0) P.hp = Math.min(P.mhp, P.hp + P.mhp * hpReg * dt);
      P.mp = Math.min(P.mmp, P.mp + (3.0 + P.wis * 0.22 + P.mmp * mpReg) * dt);
    }
  }

  function updPet(dt){
    const pet = activePet();
    if(!pet || !P || !P.alive) return;
    const pt = PETS[pet.type] || PETS.wolf;
    const m = MAPS[curMapId];
    const mhp = petMaxHp(pet);
    pet.cd = Math.max(0, pet.cd - dt);

    if(inRect(m.safe, P.x, P.y)) pet.hp = Math.min(mhp, pet.hp + mhp * 0.22 * dt);

    let target = null, bestD = 310;
    if(!inRect(m.safe, P.x, P.y, 8)){
      for(const e of enemies){
        if(e.dead || inRect(m.safe, e.x, e.y, 10)) continue;
        const d = Math.hypot(e.x - pet.x, e.y - pet.y);
        if(d < bestD){ bestD = d; target = e; }
      }
    }

    if(target){
      const dx = target.x - pet.x, dy = target.y - pet.y, dist = Math.hypot(dx, dy) || 1;
      const keep = ['hawk','phoenix','dragon','fox'].includes(pet.type) ? 130 : 36;
      if(dist > keep){
        pet.x += (dx/dist)*pt.spd*dt;
        pet.y += (dy/dist)*pt.spd*dt;
      }
      if(pet.cd <= 0){
        pet.cd = Math.max(0.5, pt.cd - (pet.skillLv-1)*0.04);
        pet.vz = 75;
        const ang = Math.atan2(dy, dx);
        if(['hawk','phoenix','dragon','fox'].includes(pet.type)){
          spawnProj(pet.x, pet.y, ang, 540, 1.25 + (pet.skillLv-1)*0.14, pt.col, false, 'orb');
          addFx('slash', pet.x, pet.y, 45, pt.col, ang);
        }else if(['bear','turtle','qilin','taotie'].includes(pet.type)){
          addFx('bagua', pet.x, pet.y, 95, pt.col, ang);
          for(const e of enemies) if(!e.dead && Math.hypot(e.x-pet.x, e.y-pet.y) - e.r < 98) dealDamage(e, 1.4 + (pet.skillLv-1)*0.15, true);
        }else{
          addFx('slash', pet.x, pet.y, 58, pt.col, ang);
          dealDamage(target, 1.3 + (pet.skillLv-1)*0.15, true);
        }
      }
    }else{
      const ang = P.face + Math.PI * 0.72;
      const tx = P.x + Math.cos(ang)*48, ty = P.y + Math.sin(ang)*48;
      const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
      if(d > 8){
        const sp = Math.min(pt.spd, d*4.5);
        pet.x += (dx/d)*sp*dt; pet.y += (dy/d)*sp*dt;
      }
    }

    if(pet.z > 0 || pet.vz !== 0){
      pet.z += pet.vz * dt; pet.vz -= 420 * dt;
      if(pet.z <= 0){ pet.z = 0; pet.vz = 0; }
    }
  }

  function updEnemies(dt){
    const m = MAPS[curMapId];
    for(const e of enemies){
      if(e.dead){
        e.respT -= dt;
        if(e.respT <= 0){ e.dead = false; e.hp = e.mhp; e.x = e.hx; e.y = e.hy; e.ai = 'idle'; e.z = 0; e.vz = 0; }
        continue;
      }
      e.cd = Math.max(0, e.cd - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      if(e.z > 0 || e.vz !== 0){
        e.z += e.vz * dt; e.vz -= 420 * dt;
        if(e.z <= 0){ e.z = 0; e.vz = 0; }
      }

      const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy) || 1;
      const safe = inRect(m.safe, P.x, P.y, 12);

      if(e.ai === 'idle'){
        if(P.alive && !safe && dist < e.aggro) e.ai = 'chase';
        else{
          e.wt -= dt;
          if(e.wt <= 0){
            e.wt = rand(1.4, 3.2);
            const a = Math.random()*Math.PI*2, mv = Math.random() < 0.65;
            e.wx = mv ? Math.cos(a)*e.spd*0.35 : 0;
            e.wy = mv ? Math.sin(a)*e.spd*0.35 : 0;
          }
          const nx = e.x + e.wx*dt, ny = e.y + e.wy*dt;
          if(Math.hypot(nx - e.hx, ny - e.hy) < 120 && !inRect(m.safe, nx, ny, 20)){ e.x = nx; e.y = ny; }
        }
      }else if(e.ai === 'chase'){
        if(!P.alive || safe || Math.hypot(e.x - e.hx, e.y - e.hy) > 720) e.ai = 'home';
        else{
          const reach = e.r + 18;
          if(dist > reach){
            const nx = e.x + (dx/dist)*e.spd*dt, ny = e.y + (dy/dist)*e.spd*dt;
            if(!inRect(m.safe, nx, ny, 16)){ e.x = nx; e.y = ny; }
          }else if(e.cd <= 0){
            e.cd = e.acd; e.vz = 55;
            hurtPlayer(e.atk * (e.boss ? 1.2 : 1.0));
          }
        }
      }else{
        const hx = e.hx - e.x, hy = e.hy - e.y, hd = Math.hypot(hx, hy);
        if(hd < 8){ e.ai = 'idle'; e.hp = e.mhp; }
        else{ e.x += (hx/hd)*e.spd*1.5*dt; e.y += (hy/hd)*e.spd*1.5*dt; }
      }
    }
  }

  function updProjs(dt){
    for(let i=projs.length-1; i>=0; i--){
      const pr = projs[i];
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      let rm = pr.life <= 0;
      if(!rm){
        for(const e of enemies){
          if(e.dead || pr.hitIds.has(e)) continue;
          if(Math.hypot(e.x - pr.x, e.y - pr.y) < e.r + 14){
            pr.hitIds.add(e);
            dealDamage(e, pr.mult, false);
            if(!pr.pierce){ rm = true; break; }
          }
        }
      }
      if(rm) projs.splice(i, 1);
    }
  }

  function update(dt){
    t += dt;
    SFX.tickBgm(dt, mode === 'play');
    shake = Math.max(0, shake - dt*24);
    for(let i=fx.length-1; i>=0; i--){ fx[i].life -= dt; if(fx[i].life <= 0) fx.splice(i,1); }
    for(let i=floats.length-1; i>=0; i--){ floats[i].life -= dt; floats[i].z += 28*dt; if(floats[i].life <= 0) floats.splice(i,1); }
    if(mode !== 'play' || !P) return;
    updPlayer(dt);
    updPet(dt);
    updEnemies(dt);
    updProjs(dt);
  }

  const cv = $('cv'), ctx = cv.getContext('2d');
  const mm = $('minimap'), mmCtx = mm.getContext('2d');
  let VW = 390, VH = 844, dpr = 1;

  function resize(){
    const r = $('stage').getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    VW = Math.max(1, r.width); VH = Math.max(1, r.height);
    cv.width = Math.round(VW*dpr); cv.height = Math.round(VH*dpr);
  }
  window.addEventListener('resize', resize);
  if(window.ResizeObserver) new ResizeObserver(resize).observe($('stage'));
  resize();

  function render(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = MAPS[curMapId];
    if(P){
      camX += (P.x - camX) * 0.16;
      camY += (P.y - camY) * 0.16;
    }
    const sxShake = shake ? (Math.random()-0.5)*shake : 0;
    const syShake = shake ? (Math.random()-0.5)*shake : 0;

    drawIsoFloor(ctx, m, camX, camY, VW, VH, t);

    if(curMapId === 'island'){
      const npcs = [
        {x:10850, y:8800, title:'萬寶閣掌櫃·沈萬三', col:'#e2b857'},
        {x:11150, y:8800, title:'御獸宗師·白澤', col:'#6cf0b4'}
      ];
      for(const npc of npcs){
        const [nx, ny] = worldToIso(npc.x, npc.y, 0, camX, camY, VW, VH, 0, 0);
        if(nx < -80 || nx > VW + 80 || ny < -80 || ny > VH + 80) continue;
        ctx.fillStyle = '#2d2336'; ctx.strokeStyle = npc.col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(nx - 11, ny - 28, 22, 24, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f5cba7'; ctx.beginPath(); ctx.arc(nx, ny - 36, 9, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = npc.col; ctx.font = '800 11px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(npc.title, nx, ny - 50);
      }
    }

    const drawList = [];
    for(const pl of pillars) drawList.push({depth: pl.x + pl.y, fn: ()=>drawIsoPillar(ctx, pl.x, pl.y, pl.r, pl.h, m.theme, camX, camY, VW, VH, t)});
    const tags = [];

    for(const e of enemies){
      if(e.dead) continue;
      drawList.push({
        depth: e.x + e.y,
        fn: () => {
          const top = drawMonster(ctx, e, P, camX, camY, VW, VH, sxShake, syShake, t);
          if(top){
            const pct = Math.max(0, Math.min(100, (e.hp/e.mhp)*100));
            const col = e.boss ? '#ff6b81' : '#f2e8d5';
            tags.push(`<div class="etag" style="left:${top[0].toFixed(1)}px;top:${top[1].toFixed(1)}px;color:${col}"><div class="en">Lv.${e.lv} ${e.name}</div><div class="ebar"><i style="width:${pct.toFixed(1)}%"></i></div></div>`);
          }
        }
      });
    }

    const pet = activePet();
    if(P && pet){
      drawList.push({
        depth: pet.x + pet.y,
        fn: () => {
          const top = drawPet(ctx, pet, camX, camY, VW, VH, sxShake, syShake, t);
          const ppct = Math.max(0, Math.min(100, (pet.hp/petMaxHp(pet))*100));
          tags.push(`<div class="ptag" style="left:${top[0].toFixed(1)}px;top:${top[1].toFixed(1)}px;color:#8cf0be">Lv.${pet.lv} ${pet.name}<div class="pbar"><i style="width:${ppct.toFixed(1)}%"></i></div></div>`);
        }
      });
    }

    if(P){
      drawList.push({
        depth: P.x + P.y,
        fn: () => {
          const top = drawHero(ctx, P, camX, camY, VW, VH, sxShake, syShake, t);
          const nameCol = P.lawful >= 500 ? '#58a6ff' : (P.lawful < 0 ? '#ff4d4f' : '#ffffff');
          const mLabel = P.morph !== 'none' ? ` [${MORPHS[P.morph].n}]` : '';
          tags.push(`<div class="ptag" style="left:${top[0].toFixed(1)}px;top:${top[1].toFixed(1)}px;color:${nameCol}">Lv.${P.lv} ${P.name}${mLabel}</div>`);
        }
      });
    }

    drawList.sort((a,b) => a.depth - b.depth);
    for(const item of drawList) item.fn();

    // 投射物（飛劍、破風箭、太虛靈彈）
    for(const pr of projs){
      const [px, py] = worldToIso(pr.x, pr.y, pr.z, camX, camY, VW, VH, sxShake, syShake);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pr.ang);
      ctx.shadowColor = pr.col;
      ctx.shadowBlur = 10;
      ctx.fillStyle = pr.col;
      if(pr.style === 'arrow' || pr.style === 'sword'){
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-10, -4); ctx.lineTo(-6, 0); ctx.lineTo(-10, 4);
        ctx.closePath(); ctx.fill();
      }else{
        ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // 全面重製武學與神通特效（刀罡殘影、八卦法陣、九天雷柱、創世星爆）
    for(const f of fx){
      const alpha = Math.max(0, f.life / f.max);
      const prog = 1 - alpha;
      const [fx0, fy0] = worldToIso(f.x, f.y, 14, camX, camY, VW, VH, sxShake, syShake);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = f.col;
      ctx.shadowBlur = 14;

      if(f.kind === 'bagua'){
        ctx.translate(fx0, fy0);
        ctx.scale(1, 0.56);
        ctx.rotate(prog * 3.5);
        const rad = f.r * (0.65 + prog * 0.5);
        ctx.strokeStyle = f.col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
        ctx.strokeRect(-rad*0.65, -rad*0.65, rad*1.3, rad*1.3);
        ctx.rotate(Math.PI * 0.25);
        ctx.strokeRect(-rad*0.65, -rad*0.65, rad*1.3, rad*1.3);
      }else if(f.kind === 'nova'){
        ctx.translate(fx0, fy0);
        ctx.scale(1, 0.58);
        const rad = f.r * (0.3 + prog * 0.9);
        ctx.strokeStyle = f.col; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#ff4d4f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, rad * 0.68, 0, Math.PI*2); ctx.stroke();
        for(let k=0; k<8; k++){
          const a = k * Math.PI * 0.25 + prog * 2;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*rad*1.15, Math.sin(a)*rad*1.15); ctx.stroke();
        }
      }else if(f.kind === 'lightning'){
        const [fx1, fy1] = worldToIso(f.x + Math.cos(f.angle)*f.r, f.y + Math.sin(f.angle)*f.r, 14, camX, camY, VW, VH, sxShake, syShake);
        ctx.strokeStyle = f.col; ctx.lineWidth = 6 * alpha + 2;
        ctx.beginPath();
        ctx.moveTo(fx0, fy0);
        for(let s=1; s<=5; s++){
          const t0 = s / 5;
          const jx = (s < 5 ? (Math.random()-0.5)*22 : 0);
          const jy = (s < 5 ? (Math.random()-0.5)*22 : 0);
          ctx.lineTo(fx0 + (fx1-fx0)*t0 + jx, fy0 + (fy1-fy0)*t0 + jy);
        }
        ctx.stroke();
      }else{
        // 多層刀罡弧光
        ctx.translate(fx0, fy0);
        ctx.rotate(f.angle);
        ctx.strokeStyle = f.col; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, f.r * (0.55 + prog*0.35), -0.95, 0.95); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, f.r * (0.42 + prog*0.35), -0.75, 0.75); ctx.stroke();
      }
      ctx.restore();
    }

    for(const fl of floats){
      const [lx, ly] = worldToIso(fl.x, fl.y, fl.z, camX, camY, VW, VH, sxShake, syShake);
      ctx.save();
      ctx.globalAlpha = Math.min(1, fl.life / 0.35);
      ctx.font = '900 13px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(fl.text, lx+1, ly+1);
      ctx.fillStyle = fl.col; ctx.fillText(fl.text, lx, ly);
      ctx.restore();
    }

    $('labels').innerHTML = tags.join('');

    if(P && mode === 'play'){
      mmCtx.clearRect(0, 0, mm.width, mm.height);
      mmCtx.fillStyle = '#0c0a10'; mmCtx.fillRect(0, 0, mm.width, mm.height);
      const sx = mm.width / m.w, sy = mm.height / m.h;
      mmCtx.fillStyle = '#e2b85766';
      mmCtx.fillRect(m.safe.x*sx, m.safe.y*sy, m.safe.w*sx, m.safe.h*sy);
      mmCtx.fillStyle = '#58a6ff';
      for(const pt of m.portals) mmCtx.fillRect(pt.x*sx - 2.5, pt.y*sy - 2.5, 5, 5);
      mmCtx.fillStyle = '#ff4d4f';
      for(const e of enemies) if(!e.dead) mmCtx.fillRect(e.x*sx - 1, e.y*sy - 1, e.boss?3.5:2, e.boss?3.5:2);
      mmCtx.fillStyle = '#ffe066';
      mmCtx.beginPath(); mmCtx.arc(P.x*sx, P.y*sy, 3, 0, Math.PI*2); mmCtx.fill();
    }
  }

  function slotInfo(code){
    if(!code || code === 'none') return ['空', 0, 1];
    if(code.startsWith('s')){
      const idx = parseInt(code.slice(1), 10);
      const def = (SKILLS[P.cls] || SKILLS.knight)[idx];
      const lv = P.skillLv[idx] || 0;
      if(!def) return ['空', 0, 1];
      const maxCd = Math.max(0.95, def[3] - lv*0.015);
      return [`${def[0].slice(0,3)}${lv>0?'':'(鎖)'}`, P.sCd[idx] || 0, maxCd];
    }
    const shortMap = {
      redPot:'金瘡', orangePot:'大還', superPot:'神露', mpPot:'回氣',
      greenPot:'神行', ragePot:'大力', expScroll:'雙倍', homeScroll:'回城', morphScroll:'化神'
    };
    const cnt = P.items[code] || 0;
    return [`${shortMap[code]||'物'}×${cnt}`, 0, 1];
  }

  function updateHud(){
    if(!P || mode !== 'play') return;
    const m = MAPS[curMapId];
    const nameEl = $('hName');
    nameEl.textContent = P.name;
    nameEl.style.color = P.lawful >= 500 ? '#58a6ff' : (P.lawful < 0 ? '#ff4d4f' : '#efe4cc');
    $('hLv').textContent = `Lv.${P.lv}`;
    $('hCls').textContent = `${CLASSES[P.cls].n} · 俠義 ${P.lawful}`;
    $('hAdena').textContent = `銀兩 ${P.adena}`;

    $('bHp').style.width = `${(P.hp/P.mhp)*100}%`;
    $('bMp').style.width = `${(P.mp/P.mmp)*100}%`;
    $('bXp').style.width = `${(P.exp/P.nextExp)*100}%`;
    $('tHp').textContent = `${Math.ceil(P.hp)} / ${P.mhp}`;
    $('tMp').textContent = `${Math.floor(P.mp)} / ${P.mmp}`;
    $('atkAcText').textContent = `攻 ${P.atk} · 護體 ${P.ac}`;

    const chips = [];
    if(P.morph !== 'none') chips.push(`化神:${MORPHS[P.morph].n} ${Math.ceil(P.morphT)}s`);
    if(P.hasteT > 0) chips.push(`神行 ${Math.ceil(P.hasteT)}s`);
    if(P.rageT > 0) chips.push(`大力 ${Math.ceil(P.rageT)}s`);
    if(P.expT > 0) chips.push(`雙倍修為 ${Math.ceil(P.expT)}s`);
    if(P.buffT > 0) chips.push(`護體 ${Math.ceil(P.buffT)}s`);
    $('buffStrip').innerHTML = chips.map(c=>`<span class="bChip">${c}</span>`).join('');

    const pet = activePet();
    $('petInfo').textContent = pet ? `靈獸：${pet.name}` : '靈獸：無';
    $('petLv').textContent = pet ? `Lv.${pet.lv}` : '';

    $('ptDot').classList.toggle('on', ((P.statPts||0) + (P.skillPts||0) + (P.abilityPts||0)) > 0);
    $('zoneTag').textContent = inRect(m.safe, P.x, P.y) ? `${m.n} · 安全` : m.n;

    const nearShop = curMapId === 'island' && inRect(m.safe, P.x, P.y);
    $('bShop').style.display = nearShop ? 'inline-block' : 'none';

    const portal = m.portals.find(pt => Math.hypot(P.x - pt.x, P.y - pt.y) < 95);
    const pBtn = $('bPortal');
    if(portal){
      pBtn.style.display = 'inline-block';
      pBtn.textContent = portal.label;
      pBtn.onclick = () => {
        SFX.heal();
        loadMap(portal.toMap, portal.tx, portal.ty);
        broadcast(`已踏入【${MAPS[portal.toMap].n}】`);
        saveGame();
      };
    }else{
      pBtn.style.display = 'none';
    }

    // 更新底部 9 格快捷欄
    for(let i=0; i<9; i++){
      const [lbl, cd, maxCd] = slotInfo(P.slots[i]);
      $(`sn${i}`).textContent = lbl;
      const btn = $(`bSlot${i}`);
      btn.querySelector('.cd').style.height = `${Math.min(100, (cd/maxCd)*100)}%`;
      btn.classList.toggle('off', cd > 0);
    }
  }

  let curTab = 'stat';
  function openSheet(tab){
    if(!P) return;
    curTab = tab || curTab;
    document.querySelectorAll('#sheet .tab').forEach(b=>b.classList.toggle('on', b.dataset.tab === curTab));
    renderSheetBody();
    mode = 'sheet';
    $('sheet').classList.add('on');
  }

  function renderSheetBody(){
    const body = $('sheetBody');
    const wpn = P.eqWpn ? GEAR_DB.find(g=>g.id===P.eqWpn) : null;
    const arm = P.eqArm ? GEAR_DB.find(g=>g.id===P.eqArm) : null;

    if(curTab === 'stat'){
      body.innerHTML = `
        <div class="grid2">
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">俠客五圍（可用屬性點：${P.statPts}）</div>
            <div class="statLine"><span>名號／宗門</span><b>${P.name} · ${CLASSES[P.cls].n}</b></div>
            <div class="statLine"><span>境界／俠義</span><b>Lv.${P.lv} · ${P.lawful}</b></div>
            <div class="statLine"><span>氣血 / 內力</span><b>${Math.ceil(P.hp)}/${P.mhp} · ${Math.floor(P.mp)}/${P.mmp}</b></div>
            <div class="statLine"><span>攻擊 / 護體</span><b>${P.atk} / ${P.ac}</b></div>
            ${[
              ['str','臂力 · 物理傷害',P.str],
              ['con','根骨 · 氣血上限',P.con],
              ['dex','身法 · 護體與移速',P.dex],
              ['wis','定力 · 內力上限與回氣',P.wis],
              ['int','悟性 · 神通威力',P.int]
            ].map(([k,lbl,val])=>`
              <div class="statLine">
                <span>${lbl}</span>
                <span><b>${val}</b> <button class="miniBtn" ${P.statPts<=0?'disabled':''} onclick="window.__lgStat('${k}')">+1</button></span>
              </div>
            `).join('')}
          </div>
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">八荒天賦能力（可用天賦點：${P.abilityPts||0}）</div>
            <div style="max-height:46vh;overflow-y:auto">
              ${ABILITIES.map(ab=>{
                const lv = P.abilities?.[ab.id] || 0;
                return `<div class="statLine">
                  <div><b>${ab.n} (${lv}/${ab.max})</b><div style="font-size:10px;color:var(--dim)">${ab.desc}</div></div>
                  <button class="miniBtn" ${(P.abilityPts<=0 || lv>=ab.max)?'disabled':''} onclick="window.__lgAb('${ab.id}')">+1</button>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
    }else if(curTab === 'skill'){
      const list = SKILLS[P.cls] || SKILLS.knight;
      body.innerHTML = `
        <div style="margin-bottom:8px;color:var(--gold);font-weight:800;font-size:12.5px">可用武學點：${P.skillPts} 點 · 共 30 招宗門絕學，最高可修煉至 Lv.99</div>
        <div style="max-height:54vh;overflow-y:auto">
          ${list.map((sk, idx)=>{
            const lv = P.skillLv[idx] || 0;
            const locked = P.lv < sk[1];
            const maxed = lv >= 99;
            const canUp = !locked && !maxed && P.skillPts > 0;
            return `<div class="row">
              <div>
                <b>${idx+1}. ${sk[0]} <span style="color:var(--gold)">Lv.${lv}/99</span></b>
                <p>領悟境界 Lv.${sk[1]} · 耗內力 ${sk[2]} · 調息 ${sk[3]}s · 威力 ${(sk[4] + Math.max(0,lv-1)*0.16).toFixed(2)}x</p>
              </div>
              <button class="miniBtn" ${canUp?'':'disabled'} onclick="window.__lgSkill(${idx})">${locked?'未達境':(maxed?'大圓滿':'+1 參悟')}</button>
            </div>`;
          }).join('')}
        </div>`;
    }else if(curTab === 'enchant'){
      const wScrolls = P.items.wpnScroll || 0;
      const bScrolls = P.items.blessWpn || 0;
      const aScrolls = P.items.armScroll || 0;
      const baScrolls = P.items.blessArm || 0;
      body.innerHTML = `
        <div class="grid2">
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">神兵寶甲鍛造台（補天石：${P.items.safeStone||0} 顆）</div>
            <div class="statLine">
              <span>神兵：<b>${wpn ? `+${P.wpnPlus||0} ${wpn.name} (安定+${wpn.safe})` : '未裝備'}</b></span>
              <span>
                <button class="miniBtn" ${(!wpn || wScrolls<=0)?'disabled':''} onclick="window.__lgEnchant('wpn',false)">鍛造(${wScrolls})</button>
                <button class="miniBtn r" ${(!wpn || bScrolls<=0)?'disabled':''} onclick="window.__lgEnchant('wpn',true)">造化(${bScrolls})</button>
              </span>
            </div>
            <div class="statLine">
              <span>護甲：<b>${arm ? `+${P.armPlus||0} ${arm.name} (安定+${arm.safe})` : '未裝備'}</b></span>
              <span>
                <button class="miniBtn" ${(!arm || aScrolls<=0)?'disabled':''} onclick="window.__lgEnchant('arm',false)">鍛造(${aScrolls})</button>
                <button class="miniBtn r" ${(!arm || baScrolls<=0)?'disabled':''} onclick="window.__lgEnchant('arm',true)">玄武(${baScrolls})</button>
              </span>
            </div>
          </div>
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">百寶囊神兵（${P.bag.length} 件）</div>
            <div style="max-height:240px;overflow-y:auto">
              ${P.bag.length ? P.bag.map((it, idx)=>{
                const g = GEAR_DB.find(x=>x.id===it.id) || GEAR_DB[0];
                return `<div class="statLine">
                  <span><b>[T${g.tier}] +${it.plus||0} ${g.name}</b> <small style="color:var(--dim)">${g.slot==='wpn'?`攻+${g.atk}`:`護體+${g.ac}`}</small></span>
                  <button class="miniBtn" onclick="window.__lgEquip(${idx})">佩帶</button>
                </div>`;
              }).join('') : '<p style="color:var(--dim)">百寶囊目前空空如也。</p>'}
            </div>
          </div>
        </div>`;
    }else{
      const pet = activePet();
      body.innerHTML = `
        <div class="grid2">
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">上古化神真身（化神丹：${P.items.morphScroll || 0} 顆）</div>
            <div class="statLine"><span>當前形態</span><b>${MORPHS[P.morph||'none'].n} ${P.morph!=='none'?`(${Math.ceil(P.morphT)}s)`:''}</b></div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
              ${['asura','celestial','shadowlord','phoenix','taichu'].map(mk=>{
                const mo = MORPHS[mk];
                return `<button class="miniBtn" ${(P.items.morphScroll||0)<=0?'disabled':''} onclick="window.__lgMorph('${mk}')">化神·${mo.n}</button>`;
              }).join('')}
            </div>
          </div>
          <div class="box">
            <div style="font-weight:800;color:var(--gold);margin-bottom:6px">隨行上古靈獸（已收服 ${P.pets.length}/10 種）</div>
            ${pet ? `
              <div class="statLine"><span>出戰靈獸</span><b>${pet.name} (Lv.${pet.lv})</b></div>
              <div class="statLine"><span>靈獸攻／血</span><b>${petAtk(pet)} / ${petMaxHp(pet)}</b></div>
              <div class="statLine"><span>靈獸潛能點</span><b>${pet.statPts} <button class="miniBtn" ${pet.statPts<=0?'disabled':''} onclick="window.__lgPetStat('atk')">+攻</button> <button class="miniBtn" ${pet.statPts<=0?'disabled':''} onclick="window.__lgPetStat('hp')">+血</button></b></div>
              <div class="statLine"><span>神通等級</span><b>Lv.${pet.skillLv} (點:${pet.skillPts}) <button class="miniBtn" ${pet.skillPts<=0?'disabled':''} onclick="window.__lgPetSkill()">+1</button></b></div>
            ` : '<p>目前靈獸已寄放於靈獸園。</p>'}
          </div>
        </div>`;
    }
  }

  window.__lgStat = k => { if(P && P.statPts>0){ P[k]++; P.statPts--; recalc(P); saveGame(); renderSheetBody(); updateHud(); } };
  window.__lgAb = id => {
    const ab = ABILITIES.find(x=>x.id===id);
    if(!P || !ab || (P.abilityPts||0)<=0) return;
    const cur = P.abilities[id] || 0;
    if(cur >= ab.max) return;
    P.abilities[id] = cur + 1;
    P.abilityPts--;
    recalc(P); saveGame(); renderSheetBody(); updateHud();
  };
  window.__lgSkill = idx => {
    const sk = (SKILLS[P.cls]||SKILLS.knight)[idx];
    const cur = P.skillLv[idx] || 0;
    if(P.skillPts<=0 || P.lv<sk[1] || cur>=99) return;
    P.skillLv[idx] = cur + 1; P.skillPts--; saveGame(); renderSheetBody(); updateHud();
  };
  window.__lgEnchant = (slot, bless) => enchantGear(slot, bless);
  window.__lgEquip = idx => {
    const item = P.bag[idx];
    const g = GEAR_DB.find(x=>x.id===item.id);
    if(!g) return;
    P.bag.splice(idx, 1);
    if(g.slot === 'wpn'){
      if(P.eqWpn) P.bag.push({id:P.eqWpn, plus:P.wpnPlus||0});
      P.eqWpn = g.id; P.wpnPlus = item.plus || 0;
    }else{
      if(P.eqArm) P.bag.push({id:P.eqArm, plus:P.armPlus||0});
      P.eqArm = g.id; P.armPlus = item.plus || 0;
    }
    recalc(P); saveGame(); renderSheetBody(); updateHud();
  };
  window.__lgMorph = mk => {
    if((P.items.morphScroll||0) <= 0) return;
    P.items.morphScroll--;
    P.morph = mk; P.morphT = 120;
    SFX.enchantSuccess();
    addFx('nova', P.x, P.y, 140, '#ff595e', P.face);
    broadcast(`【化神降世】${P.name} 化身為【${MORPHS[mk].n}】，威壓震懾八荒！`);
    saveGame(); renderSheetBody(); updateHud();
  };
  window.__lgPetStat = tp => {
    const pet = activePet(); if(!pet || pet.statPts<=0) return;
    pet.statPts--; if(tp==='atk') pet.bAtk++; else pet.bHp++;
    pet.hp = petMaxHp(pet); saveGame(); renderSheetBody(); updateHud();
  };
  window.__lgPetSkill = () => {
    const pet = activePet(); if(!pet || pet.skillPts<=0) return;
    pet.skillPts--; pet.skillLv++; saveGame(); renderSheetBody(); updateHud();
  };

  function openShop(){
    if(!P) return;
    mode = 'shop';
    renderShop();
    $('shop').classList.add('on');
  }

  function renderShop(){
    $('shopSub').textContent = `持有銀兩：${P.adena} · 金瘡藥：${P.items.redPot||0} · 鍛造符：${P.items.wpnScroll||0}`;
    const itemRows = Object.values(ITEMS).map(it => `
      <div class="row">
        <div><b>${it.n}（持有 ${P.items[it.id]||0}）</b><p>${it.desc} · 售價 ${it.price} 銀兩</p></div>
        <button class="miniBtn" ${P.adena<it.price?'disabled':''} onclick="window.__lgBuyItem('${it.id}',${it.price})">購買</button>
      </div>
    `).join('');

    const gearRows = GEAR_DB.filter(g=>g.tier<=6).map(g => `
      <div class="row">
        <div><b>[T${g.tier}] ${g.name}</b><p>${g.slot==='wpn'?`攻擊 +${g.atk}`:`護體 +${g.ac}`} · 安定 +${g.safe} · 售價 ${g.price} 銀兩</p></div>
        <button class="miniBtn" ${P.adena<g.price?'disabled':''} onclick="window.__lgBuyGear('${g.id}',${g.price})">購買</button>
      </div>
    `).join('');

    const petRows = Object.values(PETS).map(pt => {
      const owned = P.pets.find(x=>x.type===pt.id);
      const isAct = P.activePet === pt.id;
      if(!owned){
        return `<div class="row"><div><b>契约靈獸：${pt.n}</b><p>${pt.role} · 費用 ${pt.cost} 銀兩</p></div><button class="miniBtn" ${P.adena<pt.cost?'disabled':''} onclick="window.__lgRecruitPet('${pt.id}',${pt.cost})">締結契約</button></div>`;
      }
      return `<div class="row"><div><b>${pt.n}（Lv.${owned.lv}）</b><p>${pt.role} · ${isAct?'目前隨行護法':'寄放於靈獸園'}</p></div><button class="miniBtn ${isAct?'g':''}" onclick="window.__lgSwitchPet('${pt.id}')">${isAct?'寄放':'召喚隨行'}</button></div>`;
    }).join('');

    $('shopBody').innerHTML = `
      <div style="max-height:58vh;overflow-y:auto">
        <div style="font-weight:800;color:var(--gold);margin-bottom:5px">靈丹妙藥與鍛造神符</div>
        ${itemRows}
        <div style="font-weight:800;color:var(--gold);margin:10px 0 5px">十種上古靈獸締結與召喚</div>
        ${petRows}
        <div style="font-weight:800;color:var(--gold);margin:10px 0 5px">萬寶閣神兵寶甲</div>
        ${gearRows}
      </div>
    `;
  }

  window.__lgBuyItem = (id, price) => { if(P.adena>=price){ P.adena-=price; P.items[id]=(P.items[id]||0)+1; saveGame(); renderShop(); updateHud(); } };
  window.__lgBuyGear = (id, price) => { if(P.adena>=price){ P.adena-=price; P.bag.push({id, plus:0}); broadcast(`已購入【${GEAR_DB.find(x=>x.id===id).name}】放入百寶囊`); saveGame(); renderShop(); updateHud(); } };
  window.__lgRecruitPet = (tp, cost) => {
    if(P.adena < cost) return;
    P.adena -= cost; const np = makePet(tp); np.x = P.x+35; np.y = P.y+35;
    P.pets.push(np); P.activePet = tp; saveGame(); renderShop(); updateHud();
  };
  window.__lgSwitchPet = tp => {
    if(P.activePet === tp){
      const other = P.pets.find(x=>x.type !== tp);
      P.activePet = other ? other.type : null;
    }else{
      P.activePet = tp;
      const obj = activePet(); if(obj){ obj.x = P.x+35; obj.y = P.y+35; }
    }
    saveGame(); renderShop(); updateHud();
  };

  // 三十重地宮快速傳送陣（在青雲古鎮安全區可傳送至已解鎖地宮）
  function openDungeonNavigator(){
    if(!P) return;
    const m = MAPS[curMapId];
    if(!inRect(m.safe, P.x, P.y)){
      broadcast('須在各層「安全結界區」內方可使用地宮傳送令');
      return;
    }
    const card = $('modalCard');
    const btns = [];
    for(let f=1; f<=30; f++){
      const d = MAPS[`dun${f}`];
      const boss = MONSTERS[`d${f}_boss`];
      btns.push(`<button class="miniBtn" style="margin:3px;width:46%" onclick="window.__lgJumpDun('dun${f}')">第${f}重 (Lv.${boss.lv})</button>`);
    }
    card.innerHTML = `
      <div style="font-family:var(--serif);font-weight:900;font-size:17px;color:var(--gold);margin-bottom:6px">三十重禁忌地宮傳送陣</div>
      <div style="max-height:52vh;overflow-y:auto;display:flex;flex-wrap:wrap;justify-content:center">${btns.join('')}</div>
      <div style="margin-top:10px"><button class="btn2 g" id="cancelDunBtn" type="button">關閉</button></div>
    `;
    $('modalBg').classList.add('on');
    $('cancelDunBtn').onclick = ()=>$('modalBg').classList.remove('on');
  }
  window.__lgJumpDun = mapId => {
    $('modalBg').classList.remove('on');
    SFX.heal();
    loadMap(mapId, 400, 400);
    broadcast(`已傳送至【${MAPS[mapId].n}】`);
    saveGame();
  };

  // 底部 9 格快捷欄（熱鍵 1~9）自訂配置器
  function openSlotConfig(){
    if(!P) return;
    const list = SKILLS[P.cls] || SKILLS.knight;
    const opts = [
      ...list.map((sk, idx)=>['s'+idx, `武學 ${idx+1}：${sk[0]} (Lv.${P.skillLv[idx]||0})`]),
      ['redPot', '丹藥：金瘡藥(小)'],
      ['orangePot', '丹藥：九轉大還丹'],
      ['superPot', '丹藥：太乙神仙露'],
      ['mpPot', '丹藥：聚靈回氣丹'],
      ['greenPot', '丹藥：疾風神行丹'],
      ['ragePot', '丹藥：龍虎大力丸'],
      ['expScroll', '丹藥：悟道雙倍丹'],
      ['homeScroll', '法符：青雲回城符'],
      ['morphScroll', '神丹：上古化神丹'],
      ['none', '空白']
    ];
    const card = $('modalCard');
    card.innerHTML = `
      <div style="font-family:var(--serif);font-weight:900;font-size:17px;color:var(--gold);margin-bottom:8px">自訂底部 9 格快捷欄（熱鍵 1 ~ 9）</div>
      <div style="max-height:55vh;overflow-y:auto">
      ${[0,1,2,3,4,5,6,7,8].map(i=>{
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:12px">
          <b style="color:var(--gold)">熱鍵 [${i+1}]</b>
          <select id="selSlot${i}" style="flex:1;background:#09080c;color:var(--paper);border:1px solid var(--metal);border-radius:3px;padding:5px">
            ${opts.map(([v, txt])=>`<option value="${v}" ${P.slots[i]===v?'selected':''}>${txt}</option>`).join('')}
          </select>
        </div>`;
      }).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <button class="btn2" id="saveSlotsBtn" type="button">儲存配置</button>
        <button class="btn2 g" id="cancelModalBtn" type="button">取消</button>
      </div>
    `;
    $('modalBg').classList.add('on');
    $('cancelModalBtn').onclick = ()=>$('modalBg').classList.remove('on');
    $('saveSlotsBtn').onclick = ()=>{
      for(let i=0; i<9; i++) P.slots[i] = $(`selSlot${i}`).value;
      saveGame(); updateHud(); $('modalBg').classList.remove('on');
      broadcast('已更新底部 1 ~ 9 格快捷欄配置');
    };
  }

  function openDeleteModal(){
    const sv = loadRawSave();
    if(!sv) return;
    const card = $('modalCard');
    card.innerHTML = `
      <div style="font-family:var(--serif);font-weight:900;font-size:17px;color:#ff7878">自廢武功（刪除存檔）</div>
      <p style="font-size:12px;color:var(--dim);margin:6px 0">確定要刪除俠客「<b>${sv.name || '少俠'}</b>」嗎？請輸入密碼（預設：<b>1234</b>）：</p>
      <input id="delPassInput" type="password" inputmode="numeric" maxlength="20" placeholder="請輸入密碼（預設 1234）">
      <div id="delErr" style="color:#ff6b6b;font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="btn2 r" id="confirmDelBtn" type="button">確認刪除</button>
        <button class="btn2 g" id="cancelModalBtn" type="button">取消</button>
      </div>
    `;
    $('modalBg').classList.add('on');
    setTimeout(()=>$('delPassInput').focus(), 40);
    $('cancelModalBtn').onclick = ()=>$('modalBg').classList.remove('on');
    const doDel = ()=>{
      const pass = $('delPassInput').value.trim();
      if(pass === (sv.pass || DEL_PASS_DEFAULT) || pass === DEL_PASS_DEFAULT){
        sDel(SAVE_KEY);
        if(P && P.name === sv.name) P = null;
        refreshMenuSaves();
        $('modalBg').classList.remove('on');
        broadcast('已刪除俠客存檔');
      }else{
        $('delErr').textContent = '密碼錯誤（預設密碼：1234）';
      }
    };
    $('confirmDelBtn').onclick = doDel;
    $('delPassInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') doDel(); });
  }

  function enterGame(cls, fromSave){
    SFX.unlock();
    const sv = fromSave ? loadRawSave() : null;
    const useCls = fromSave && sv && CLASSES[sv.cls] ? sv.cls : (cls || selCls || 'knight');
    const nameVal = fromSave && sv ? sv.name : $('inpName').value;
    P = createPlayer(useCls, nameVal, fromSave ? sv : null);
    loadMap(P.mapId || 'island', P.x, P.y);
    mode = 'play';
    $('menu').classList.remove('on');
    $('sheet').classList.remove('on');
    $('shop').classList.remove('on');
    $('hud').style.display = 'block';
    $('topRight').style.display = 'flex';
    $('ctl').style.display = 'block';
    saveGame();
    updateHud();
    broadcast(`歡迎【${P.name}】降臨青雲大荒！按下數字鍵 1~9 施展絕學與靈丹，挑戰三十重地宮！`);
  }

  function backToHome(){
    saveGame();
    mode = 'menu';
    $('hud').style.display = 'none';
    $('topRight').style.display = 'none';
    $('ctl').style.display = 'none';
    $('sheet').classList.remove('on');
    $('shop').classList.remove('on');
    refreshMenuSaves();
    $('menu').classList.add('on');
  }

  document.querySelectorAll('#clsCards .card').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#clsCards .card').forEach(c=>c.classList.remove('sel'));
      btn.classList.add('sel');
      selCls = btn.dataset.cls;
    });
  });
  $('bStartNew').addEventListener('click', ()=>enterGame(selCls, false));
  $('bCont').addEventListener('click', ()=>enterGame(selCls, true));
  $('bDelChar').addEventListener('click', openDeleteModal);
  $('btnHome').addEventListener('click', backToHome);
  $('btnMute').addEventListener('click', ()=>{
    const m = SFX.toggleMute();
    $('btnMute').textContent = m ? '音效:關' : '音效:開';
  });
  $('btnSheet').addEventListener('click', ()=>openSheet('stat'));
  $('btnEnchantQuick').addEventListener('click', ()=>openSheet('enchant'));
  $('btnDungeonNav').addEventListener('click', openDungeonNavigator);
  $('hudOpenSheet').addEventListener('click', ()=>openSheet('stat'));
  $('closeSheet').addEventListener('click', ()=>{ $('sheet').classList.remove('on'); mode = 'play'; });
  document.querySelectorAll('#sheet .tab').forEach(tb=>tb.addEventListener('click', ()=>openSheet(tb.dataset.tab)));
  $('bShop').addEventListener('click', openShop);
  $('closeShop').addEventListener('click', ()=>{ $('shop').classList.remove('on'); mode = 'play'; saveGame(); });
  $('bCfgSlots').addEventListener('click', openSlotConfig);

  const joyZone = $('joyZone'), joy = $('joy'), knob = $('knob');
  let joyId = null;
  function moveJoy(e){
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const maxR = 40, d = Math.hypot(dx, dy);
    if(d > maxR){ dx = dx/d*maxR; dy = dy/d*maxR; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    inp.mx = dx/maxR; inp.my = dy/maxR;
  }
  joyZone.addEventListener('pointerdown', e=>{
    if(joyId !== null) return;
    SFX.unlock(); joyId = e.pointerId;
    try{ joyZone.setPointerCapture(joyId); }catch(_){}
    moveJoy(e);
  });
  joyZone.addEventListener('pointermove', e=>{ if(e.pointerId === joyId) moveJoy(e); });
  const endJoy = e=>{ if(e.pointerId === joyId){ joyId = null; inp.mx = 0; inp.my = 0; knob.style.transform = 'translate(0,0)'; } };
  joyZone.addEventListener('pointerup', endJoy);
  joyZone.addEventListener('pointercancel', endJoy);

  $('bAtk').addEventListener('pointerdown', e=>{ e.preventDefault(); SFX.unlock(); inp.atk = true; });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>$('bAtk').addEventListener(ev, ()=>{ inp.atk = false; }));

  // 綁定底部 9 格快捷欄點擊與數字鍵 1~9 熱鍵
  for(let idx=0; idx<9; idx++){
    $(`bSlot${idx}`).addEventListener('pointerdown', e=>{ e.preventDefault(); SFX.unlock(); triggerSlot(idx); });
  }

  window.addEventListener('keydown', e=>{
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if(mode !== 'play' || !P) return;
    if(k >= '1' && k <= '9'){
      triggerSlot(parseInt(k, 10) - 1);
    }
    if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });

  if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    window.addEventListener('load', ()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  refreshMenuSaves();
  loadMap('island', 11000, 8900);

  let last = performance.now(), saveAcc = 0;
  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;
    update(dt);
    render();
    updateHud();
    saveAcc += dt;
    if(saveAcc >= 8 && mode === 'play' && P){ saveAcc = 0; saveGame(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();