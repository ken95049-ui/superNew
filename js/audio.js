
window.LG_AUDIO = (() => {
  let ctx = null, muted = false, bgmTimer = 0;

  function unlock(){
    if(muted) return null;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      if(!ctx) ctx = new AC();
      if(ctx.state === 'suspended') ctx.resume().catch(()=>{});
      return ctx;
    }catch(_){ return null; }
  }

  function tone(freq, dur, type='triangle', vol=0.055, slideTo=null){
    const c = unlock();
    if(!c) return;
    try{
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if(slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(35, slideTo), now + dur);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(now); osc.stop(now + dur + 0.02);
    }catch(_){}
  }

  function hit(crit){
    tone(crit ? 560 : 270, crit ? 0.16 : 0.09, crit ? 'sawtooth' : 'triangle', crit ? 0.08 : 0.05, crit ? 130 : 90);
  }
  function skill(){ tone(415, 0.22, 'sine', 0.07, 698); }
  function heal(){
    tone(440, 0.13, 'sine', 0.06, 587);
    setTimeout(()=>tone(659, 0.18, 'sine', 0.06, 880), 80);
  }
  function enchantSuccess(){
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i)=>setTimeout(()=>tone(f, 0.24, 'triangle', 0.08), i*70));
  }
  function enchantFail(){
    tone(190, 0.35, 'sawtooth', 0.09, 48);
    setTimeout(()=>tone(110, 0.4, 'square', 0.07, 38), 90);
  }
  function levelUp(){
    [440, 554.37, 659.25, 880].forEach((f, i)=>setTimeout(()=>tone(f, 0.22, 'triangle', 0.075), i*80));
  }

  function tickBgm(dt, active){
    if(muted || !active || !ctx || ctx.state !== 'running') return;
    bgmTimer -= dt;
    if(bgmTimer <= 0){
      // Medieval D-minor fantasy motif
      const scale = [293.66, 329.63, 349.23, 440.00, 466.16, 587.33];
      const f = scale[Math.floor(Math.random() * scale.length)];
      tone(f, 0.55, 'sine', 0.02);
      bgmTimer = 0.85;
    }
  }

  function toggleMute(){
    muted = !muted;
    if(!muted) unlock();
    return muted;
  }

  return { unlock, tone, hit, skill, heal, enchantSuccess, enchantFail, levelUp, tickBgm, toggleMute, isMuted:()=>muted };
})();
