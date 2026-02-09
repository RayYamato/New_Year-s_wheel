(() => {
  // Helper: safe getElementById (logs if missing)
  function $id(id){
    const el = document.getElementById(id);
    if(!el) console.warn('Missing element:', id);
    return el;
  }

  // DOM references (use safe getter)
  const svg = $id('wheel');
  const prizeInput = $id('prizeInput');
  const addBtn = $id('addBtn');
  const prizeList = $id('prizeList');
  const sidePrizes = $id('sidePrizes');
  const spinBtn = $id('spinBtn');
  const overlay = $id('overlay');
  const resultPrizeEl = $id('resultPrize');
  const closeOverlay = $id('closeOverlay');
  const confettiRoot = $id('confetti');
  const clearBtn = $id('clearBtn');
  const importSample = $id('importSample');
  const pointerEl = $id('pointer');
  const musicToggle = $id('musicToggle');
  const sfxToggle = $id('sfxToggle');
  const goldDustRoot = $id('goldDust');
  const petalRoot = $id('petal-root');
  const fwCanvas = $id('fwCanvas');

  // envelope DOM
  const modeToggle = $id('modeToggle');
  const envelopeSection = $id('envelopeSection');
  const envelopeGrid = $id('envelopeGrid');
  const createEnvelopesBtn = $id('createEnvelopes');
  const closeEnvelopesBtn = $id('closeEnvelopes');
  const envelopeCountInput = $id('envelopeCount');
  const wheelSection = $id('wheelSection');
  const actionArea = $id('actionArea');
  const modeNote = $id('modeNote');
  const shuffleBtn = $id('shuffleBtn');
  const openAllBtn = $id('openAllBtn');
  const pointerFix = $id('pointerFix');

  // state
  let prizes = [];
  let spinning = false;
  let audioCtx = null;            // for SFX (kept)
  let musicPlaying = false;       // bg music (HTMLAudio) state
  let sfxEnabled = true;
  let mode = 'wheel'; // 'wheel' or 'envelope'
  const musicNodes = [];
  let musicLoopTimer = null;

  // ---------- safe helpers ----------
  const d2r = d => d * Math.PI / 180;
  function polarToCartesian(cx, cy, r, angleDeg) { const rad = d2r(angleDeg); return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = (endAngle - startAngle) <= 180 ? "0" : "1";
    return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
  }
  function splitToLines(text, maxChars=16, maxLines=2){
    const words = (text||'').split(' '); const lines=[]; let cur='';
    for(const w of words){
      if((cur + (cur? ' ' : '') + w).length <= maxChars) cur = cur ? (cur + ' ' + w) : w;
      else { if(cur) lines.push(cur); cur = w; if(lines.length >= maxLines-1) break; }
    }
    if(cur && lines.length < maxLines) lines.push(cur);
    if(words.join(' ').length > lines.join(' ').length) lines[lines.length-1] = lines[lines.length-1].slice(0, Math.max(0, lines[lines.length-1].length-1)) + '…';
    return lines;
  }
  const colors = ['#f44336','#ff7043','#ffd54f','#ffb74d','#e57373','#ff8a65','#ffd180','#ef5350'];

  // ---------- render wheel ----------
  function renderWheel(){
    if(!svg) return;
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const n = prizes.length; const cx=250, cy=250, rOuter=220;
    if(n === 0){
      const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',180);
      circle.setAttribute('fill','#fff3e6'); circle.setAttribute('stroke','#ffd9b3'); circle.setAttribute('stroke-width',2);
      svg.appendChild(circle);
      const t = document.createElementNS('http://www.w3.org/2000/svg','text'); t.setAttribute('x',cx); t.setAttribute('y',cy+6); t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','20'); t.setAttribute('fill','#7a1515'); t.textContent='Chưa có phần thưởng'; svg.appendChild(t);
      if(spinBtn) spinBtn.disabled = true;
      return;
    }
    const sector = 360 / n;
    const baseFont = Math.min(16, Math.max(10, Math.round(120/n)));
    for(let i=0;i<n;i++){
      const start = -90 + i*sector, end = start + sector;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', describeArc(cx,cy,rOuter,start,end));
      path.setAttribute('fill', colors[i % colors.length]);
      path.setAttribute('stroke','#fff'); path.setAttribute('stroke-width','1.4');
      svg.appendChild(path);

      const mid = start + sector/2;
      const pos = polarToCartesian(cx,cy,rOuter*0.62,mid);
      const text = document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('x',pos.x); text.setAttribute('y',pos.y); text.setAttribute('fill','#4a1f1f'); text.setAttribute('font-size',baseFont);
      text.setAttribute('font-weight','900'); text.setAttribute('text-anchor','middle'); text.setAttribute('transform',`rotate(${mid+90} ${pos.x} ${pos.y})`);
      const lines = splitToLines(prizes[i],16,2);
      for(let li=0; li<lines.length; li++){
        const tspan = document.createElementNS('http://www.w3.org/2000/svg','tspan');
        tspan.setAttribute('x', pos.x);
        const lineHeight = baseFont+2;
        tspan.setAttribute('dy', li===0 ? (-(lines.length-1)*(lineHeight/2)) : lineHeight);
        tspan.setAttribute('font-size', baseFont);
        tspan.textContent = lines[li];
        text.appendChild(tspan);
      }
      svg.appendChild(text);
    }
    const ring = document.createElementNS('http://www.w3.org/2000/svg','circle');
    ring.setAttribute('cx',cx); ring.setAttribute('cy',cy); ring.setAttribute('r',190);
    ring.setAttribute('fill','none'); ring.setAttribute('stroke','rgba(255,230,150,0.06)'); ring.setAttribute('stroke-width','8');
    svg.appendChild(ring);

    if(spinBtn) spinBtn.disabled = false;
  }

  // ---------- lists ----------
  function renderLists(){
    if(!prizeList) return;
    prizeList.innerHTML=''; if(sidePrizes) sidePrizes.innerHTML='';
    for(let i=0;i<prizes.length;i++){
      const p = prizes[i];
      const chip = document.createElement('div'); chip.className='chip'; chip.textContent = p;
      const del = document.createElement('button'); del.className='del'; del.textContent='✕'; del.title='Xóa'; del.type='button';
      del.addEventListener('click', ()=>{ if(spinning) return; prizes.splice(i,1); renderLists(); renderWheel(); });
      chip.appendChild(del); prizeList.appendChild(chip);

      if(sidePrizes){
        const card = document.createElement('div'); card.className='p-card'; card.textContent = p;
        const del2 = document.createElement('button'); del2.className='del'; del2.textContent='✕'; del2.title='Xóa'; del2.type='button';
        del2.addEventListener('click', ()=>{ if(spinning) return; const idx = prizes.indexOf(p); if(idx>=0) prizes.splice(idx,1); renderLists(); renderWheel(); });
        card.appendChild(del2); sidePrizes.appendChild(card);
      }
    }
  }

  // ---------- add prize ----------
  function addPrize(val){ const t = (val||'').trim(); if(!t) return; prizes.push(t); if(prizeInput) prizeInput.value=''; renderLists(); renderWheel(); }
  if(addBtn) addBtn.addEventListener('click', ()=> addPrize(prizeInput && prizeInput.value));
  if(prizeInput) prizeInput.addEventListener('keydown', e=>{ if(e.key==='Enter') { e.preventDefault(); addPrize(prizeInput.value); } });

  if(clearBtn) clearBtn.addEventListener('click', ()=>{ if(spinning) return; if(confirm('Xóa hết phần thưởng?')){ prizes=[]; renderLists(); renderWheel(); }});
  if(importSample) importSample.addEventListener('click', ()=> {
    const samples = ['Lì xì 20.000đ','Lì xì 50.000đ','Phiếu giảm giá 10%','Quà bí mật','Thử thách vui','Chúc mừng năm mới','Mì tôm 1 gói','Voucher trà sữa'];
    for(const s of samples) if(!prizes.includes(s)) prizes.push(s);
    renderLists(); renderWheel();
  });

  // ---------- audio (SFX via AudioContext kept) ----------
  function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

  // ---------- Background music (HTMLAudio playlist) ----------
  const musicFiles = [
    'music/test1.mp3',
    'music/test2.mp3',
    'music/test3.mp3',
    'music/test4.mp3'
  ];
  let musicOrder = [];
  let musicIndex = 0;
  let bgAudio = null;

  function shuffleMusic(){
    musicOrder = musicFiles.slice();
    for(let i = musicOrder.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [musicOrder[i], musicOrder[j]] = [musicOrder[j], musicOrder[i]];
    }
  }

  function startMusic(){
    if(musicPlaying) return;
    if(musicFiles.length === 0) { alert('Chưa có file nhạc trong musicFiles'); return; }
    shuffleMusic();
    musicIndex = 0;
    try{
      bgAudio = new Audio();
      bgAudio.src = musicOrder[musicIndex];
      bgAudio.preload = 'auto';
      bgAudio.volume = 0.55;
      bgAudio.addEventListener('ended', ()=> {
        musicIndex++;
        if(musicIndex >= musicOrder.length){
          shuffleMusic();
          musicIndex = 0;
        }
        try{
          bgAudio.src = musicOrder[musicIndex];
          bgAudio.play().catch(()=>{});
        }catch(e){ console.warn(e); }
      });
      bgAudio.play().catch(()=>{ /* play may be blocked until user gesture; but toggle click is user gesture */ });
      musicPlaying = true;
      if(musicToggle) musicToggle.textContent = 'Nhạc: Bật';
    }catch(e){
      console.warn('startMusic error', e);
    }
  }

  function stopMusic(){
    if(!musicPlaying) return;
    try{
      if(bgAudio){
        bgAudio.pause();
        try{ bgAudio.currentTime = 0; }catch(e){}
        bgAudio.src = '';
        bgAudio = null;
      }
    }catch(e){
      console.warn(e);
    }
    musicPlaying = false;
    if(musicToggle) musicToggle.textContent = 'Nhạc: Tắt';
  }

  if(musicToggle){
    musicToggle.addEventListener('click', ()=>{ if(!audioCtx) ensureAudio(); if(!musicPlaying){ if(audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume && audioCtx.resume(); } startMusic(); } else { stopMusic(); } });
  }

  if(sfxToggle){
    sfxToggle.addEventListener('click', ()=> { sfxEnabled = !sfxEnabled; sfxToggle.textContent = sfxEnabled ? 'Hiệu ứng: Bật' : 'Hiệu ứng: Tắt'; });
    sfxToggle.textContent = sfxEnabled ? 'Hiệu ứng: Bật' : 'Hiệu ứng: Tắt';
  }

  // ---------- sound effects (unchanged) ----------
  function playSpinStart(){
    if(!sfxEnabled) return;
    try{
      ensureAudio();
      const t = audioCtx.currentTime; const g = audioCtx.createGain(); g.gain.value = 0.9; g.connect(audioCtx.destination);
      const freqs = [280,420,560];
      freqs.forEach((f,i)=>{ const o = audioCtx.createOscillator(); o.type='sawtooth'; const og = audioCtx.createGain(); og.gain.setValueAtTime(0.0001,t+i*0.03); og.gain.linearRampToValueAtTime(0.08,t+i*0.03+0.01); og.gain.exponentialRampToValueAtTime(0.0001,t+i*0.03+0.22); o.frequency.setValueAtTime(f,t+i*0.03); o.connect(og); og.connect(g); o.start(t+i*0.03); o.stop(t+i*0.03+0.25); musicNodes.push(o,og); });
      setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, 500);
    }catch(e){}
  }
  function playWin(){
    if(!sfxEnabled) return;
    try{
      ensureAudio();
      const t = audioCtx.currentTime; const g = audioCtx.createGain(); g.gain.value = 0.18; g.connect(audioCtx.destination);
      [0,0.08,0.16].forEach((d,idx)=>{ const o = audioCtx.createOscillator(); o.type='sine'; const og = audioCtx.createGain(); og.gain.setValueAtTime(0.001,t+d); og.gain.linearRampToValueAtTime(0.14,t+d+0.01); og.gain.exponentialRampToValueAtTime(0.0001,t+d+0.7); o.frequency.setValueAtTime(880 * Math.pow(1.12, idx), t+d); o.connect(og); og.connect(g); o.start(t+d); o.stop(t+d+0.9); musicNodes.push(o,og); });
      setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, 1200);
    }catch(e){}
  }

  // small shuffle sound
  function playShuffleSound(){
    if(!sfxEnabled) return;
    try{
      ensureAudio();
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain(); g.gain.value = 0.12; g.connect(audioCtx.destination);
      const o = audioCtx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(880, t);
      const og = audioCtx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.12, t+0.02); og.gain.exponentialRampToValueAtTime(0.0001, t+0.18);
      o.connect(og); og.connect(g); o.start(t); o.stop(t+0.18);
      musicNodes.push(o,og,g);
      setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, 300);
    }catch(e){}
  }

  // envelope open sound
  function playEnvelopeOpen(){
    if(!sfxEnabled) return;
    try{
      ensureAudio();
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain(); g.gain.value = 0.6; g.connect(audioCtx.destination);
      const o = audioCtx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(820, t);
      const og = audioCtx.createGain(); og.gain.setValueAtTime(0.001, t); og.gain.linearRampToValueAtTime(0.18, t+0.02); og.gain.exponentialRampToValueAtTime(0.0001, t+0.9);
      o.connect(og); og.connect(g); o.start(t); o.stop(t+0.9);
      musicNodes.push(o,og,g);
      setTimeout(()=>{ try{ g.disconnect(); }catch(e){} }, 1200);
    }catch(e){}
  }

  // ---------- fireworks canvas ----------
  const fw = fwCanvas; const fctx = fw ? fw.getContext('2d') : null; let fwW=0, fwH=0, fwParts=[];
  function resizeFW(){ if(!fw || !fctx) return; fwW = fw.width = window.innerWidth * devicePixelRatio; fwH = fw.height = window.innerHeight * devicePixelRatio; fw.style.width = window.innerWidth + 'px'; fw.style.height = window.innerHeight + 'px'; fctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
  if(window) window.addEventListener('resize', resizeFW); resizeFW();
  function triggerFW(x=null,y=null){
    if(!fw) return;
    const cx = x===null ? (Math.random()*0.6 + 0.2)*window.innerWidth : x;
    const cy = y===null ? (Math.random()*0.35 + 0.08)*window.innerHeight : y;
    const count = Math.floor(Math.random()*44 + 22); const hue = Math.floor(Math.random()*60);
    for(let i=0;i<count;i++) fwParts.push({ x:cx, y:cy, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.6)*6, life: Math.floor(Math.random()*90+40), size: Math.random()*3+1.5, hue, alpha:1 });
  }
  setInterval(()=>{ if(Math.random()<0.45) triggerFW(); }, 1200);
  function drawFW(){ if(!fctx) return; fctx.clearRect(0,0,fw.width,fw.height); for(let i=fwParts.length-1;i>=0;i--){ const p=fwParts[i]; p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.life--; p.alpha = Math.max(0, p.life/110); fctx.beginPath(); fctx.fillStyle = `rgba(${220},${120 + p.hue%120},${80 + p.hue%100},${p.alpha})`; fctx.arc(p.x, p.y, p.size, 0, Math.PI*2); fctx.fill(); if(p.life<=0) fwParts.splice(i,1); } requestAnimationFrame(drawFW); }
  drawFW();

  // petals & gold dust
  function makePetal(){ if(!petalRoot) return; const el = document.createElement('div'); el.className='petal'; el.style.position='absolute'; el.style.width = (10 + Math.random()*18) + 'px'; el.style.height = (8 + Math.random()*14) + 'px'; el.style.left = Math.random()*100 + '%'; el.style.top = '-6%'; el.style.opacity = (0.6 + Math.random()*0.4); el.style.borderRadius = '50% 30% 50% 30%'; el.style.background = `radial-gradient(circle at 40% 30%, #fff, #ffdddd)`; el.style.transform = `rotate(${Math.random()*360}deg) scale(${0.8 + Math.random()*0.8})`; el.style.filter = 'drop-shadow(0 6px 8px rgba(120,20,20,0.06))'; el.style.animation = `petalFall ${6 + Math.random()*6}s linear`; petalRoot.appendChild(el); setTimeout(()=>{ try{ el.remove(); }catch(e){} }, (6 + Math.random()*6)*1000 + 500); }
  for(let i=0;i<18;i++) setTimeout(makePetal, i*160);
  setInterval(()=>{ for(let i=0;i<3;i++) setTimeout(makePetal, i*220); }, 1600);
  function makeGold(){ if(!goldDustRoot) return; for(let i=0;i<80;i++){ const d = document.createElement('div'); d.className='gold-dot'; d.style.left = Math.random()*100 + '%'; d.style.top = Math.random()*100 + '%'; d.style.opacity = (0.15 + Math.random()*0.8); d.style.width = d.style.height = (2 + Math.random()*4) + 'px'; goldDustRoot.appendChild(d); } }
  makeGold();

  // ---------- SPIN (wheel) ----------
  function spin(){
    if(mode !== 'wheel') return; // only spin in wheel mode
    if(spinning || prizes.length===0) return;
    spinning = true; setControls(true);
    if(sfxEnabled) playSpinStart();
    const n = prizes.length; const target = Math.floor(Math.random()*n); const sector = 360/n;
    const spins = Math.floor(Math.random()*3) + 6;
    const final = spins*360 + 180 - (target + 0.5) * sector;
    if(svg){
      svg.style.transition = 'transform 5.2s cubic-bezier(.16,.98,.35,1)';
      svg.style.transform = `rotate(${final}deg)`;
    }
    // pointer jiggle
    if(pointerEl) pointerEl.style.transform = (pointerEl.classList.contains('top') ? 'translateX(-50%) rotate(180deg) translateY(-2px) scale(1.01)' : 'translateX(-50%) translateY(-2px) scale(1.01)');
    const handler = ()=>{
      if(svg){
        svg.style.transition = '';
        svg.style.transform = `rotate(${(final % 360)}deg)`;
      }
      spinning = false; setControls(false);
      if(pointerEl) pointerEl.style.transform = (pointerEl.classList.contains('top') ? 'translateX(-50%) rotate(180deg)' : 'translateX(-50%)');
      if(sfxEnabled) playWin();
      showResult(prizes[target]);
      triggerFW(window.innerWidth/2, window.innerHeight*0.28);
      if(svg) svg.removeEventListener('transitionend', handler);
    };
    if(svg) svg.addEventListener('transitionend', handler);
    else setTimeout(handler, 5200); // fallback if svg missing
  }
  if(spinBtn) spinBtn.addEventListener('click', ()=> { if(mode === 'wheel') spin(); });

  function setControls(disabled){
    if(spinBtn) spinBtn.disabled = disabled;
    if(addBtn) addBtn.disabled = disabled;
    if(clearBtn) clearBtn.disabled = disabled;
    if(importSample) importSample.disabled = disabled;
    if(createEnvelopesBtn) createEnvelopesBtn.disabled = disabled;
    if(shuffleBtn) shuffleBtn.disabled = disabled;
  }

  // ---------- ENVELOPE MODE functions ----------
  function createEnvelopes(n){
    if(!envelopeGrid) return;
    envelopeGrid.innerHTML = '';
    n = Math.max(1, Math.min(24, parseInt(n) || 8));
    for(let i=0;i<n;i++){
      const env = document.createElement('div'); env.className='envelope'; env.dataset.index = i;
      env.innerHTML = `<div class="face"><div class="lid"></div><div class="inner"></div></div><div class="couplet right seal">Lộc</div><div class="orn"></div>`;
      env.addEventListener('click', async function onClick(){
        if(spinning) return;
        if(env.classList.contains('opened')) return;
        env.classList.add('opened');
        if(sfxEnabled) playEnvelopeOpen();
        await new Promise(r=>setTimeout(r, 380));
        if(prizes.length === 0){
          showResult('Không có phần thưởng');
          return;
        }
        const idx = Math.floor(Math.random()*prizes.length);
        const prize = prizes[idx];
        const inner = env.querySelector('.inner');
        inner.textContent = prize;
        showResult(prize);
      });
      envelopeGrid.appendChild(env);
    }
  }
  if(createEnvelopesBtn) createEnvelopesBtn.addEventListener('click', ()=> createEnvelopes(Number(envelopeCountInput && envelopeCountInput.value || 8)));
  if(closeEnvelopesBtn) closeEnvelopesBtn.addEventListener('click', ()=>{ if(envelopeGrid) envelopeGrid.innerHTML=''; if(envelopeSection) envelopeSection.style.display='none'; if(wheelSection) wheelSection.style.display='flex'; if(actionArea) actionArea.style.display='flex'; mode = 'wheel'; if(modeToggle) modeToggle.textContent = 'Chuyển sang Bốc lì xì'; if(modeNote) modeNote.textContent = 'Kim ở dưới — đầu nhọn chỉ lên vào phần thưởng khi dừng'; });

  // Open all envelopes
  if(openAllBtn) openAllBtn.addEventListener('click', ()=>{
    if(spinning) { alert('Đang quay — không thể mở lúc này.'); return; }
    if(!envelopeGrid) { alert('Chưa có phong bao để mở.'); return; }
    const children = Array.from(envelopeGrid.children);
    if(children.length === 0) { alert('Chưa có phong bao để mở.'); return; }
    if(prizes.length === 0){ showResult('Không có phần thưởng'); return; }
    openAllBtn.disabled = true;
    let delayIndex = 0;
    for(const env of children){
      if(env.classList.contains('opened')) continue;
      setTimeout(()=>{
        env.classList.add('opened');
        if(sfxEnabled) playEnvelopeOpen();
        const idx = Math.floor(Math.random()*prizes.length);
        const prize = prizes[idx];
        const inner = env.querySelector('.inner');
        inner.textContent = prize;
      }, delayIndex * 140);
      delayIndex++;
    }
    setTimeout(()=>{ openAllBtn.disabled = false; }, (delayIndex * 140) + 300);
  });

  // toggle mode
  if(modeToggle) modeToggle.addEventListener('click', ()=>{
    if(mode === 'wheel'){
      mode = 'envelope';
      modeToggle.textContent = 'Chuyển sang Vòng quay';
      if(wheelSection) wheelSection.style.display = 'none';
      if(envelopeSection) envelopeSection.style.display = 'flex';
      if(actionArea) actionArea.style.display = 'none';
      if(modeNote) modeNote.textContent = 'Chọn 1 phong bao để bốc lì xì';
      createEnvelopes(Number(envelopeCountInput && envelopeCountInput.value || 8));
    } else {
      mode = 'wheel';
      modeToggle.textContent = 'Chuyển sang Bốc lì xì';
      if(wheelSection) wheelSection.style.display = 'flex';
      if(envelopeSection) envelopeSection.style.display = 'none';
      if(actionArea) actionArea.style.display = 'flex';
      if(modeNote) modeNote.textContent = 'Kim ở dưới — đầu nhọn chỉ lên vào phần thưởng khi dừng';
    }
  });

  // pointerFix toggles pointer position (under / over the wheel)
  let pointerAtTop = false;
  if(pointerFix){
    pointerFix.addEventListener('click', ()=>{
      pointerAtTop = !pointerAtTop;
      if(pointerEl){
        if(pointerAtTop){
          pointerEl.classList.add('top');
          pointerFix.textContent = 'Kim: Trên';
          modeNote.textContent = 'Kim ở trên — đầu nhọn chỉ xuống khi dừng';
        } else {
          pointerEl.classList.remove('top');
          pointerFix.textContent = 'Kim: Dưới';
          modeNote.textContent = 'Kim ở dưới — đầu nhọn chỉ lên vào phần thưởng khi dừng';
        }
      }
    });
  }

  if(pointerEl) pointerEl.addEventListener('click', ()=> { alert('Kim cố định — đầu nhọn chỉ vào phần thưởng khi dừng. Nhấn "Kim: Trên/Dưới" để đổi vị trí.'); });

  // ---------- SHUFFLE feature ----------
  function shufflePrizes(){
    if(spinning){ alert('Đang quay — không thể xáo lúc này.'); return; }
    if(prizes.length <= 1) { alert('Cần ít nhất 2 phần thưởng để xáo.'); return; }
    for(let i = prizes.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = prizes[i];
      prizes[i] = prizes[j];
      prizes[j] = tmp;
    }
    playShuffleSound();
    renderLists();
    renderWheel();
    if(mode === 'envelope'){
      const count = envelopeGrid && envelopeGrid.children.length || Number(envelopeCountInput && envelopeCountInput.value) || 8;
      createEnvelopes(count);
    }
  }
  if(shuffleBtn) shuffleBtn.addEventListener('click', shufflePrizes);

  // ---------- modal & confetti ----------
  function showResult(text){
    if(resultPrizeEl) resultPrizeEl.textContent = text;
    if(overlay) { overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false'); }
    launchConfetti();
    if(sfxEnabled) playWin();
  }
  if(closeOverlay) closeOverlay.addEventListener('click', ()=> { if(overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); } if(confettiRoot) confettiRoot.innerHTML=''; });

  function launchConfetti(){ if(!confettiRoot) return; confettiRoot.innerHTML=''; const palette=['#ffd740','#ff7043','#ff8a65','#ffd180','#f48fb1','#ff5252']; for(let i=0;i<110;i++){ const el=document.createElement('div'); el.className='piece'; el.style.left = Math.random()*100 + '%'; el.style.background = palette[Math.floor(Math.random()*palette.length)]; el.style.transform = `translateY(-20vh) rotate(${Math.random()*360}deg)`; el.style.animationDelay = (Math.random()*700) + 'ms'; el.style.width = (8 + Math.random()*14) + 'px'; el.style.height = (12 + Math.random()*18) + 'px'; confettiRoot.appendChild(el); } setTimeout(()=> confettiRoot.innerHTML='', 4200); }

  // ---------- INIT ----------
  const initial = ['Lì xì 20.000đ','Lì xì 50.000đ','Quà bí mật','Chúc mừng năm mới','Phiếu giảm giá','Thử thách vui'];
  for(const s of initial) prizes.push(s);
  renderLists(); renderWheel();
  window.addEventListener('load', ()=> { if(svg) svg.style.transform = 'rotate(0deg)'; });

  // accessibility
  if(spinBtn) spinBtn.addEventListener('keydown', e=> { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); if(mode==='wheel') spin(); } });
  document.addEventListener('visibilitychange', ()=> {
    if(document.hidden && audioCtx && audioCtx.state === 'running'){ audioCtx.suspend && audioCtx.suspend(); }
    else if(!document.hidden && musicPlaying && audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume && audioCtx.resume(); }
  });

  // debug helpers
  window._createEnvelopes = createEnvelopes;
  window._shufflePrizes = shufflePrizes;

})();
