window.LG_RENDER = (() => {
  const ISO_W = 0.86;
  const ISO_H = 0.48;

  function worldToIso(wx, wy, wz, camX, camY, vw, vh, shakeX, shakeY){
    const dx = wx - camX;
    const dy = wy - camY;
    const sx = (dx - dy) * ISO_W + vw * 0.5 + shakeX;
    const sy = (dx + dy) * ISO_H - wz + vh * 0.5 + shakeY;
    return [sx, sy];
  }

  function isoToWorld(sx, sy, camX, camY, vw, vh){
    const rx = (sx - vw * 0.5) / ISO_W;
    const ry = (sy - vh * 0.5) / ISO_H;
    const dx = (rx + ry) * 0.5;
    const dy = (ry - rx) * 0.5;
    return [camX + dx, camY + dy];
  }

  function drawIsoDiamond(ctx, x, y, w, h, camX, camY, vw, vh, fill, stroke, lineW=2){
    const p0 = worldToIso(x,     y,     0, camX, camY, vw, vh, 0, 0);
    const p1 = worldToIso(x + w, y,     0, camX, camY, vw, vh, 0, 0);
    const p2 = worldToIso(x + w, y + h, 0, camX, camY, vw, vh, 0, 0);
    const p3 = worldToIso(x,     y + h, 0, camX, camY, vw, vh, 0, 0);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lineW; ctx.stroke(); }
    return [p0, p1, p2, p3];
  }

  function drawIsoFloor(ctx, mapObj, camX, camY, vw, vh, t){
    const theme = mapObj.theme;
    ctx.fillStyle = theme === 'island' ? '#111a14' : (theme === 'dungeon' ? '#0f0d14' : (theme === 'abyss' ? '#170a0e' : '#14091c'));
    ctx.fillRect(0, 0, vw, vh);

    const step = 140;
    const [cx, cy] = isoToWorld(vw*0.5, vh*0.5, camX, camY, vw, vh);
    const span = Math.max(vw, vh) * 1.15;
    const minX = Math.max(0, Math.floor((cx - span)/step)*step);
    const maxX = Math.min(mapObj.w, Math.ceil((cx + span)/step)*step);
    const minY = Math.max(0, Math.floor((cy - span)/step)*step);
    const maxY = Math.min(mapObj.h, Math.ceil((cy + span)/step)*step);

    for(let gx = minX; gx < maxX; gx += step){
      for(let gy = minY; gy < maxY; gy += step){
        const hash = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
        const shade = (hash % 14) - 7;
        let fill;
        if(theme === 'island'){
          fill = `rgb(${24 + shade}, ${40 + shade}, ${26 + shade})`;
        }else if(theme === 'dungeon'){
          fill = `rgb(${24 + shade}, ${22 + shade}, ${31 + shade})`;
        }else if(theme === 'abyss'){
          fill = `rgb(${38 + shade}, ${15 + (shade>>1)}, ${20 + (shade>>1)})`;
        }else{
          fill = `rgb(${32 + shade}, ${16 + (shade>>1)}, ${44 + shade})`;
        }
        drawIsoDiamond(ctx, gx, gy, step, step, camX, camY, vw, vh, fill, 'rgba(255,255,255,0.04)', 1);
      }
    }

    const s = mapObj.safe;
    drawIsoDiamond(ctx, s.x, s.y, s.w, s.h, camX, camY, vw, vh,
      theme === 'island' ? 'rgba(92,76,46,0.52)' : 'rgba(54,68,94,0.45)',
      '#e2b857', 2.5
    );
    const sc = worldToIso(s.x + s.w*0.5, s.y + s.h*0.5, 0, camX, camY, vw, vh, 0, 0);
    ctx.fillStyle = '#ffe394';
    ctx.font = '800 13px "Noto Serif TC",serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.n, sc[0], sc[1] - 6);

    // 傳送陣（八卦星辰陣圖）
    for(const pt of mapObj.portals){
      const [px, py] = worldToIso(pt.x, pt.y, 0, camX, camY, vw, vh, 0, 0);
      if(px < -120 || px > vw + 120 || py < -120 || py > vh + 120) continue;
      const pulse = 1 + Math.sin(t * 4) * 0.1;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 0.56);
      ctx.rotate(t * 0.7);
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 32 * pulse, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = '#e2b857';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.rotate(Math.PI * 0.25);
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();
      ctx.fillStyle = '#9cd2ff';
      ctx.font = '800 11.5px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.label, px, py - 28);
    }
  }

  function drawIsoPillar(ctx, wx, wy, r, h, theme, camX, camY, vw, vh, t){
    const [bx, by] = worldToIso(wx, wy, 0, camX, camY, vw, vh, 0, 0);
    if(bx < -90 || bx > vw + 90 || by < -90 || by > vh + 90) return;

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(bx + 6, by + 3, r*1.15, r*0.58, 0, 0, Math.PI*2); ctx.fill();

    if(theme === 'island'){
      // 真實古樹造型（樹幹、樹根、多層樹冠）
      ctx.fillStyle = '#4a321f';
      ctx.beginPath();
      ctx.moveTo(bx - 7, by);
      ctx.lineTo(bx - 4, by - h);
      ctx.lineTo(bx + 4, by - h);
      ctx.lineTo(bx + 7, by);
      ctx.closePath(); ctx.fill();

      const leafCols = ['#1e4620', '#2b5e2e', '#3a783d'];
      for(let i=0; i<3; i++){
        ctx.fillStyle = leafCols[i];
        ctx.beginPath();
        ctx.ellipse(bx + (i-1)*6, by - h - i*9, r*(1.1 - i*0.18), r*(0.68 - i*0.1), 0, 0, Math.PI*2);
        ctx.fill();
      }
    }else{
      // 雕紋石柱與青銅火盆
      const topCol = theme === 'dungeon' ? '#545061' : '#5e2b30';
      const sideCol = theme === 'dungeon' ? '#312e3b' : '#38161a';
      ctx.fillStyle = sideCol;
      ctx.fillRect(bx - r*0.65, by - h, r*1.3, h);
      ctx.strokeStyle = '#09080c'; ctx.lineWidth = 1.4;
      ctx.strokeRect(bx - r*0.65, by - h, r*1.3, h);

      ctx.fillStyle = topCol;
      ctx.beginPath(); ctx.ellipse(bx, by - h, r*0.68, r*0.36, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      const fl = 5 + Math.sin(t*11 + wx)*2;
      const grad = ctx.createRadialGradient(bx, by - h - 6, 1, bx, by - h - 6, 28);
      grad.addColorStop(0, 'rgba(255,190,70,0.75)');
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(bx, by - h - 6, 28, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffcf56';
      ctx.beginPath(); ctx.arc(bx, by - h - 5, fl*0.55, 0, Math.PI*2); ctx.fill();
    }
  }

  // 真實人體武俠／神魔化神造型（頭身比例、戰甲、戰裙、四肢、動態披風、精緻神兵）
  function drawHero(ctx, P, camX, camY, vw, vh, shakeX, shakeY, t){
    const cls = LG_DATA.CLASSES[P.cls] || LG_DATA.CLASSES.knight;
    const morph = LG_DATA.MORPHS[P.morph || 'none'] || LG_DATA.MORPHS.none;
    const [gx, gy] = worldToIso(P.x, P.y, 0, camX, camY, vw, vh, shakeX, shakeY);
    const [bx, by] = worldToIso(P.x, P.y, P.z, camX, camY, vw, vh, shakeX, shakeY);

    // 腳下護體氣旋
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, 0.54);
    ctx.strokeStyle = P.morph !== 'none' ? morph.col : (P.lawful >= 0 ? '#58a6ff99' : '#ff4d4fbb');
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    const stride = P.moving ? Math.sin(t * 15) * 4.5 : 0;
    const walkBob = P.moving ? Math.abs(Math.sin(t * 15)) * 2.5 : Math.sin(t * 3) * 1.0;
    const swing = P.atkAnim > 0 ? Math.sin((1 - P.atkAnim/0.28) * Math.PI) * 1.45 : 0;
    const cy = by - walkBob;

    const isMorphed = P.morph !== 'none';
    const armObj = P.eqArm ? LG_DATA.GEAR_DB.find(g=>g.id===P.eqArm) : null;
    const wpnObj = P.eqWpn ? LG_DATA.GEAR_DB.find(g=>g.id===P.eqWpn) : null;

    const armorColor = isMorphed ? morph.col : (armObj ? armObj.col : cls.armorCol);
    const cloakColor = isMorphed ? '#240814' : cls.cloakCol;
    const wpnColor = isMorphed ? '#ffe066' : (wpnObj ? wpnObj.col : '#e8f0f8');
    const enchantGlow = (P.wpnPlus || 0) >= 7 ? '#ff6b6b' : ((P.wpnPlus || 0) >= 4 ? '#ffd666' : null);

    ctx.strokeStyle = '#09080c';
    ctx.lineWidth = 1.4;

    // 1. 動態戰袍披風
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(bx - 9, cy - 32);
    ctx.lineTo(bx + 9, cy - 32);
    ctx.lineTo(bx + 15 + Math.sin(t*7)*3, cy - 3);
    ctx.lineTo(bx - 15 + Math.sin(t*7)*3, cy - 3);
    ctx.closePath();
    ctx.fill();

    // 2. 雙腿與戰靴（行走擺動）
    ctx.fillStyle = '#1f1c24';
    ctx.beginPath();
    ctx.roundRect(bx - 6.5, cy - 13 + stride*0.4, 5, 13 - stride*0.4, 2);
    ctx.roundRect(bx + 1.5, cy - 13 - stride*0.4, 5, 13 + stride*0.4, 2);
    ctx.fill(); ctx.stroke();

    // 3. 戰甲胸甲與戰裙下擺
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.moveTo(bx - 10, cy - 32);
    ctx.lineTo(bx + 10, cy - 32);
    ctx.lineTo(bx + 8, cy - 16);
    ctx.lineTo(bx + 11, cy - 9);
    ctx.lineTo(bx - 11, cy - 9);
    ctx.lineTo(bx - 8, cy - 16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 金色腰帶扣
    ctx.fillStyle = '#e2b857';
    ctx.fillRect(bx - 7, cy - 18, 14, 3);

    // 4. 雙肩護甲與手臂
    ctx.fillStyle = isMorphed ? '#ffd666' : '#c8d0d8';
    ctx.beginPath();
    ctx.ellipse(bx - 11, cy - 29, 5, 3.8, -0.3, 0, Math.PI*2);
    ctx.ellipse(bx + 11, cy - 29, 5, 3.8, 0.3, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // 左臂護腕
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.roundRect(bx - 13.5, cy - 27 - stride*0.3, 4.5, 12, 2);
    ctx.fill(); ctx.stroke();

    // 5. 頭部、五官與髮冠／化神魔角
    const hy = cy - 40;
    ctx.fillStyle = isMorphed && P.morph === 'asura' ? '#d8c8d0' : '#f5cba7';
    ctx.beginPath();
    ctx.ellipse(bx, hy, 7.5, 8.8, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // 髮髻與頭飾
    ctx.fillStyle = P.cls === 'elf' ? '#e8d27a' : (P.cls === 'darkelf' ? '#d8d2e8' : '#1e1614');
    ctx.beginPath();
    ctx.arc(bx, hy - 2.5, 8, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // 頭頂髮髻
    ctx.beginPath();
    ctx.arc(bx, hy - 10.5, 3.8, 0, Math.PI*2);
    ctx.fill();

    if(isMorphed || P.cls === 'royal'){
      ctx.strokeStyle = '#ffd659'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx - 6, hy - 6); ctx.quadraticCurveTo(bx - 14, hy - 14, bx - 10, hy - 20);
      ctx.moveTo(bx + 6, hy - 6); ctx.quadraticCurveTo(bx + 14, hy - 14, bx + 10, hy - 20);
      ctx.stroke();
    }

    // 雙眼
    ctx.fillStyle = isMorphed ? '#ff2a2a' : '#141414';
    ctx.fillRect(bx - 3.5, hy - 1, 2, 2);
    ctx.fillRect(bx + 1.5, hy - 1, 2, 2);

    // 6. 右臂與精緻神兵（長劍、重刀、長弓、星辰法杖、雙刺）
    const ang = P.face + swing - 0.55;
    const hx = bx + Math.cos(P.face)*9;
    const hy2 = cy - 22 + Math.sin(P.face)*5;
    ctx.save();
    ctx.translate(hx, hy2);
    ctx.rotate(ang);
    if(enchantGlow){
      ctx.shadowColor = enchantGlow;
      ctx.shadowBlur = 14;
    }
    if(cls.wpnStyle === 'bow' && !isMorphed){
      // 雙曲反曲長弓
      ctx.strokeStyle = wpnColor; ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(2, -16);
      ctx.quadraticCurveTo(15, -8, 12, 0);
      ctx.quadraticCurveTo(15, 8, 2, 16);
      ctx.stroke();
      ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(2, -16); ctx.lineTo(2, 16); ctx.stroke();
    }else if(cls.wpnStyle === 'staff' && !isMorphed){
      // 寶石靈杖
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(14, -18); ctx.stroke();
      ctx.fillStyle = wpnColor;
      ctx.beginPath(); ctx.arc(15, -20, 4.5, 0, Math.PI*2); ctx.fill();
    }else{
      // 劍鍔與鋒利劍身
      ctx.fillStyle = wpnColor;
      ctx.beginPath();
      ctx.moveTo(0, -1.8);
      ctx.lineTo(isMorphed ? 34 : 26, -15);
      ctx.lineTo(isMorphed ? 38 : 29, -17);
      ctx.lineTo(isMorphed ? 32 : 24, -11);
      ctx.lineTo(2, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e2b857'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(5, 4); ctx.stroke();
    }
    ctx.restore();

    return [bx, hy - 20];
  }

  // 10 種上古靈獸真實生物輪廓繪製
  function drawPet(ctx, pet, camX, camY, vw, vh, sxShake, syShake, t){
    const pt = LG_DATA.PETS[pet.type] || LG_DATA.PETS.wolf;
    const [px, py] = worldToIso(pet.x, pet.y, pet.z, camX, camY, vw, vh, sxShake, syShake);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(px, py + pet.z, 15, 7.5, 0, 0, Math.PI*2); ctx.fill();

    const wag = Math.sin(t * 14) * 3.5;
    ctx.fillStyle = pt.col;
    ctx.strokeStyle = '#09080c';
    ctx.lineWidth = 1.4;

    if(pet.type === 'hawk' || pet.type === 'phoenix' || pet.type === 'dragon'){
      // 展翼飛禽／神龍形態（雙翼拍動、長尾羽）
      const flap = Math.sin(t * 16) * 8;
      ctx.beginPath();
      ctx.moveTo(px, py - 18);
      ctx.quadraticCurveTo(px - 18, py - 28 + flap, px - 24, py - 14 + flap);
      ctx.lineTo(px - 6, py - 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, py - 18);
      ctx.quadraticCurveTo(px + 18, py - 28 + flap, px + 24, py - 14 + flap);
      ctx.lineTo(px + 6, py - 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // 軀幹與頭冠
      ctx.beginPath(); ctx.ellipse(px, py - 15, 7, 11, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py - 26, 5.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // 尾羽
      ctx.beginPath(); ctx.moveTo(px - 3, py - 6); ctx.lineTo(px + wag, py + 4); ctx.lineTo(px + 3, py - 6); ctx.fill();
    }else if(pet.type === 'turtle'){
      // 玄武巨龜（龜甲背殼、四足、蛇尾）
      ctx.fillStyle = '#1d4e4f';
      ctx.beginPath(); ctx.ellipse(px, py - 10, 14, 9, 0, Math.PI, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pt.col;
      ctx.fillRect(px - 11, py - 10, 22, 4);
      ctx.beginPath(); ctx.arc(px + 13, py - 11, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }else{
      // 四足神獸（蒼狼、玄熊、九尾狐、白虎、火麒麟、饕餮）
      // 尾巴（九尾狐繪製多條尾羽）
      const tails = pet.type === 'fox' ? 5 : 1;
      for(let k=0; k<tails; k++){
        const spread = (k - (tails-1)/2) * 4;
        ctx.beginPath();
        ctx.moveTo(px - 9, py - 12);
        ctx.quadraticCurveTo(px - 18, py - 20 + wag + spread, px - 14, py - 26 + spread);
        ctx.lineTo(px - 7, py - 15);
        ctx.fill();
      }
      // 四肢
      ctx.fillRect(px - 8, py - 8, 3.5, 8);
      ctx.fillRect(px + 5, py - 8, 3.5, 8);
      // 獸軀
      ctx.beginPath(); ctx.ellipse(px, py - 12, 11, 6.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // 獸首與雙耳／麒麟角
      ctx.beginPath(); ctx.arc(px + 9, py - 18, 6.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + 6, py - 23); ctx.lineTo(px + 5, py - 30); ctx.lineTo(px + 9, py - 24);
      ctx.moveTo(px + 11, py - 23); ctx.lineTo(px + 13, py - 30); ctx.lineTo(px + 14, py - 24);
      ctx.fill();
    }
    return [px, py - 34];
  }

  // 多樣化異獸與地宮首領真實造型
  function drawMonster(ctx, e, P, camX, camY, vw, vh, shakeX, shakeY, t){
    const [gx, gy] = worldToIso(e.x, e.y, 0, camX, camY, vw, vh, shakeX, shakeY);
    if(gx < -110 || gx > vw + 110 || gy < -110 || gy > vh + 110) return null;
    const [bx, by] = worldToIso(e.x, e.y, e.z, camX, camY, vw, vh, shakeX, shakeY);

    ctx.fillStyle = 'rgba(0,0,0,0.44)';
    ctx.beginPath(); ctx.ellipse(gx, gy, e.r*1.15, e.r*0.58, 0, 0, Math.PI*2); ctx.fill();

    const r = e.r;
    const cy = by - Math.abs(Math.sin(t*6 + e.hx))*2.2;
    const fill = e.hitT > 0 ? '#ffffff' : e.col;
    ctx.strokeStyle = '#09080c'; ctx.lineWidth = 1.5;

    if(e.shape === 'spider'){
      ctx.strokeStyle = '#29172e'; ctx.lineWidth = 2.6;
      for(let s=-1; s<=1; s+=2){
        for(let k=0; k<4; k++){
          const legWig = Math.sin(t*13 + k)*3.5;
          ctx.beginPath();
          ctx.moveTo(bx, cy - r*0.5);
          ctx.lineTo(bx + s*(r*1.35), cy - r*1.0 + k*4 + legWig);
          ctx.lineTo(bx + s*(r*1.7), cy + 2);
          ctx.stroke();
        }
      }
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.ellipse(bx, cy - r*0.58, r*0.95, r*0.65, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(bx - 5, cy - r*0.65, 3, 3);
      ctx.fillRect(bx + 2, cy - r*0.65, 3, 3);
      return [bx, cy - r*1.38];
    }

    if(e.shape === 'serpent'){
      // 盤繞毒蟒／雙頭巨蛇
      ctx.fillStyle = fill;
      for(let seg=0; seg<4; seg++){
        const ox = Math.sin(t*7 + seg*1.2) * (6 - seg);
        ctx.beginPath();
        ctx.ellipse(bx + ox, cy - 6 - seg*7, r*(0.85 - seg*0.12), r*0.35, 0, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(bx, cy - r*1.45, r*0.48, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffea00';
      ctx.fillRect(bx - 4, cy - r*1.5, 2.5, 2.5);
      ctx.fillRect(bx + 2, cy - r*1.5, 2.5, 2.5);
      return [bx, cy - r*2.0];
    }

    if(e.shape === 'beast' || e.shape === 'wolf'){
      // 四足猛獸（獠豬、魔狼）
      ctx.fillStyle = fill;
      ctx.fillRect(bx - r*0.7, cy - r*0.55, 4, r*0.55);
      ctx.fillRect(bx + r*0.45, cy - r*0.55, 4, r*0.55);
      ctx.beginPath(); ctx.ellipse(bx, cy - r*0.85, r*0.95, r*0.55, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + r*0.75, cy - r*1.15, r*0.52, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // 獠牙／獸耳
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(bx + r*1.1, cy - r*1.0); ctx.lineTo(bx + r*1.45, cy - r*1.25); ctx.lineTo(bx + r*1.05, cy - r*1.15); ctx.fill();
      return [bx, cy - r*1.75];
    }

    if(e.shape === 'golem'){
      // 多節岩石巨像（肩甲、重拳、軀幹）
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(bx - r*0.9, cy - r*1.65);
      ctx.lineTo(bx + r*0.9, cy - r*1.65);
      ctx.lineTo(bx + r*0.65, cy - r*0.2);
      ctx.lineTo(bx - r*0.65, cy - r*0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 雙巨臂
      ctx.fillRect(bx - r*1.25, cy - r*1.5, r*0.32, r*1.1);
      ctx.fillRect(bx + r*0.93, cy - r*1.5, r*0.32, r*1.1);
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(bx - 7, cy - r*1.32, 14, 3);
      return [bx, cy - r*1.85];
    }

    // 人形妖魔與地宮魔王（具備肩甲、四肢、披風、巨角／魔翼）
    if(e.boss){
      // 魔王背後暗黑雙翼
      const wingFlap = Math.sin(t * 7) * 6;
      ctx.fillStyle = '#2b0918';
      ctx.beginPath();
      ctx.moveTo(bx, cy - r*1.2);
      ctx.lineTo(bx - r*1.9, cy - r*2.1 + wingFlap);
      ctx.lineTo(bx - r*1.4, cy - r*0.6);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx, cy - r*1.2);
      ctx.lineTo(bx + r*1.9, cy - r*2.1 + wingFlap);
      ctx.lineTo(bx + r*1.4, cy - r*0.6);
      ctx.closePath(); ctx.fill();
    }

    // 雙腿與軀幹
    ctx.fillStyle = '#18141c';
    ctx.fillRect(bx - r*0.45, cy - r*0.55, r*0.32, r*0.55);
    ctx.fillRect(bx + r*0.13, cy - r*0.55, r*0.32, r*0.55);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(bx - r*0.72, cy - r*1.35);
    ctx.lineTo(bx + r*0.72, cy - r*1.35);
    ctx.lineTo(bx + r*0.55, cy - r*0.5);
    ctx.lineTo(bx - r*0.55, cy - r*0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 頭顱
    const hy = cy - r*1.68;
    const hr = r * 0.56;
    ctx.fillStyle = e.shape === 'skel' ? '#efe9d8' : fill;
    ctx.beginPath(); ctx.arc(bx, hy, hr, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    if(e.boss){
      ctx.strokeStyle = '#ffd659'; ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(bx - hr*0.6, hy - hr*0.6); ctx.quadraticCurveTo(bx - hr*1.6, hy - hr*1.6, bx - hr*0.9, hy - hr*2.1);
      ctx.moveTo(bx + hr*0.6, hy - hr*0.6); ctx.quadraticCurveTo(bx + hr*1.6, hy - hr*1.6, bx + hr*0.9, hy - hr*2.1);
      ctx.stroke();
    }

    ctx.fillStyle = e.boss ? '#ffea00' : '#ff3b3b';
    ctx.fillRect(bx - hr*0.42, hy - 1, 3, 2.5);
    ctx.fillRect(bx + hr*0.18, hy - 1, 3, 2.5);

    return [bx, hy - hr - 10];
  }

  return { worldToIso, isoToWorld, drawIsoFloor, drawIsoPillar, drawHero, drawPet, drawMonster };
})();