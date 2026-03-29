import type { GameProject, Entity, ComponentData } from '@/types';

function getTransform(entity: Entity) {
  const t = entity.components.find(c => c.type === 'transform') as
    | Extract<ComponentData, { type: 'transform' }> | undefined;
  return t?.data || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
}

function getSprite(entity: Entity) {
  return (entity.components.find(c => c.type === 'sprite') as
    | Extract<ComponentData, { type: 'sprite' }> | undefined)?.data;
}

function getText(entity: Entity) {
  return (entity.components.find(c => c.type === 'text') as
    | Extract<ComponentData, { type: 'text' }> | undefined)?.data;
}

function getRigidbody(entity: Entity) {
  return (entity.components.find(c => c.type === 'rigidbody') as
    | Extract<ComponentData, { type: 'rigidbody' }> | undefined)?.data;
}

export function exportToHTML(project: GameProject): string {
  const scene = project.scenes.find(s => s.id === project.activeSceneId) || project.scenes[0];
  const { width, height } = project.settings;

  const entitiesData = scene.rootEntities
    .map(id => scene.entities[id])
    .filter(Boolean)
    .filter(e => e.visible)
    .map(entity => {
      const t = getTransform(entity);
      const s = getSprite(entity);
      const tx = getText(entity);
      const rb = getRigidbody(entity);
      return {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        x: t.x,
        y: t.y,
        rotation: t.rotation,
        scaleX: t.scaleX,
        scaleY: t.scaleY,
        width: s?.width || 40,
        height: s?.height || 40,
        color: s?.color || '#7c5cfc',
        shape: s?.shape || 'rectangle',
        text: tx?.content,
        fontSize: tx?.fontSize,
        textColor: tx?.color,
        fontFamily: tx?.fontFamily,
        behaviors: entity.behaviors.filter(b => b.enabled),
        rigidbody: rb || null,
      };
    });

  const gameData = JSON.stringify({
    entities: entitiesData,
    gravity: scene.gravity || 0,
    backgroundColor: scene.backgroundColor,
    width,
    height,
    globalVariables: project.globalVariables || [],
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; font-family: Arial, sans-serif; }
    canvas { border: 1px solid #333; }
    #overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; background: rgba(0,0,0,0.7); z-index: 10; }
    #overlay.show { display: flex; }
    #overlay h1 { font-size: 36px; font-weight: bold; margin-bottom: 16px; }
    #overlay p { color: #999; font-size: 14px; }
    #overlay button { margin-top: 20px; padding: 10px 30px; font-size: 16px; background: #7c5cfc; color: white; border: none; border-radius: 8px; cursor: pointer; }
    #overlay button:hover { background: #6a4ce0; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <div id="overlay">
    <h1 id="overlay-msg"></h1>
    <p id="overlay-hint"></p>
    <button id="restart-btn">重新开始</button>
  </div>

  <script type="module">
    import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';

    const GAME_DATA = ${gameData};
    const W = GAME_DATA.width;
    const H = GAME_DATA.height;

    const app = new PIXI.Application();
    await app.init({
      canvas: document.getElementById('game'),
      width: W, height: H,
      background: GAME_DATA.backgroundColor,
      antialias: true,
    });

    // State
    const keys = new Set();
    const mouse = { x: W/2, y: H/2, pressed: false, justPressed: false };
    let gameState = { score: 0, health: 3, time: 0, isWin: false, isLose: false };
    let elapsed = 0;
    let overlayMsg = null;
    const variables = new Map();
    const entities = [];
    const gfxMap = new Map();
    let spawnQueue = [];
    let removeQueue = [];

    // Input
    window.addEventListener('keydown', e => keys.add(e.key));
    window.addEventListener('keyup', e => keys.delete(e.key));
    app.canvas.addEventListener('mousemove', e => {
      const r = app.canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    app.canvas.addEventListener('mousedown', () => { mouse.pressed = true; mouse.justPressed = true; });
    app.canvas.addEventListener('mouseup', () => { mouse.pressed = false; });

    // Variables
    for (const v of GAME_DATA.globalVariables) {
      variables.set(v.name, v.value);
    }
    variables.set('score', 0);
    variables.set('health', 3);

    function hexToNum(hex) {
      return parseInt(hex.replace('#', ''), 16);
    }

    function createEntity(data) {
      return {
        ...data,
        alive: true,
        visible: true,
        vx: data.vx || 0,
        vy: data.vy || 0,
        onGround: false,
        patrolOriginX: data.x,
        patrolOriginY: data.y,
        patrolDir: 1,
        bouncePhase: Math.random() * Math.PI * 2,
        originalY: data.y,
        originalX: data.x,
        cooldowns: {},
        timers: {},
        spawnCount: 0,
        spawnTimer: 0,
        destroyTimer: 0,
        tweenPhase: 0,
        dialogueIndex: 0,
        dialogueTimer: 0,
        isHovered: false,
        isClicked: false,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        flashTimer: 0,
        lifetime: 0,
      };
    }

    function drawShape(g, shape, w, h, color) {
      const c = hexToNum(color);
      if (shape === 'circle') {
        g.circle(0, 0, Math.min(w,h)/2).fill({color: c});
      } else if (shape === 'triangle') {
        g.poly([0,-h/2,w/2,h/2,-w/2,h/2]).fill({color: c});
      } else {
        g.roundRect(-w/2,-h/2,w,h,3).fill({color: c});
      }
    }

    function createGraphic(e) {
      const container = new PIXI.Container();
      container.position.set(e.x, e.y);
      container.rotation = (e.rotation * Math.PI) / 180;
      container.scale.set(e.scaleX, e.scaleY);

      if (e.color && e.color !== '#00000000') {
        const g = new PIXI.Graphics();
        drawShape(g, e.shape, e.width, e.height, e.color);
        container.addChild(g);
      }

      if (e.text !== undefined && e.text !== null) {
        const t = new PIXI.Text({
          text: e.text,
          style: new PIXI.TextStyle({ fontSize: e.fontSize || 20, fill: e.textColor || '#ffffff', fontFamily: e.fontFamily || 'Arial' }),
        });
        t.anchor.set(0.5);
        container.addChild(t);
      }

      return container;
    }

    function checkAABB(a, b) {
      return a.x - a.width/2 < b.x + b.width/2 &&
             a.x + a.width/2 > b.x - b.width/2 &&
             a.y - a.height/2 < b.y + b.height/2 &&
             a.y + a.height/2 > b.y - b.height/2;
    }

    function getCooldown(e, key) { return (e.cooldowns[key] || 0) > 0; }
    function setCooldown(e, key, t) { e.cooldowns[key] = t; }

    function isPointIn(px, py, ex, ey, ew, eh) {
      return px >= ex-ew/2 && px <= ex+ew/2 && py >= ey-eh/2 && py <= ey+eh/2;
    }

    // Init
    function initGame() {
      entities.length = 0;
      gfxMap.clear();
      while (app.stage.children.length) {
        app.stage.children[0].destroy({children:true});
        app.stage.removeChildAt(0);
      }

      gameState = { score: 0, health: 3, time: 0, isWin: false, isLose: false };
      elapsed = 0;
      overlayMsg = null;
      variables.set('score', 0);
      variables.set('health', 3);

      const bg = new PIXI.Graphics();
      bg.rect(0, 0, W, H).fill({color: hexToNum(GAME_DATA.backgroundColor)});
      app.stage.addChild(bg);

      for (const data of GAME_DATA.entities) {
        const e = createEntity(data);
        entities.push(e);
        const gfx = createGraphic(e);
        app.stage.addChild(gfx);
        gfxMap.set(e.id, gfx);
      }

      document.getElementById('overlay').classList.remove('show');
    }

    function findPlayer() { return entities.find(e => e.type === 'player' && e.alive); }

    function tick(dt) {
      if (overlayMsg) return;
      elapsed += dt;
      spawnQueue = [];
      removeQueue = [];

      const player = findPlayer();

      for (const e of entities) {
        if (!e.alive) continue;
        for (const [k,v] of Object.entries(e.cooldowns)) {
          if (v > 0) e.cooldowns[k] = v - dt;
        }
        if (e.flashTimer > 0) e.flashTimer -= dt;
      }

      for (const e of entities) {
        if (!e.alive || !e.visible) continue;
        for (const b of e.behaviors) {
          switch(b.type) {
            case 'keyboard-move': {
              const s = b.params.speed || 3;
              if (keys.has('ArrowLeft')||keys.has('a')) e.x -= s;
              if (keys.has('ArrowRight')||keys.has('d')) e.x += s;
              if (keys.has('ArrowUp')||keys.has('w')) e.y -= s;
              if (keys.has('ArrowDown')||keys.has('s')) e.y += s;
              break;
            }
            case 'patrol': {
              const s = b.params.speed || 1.5;
              const d = b.params.distance || 120;
              if (b.params.axis === 'vertical') {
                e.y += s * e.patrolDir;
                if (Math.abs(e.y - e.patrolOriginY) > d) e.patrolDir *= -1;
              } else {
                e.x += s * e.patrolDir;
                if (Math.abs(e.x - e.patrolOriginX) > d) e.patrolDir *= -1;
              }
              break;
            }
            case 'chase': {
              if (!player) break;
              const s = b.params.speed || 1.2;
              const r = b.params.range || 200;
              const dx = player.x - e.x, dy = player.y - e.y;
              const dist = Math.sqrt(dx*dx+dy*dy);
              if (dist < r && dist > 1) { e.x += (dx/dist)*s; e.y += (dy/dist)*s; }
              break;
            }
            case 'rotate': e.rotation += (b.params.speed || 60) * dt; break;
            case 'bounce':
              e.bouncePhase += dt * 3;
              e.y = e.originalY + Math.sin(e.bouncePhase) * (b.params.force||2) * 3;
              break;
            case 'collectible': {
              if (!player || !checkAABB(player, e)) break;
              gameState.score += (b.params.points||0);
              variables.set('score', gameState.score);
              if (b.params.destroyOnCollect) { e.alive = false; removeQueue.push(e.id); }
              break;
            }
            case 'obstacle': {
              if (!player || !checkAABB(player, e)) break;
              if (getCooldown(e,'obs')) break;
              gameState.health -= (b.params.damage||1);
              variables.set('health', gameState.health);
              setCooldown(e,'obs',0.5);
              if (b.params.destroyPlayer || gameState.health <= 0) {
                gameState.isLose = true; overlayMsg = '游戏结束';
              }
              const dx = player.x-e.x, dy = player.y-e.y;
              const d = Math.sqrt(dx*dx+dy*dy)||1;
              player.x += (dx/d)*20; player.y += (dy/d)*20;
              break;
            }
            case 'win-zone':
              if (player && checkAABB(player, e)) { gameState.isWin = true; overlayMsg = b.params.message || '恭喜通关！'; }
              break;
            case 'lose-zone':
              if (player && checkAABB(player, e)) { gameState.isLose = true; overlayMsg = b.params.message || '游戏结束'; }
              break;
            case 'platform': {
              if (!player || !checkAABB(player, e)) break;
              const ox = Math.min(player.x+player.width/2-(e.x-e.width/2),(e.x+e.width/2)-(player.x-player.width/2));
              const oy = Math.min(player.y+player.height/2-(e.y-e.height/2),(e.y+e.height/2)-(player.y-player.height/2));
              if (ox<=0||oy<=0) break;
              if (ox < oy) { player.x += player.x<e.x?-ox:ox; }
              else { player.y += player.y<e.y?-oy:oy; player.vy = 0; }
              break;
            }
            case 'score-display': e.text = (b.params.prefix||'得分: ')+gameState.score; break;
            case 'health-display': {
              const max = b.params.maxHealth||3;
              const hp = Math.max(0, gameState.health);
              e.text = b.params.showHearts ? 'HP: '+'❤'.repeat(hp)+'♡'.repeat(Math.max(0,max-hp)) : 'HP: '+hp+'/'+max;
              break;
            }
            case 'timer-display': {
              const total = b.params.seconds||60;
              if (b.params.countDown) {
                const rem = Math.max(0, total-elapsed);
                e.text = '时间: '+Math.ceil(rem);
                if (rem<=0 && b.params.loseOnZero) { gameState.isLose = true; overlayMsg = '时间到！'; }
              } else { e.text = '时间: '+Math.floor(elapsed); }
              break;
            }
            case 'click-action': {
              if (isPointIn(mouse.x, mouse.y, e.x, e.y, e.width, e.height) && mouse.justPressed) {
                if (b.params.action==='destroy') removeQueue.push(e.id);
                else if (b.params.action==='score') { gameState.score++; variables.set('score',gameState.score); }
              }
              break;
            }
            case 'clickable':
            case 'button': {
              e.isHovered = isPointIn(mouse.x, mouse.y, e.x, e.y, e.width, e.height);
              break;
            }
            case 'hoverable': {
              const over = isPointIn(mouse.x, mouse.y, e.x, e.y, e.width, e.height);
              e.scaleX = over ? (b.params.scaleOnHover||1.15) : 1;
              e.scaleY = e.scaleX;
              break;
            }
            case 'draggable': {
              const over = isPointIn(mouse.x, mouse.y, e.x, e.y, e.width, e.height);
              if (over && mouse.justPressed) { e.isDragging=true; e.dragOffsetX=mouse.x-e.x; e.dragOffsetY=mouse.y-e.y; }
              if (e.isDragging) {
                if (!mouse.pressed) { e.isDragging=false; }
                else { e.x=mouse.x-e.dragOffsetX; e.y=mouse.y-e.dragOffsetY; }
              }
              break;
            }
            case 'tween': {
              const dur = b.params.duration||1;
              const yoyo = b.params.yoyo;
              const from = b.params.from||0;
              const to = b.params.to||0;
              e.tweenPhase += dt/dur;
              let t = e.tweenPhase%1;
              if (yoyo) { const c = Math.floor(e.tweenPhase)%2; t = c===1?1-t:t; }
              const eased = (1-Math.cos(t*Math.PI))/2;
              const v = from+(to-from)*eased;
              const prop = b.params.property||'y';
              if (prop==='x') e.x=e.originalX+v;
              else if (prop==='y') e.y=e.originalY+v;
              else if (prop==='rotation') e.rotation=v;
              break;
            }
            case 'dialogue-box': {
              const dialogues = (b.params.dialogues||'').split('|');
              const speed = b.params.speed||30;
              if (e.dialogueIndex < dialogues.length) {
                const cur = dialogues[e.dialogueIndex];
                e.dialogueTimer += dt;
                const chars = Math.min(cur.length, Math.floor(e.dialogueTimer*speed));
                e.text = cur.substring(0,chars);
                if (chars>=cur.length && (mouse.justPressed||keys.has('Enter')||keys.has(' '))) {
                  e.dialogueIndex++; e.dialogueTimer=0;
                }
              }
              break;
            }
            case 'spawn-on-interval': {
              const interval = b.params.interval||2;
              const limit = b.params.limit||10;
              e.spawnTimer += dt;
              if (e.spawnTimer >= interval && e.spawnCount < limit) {
                spawnQueue.push({type: b.params.entityType||'enemy', x: e.x, y: e.y});
                e.spawnTimer=0; e.spawnCount++;
              }
              break;
            }
            case 'destroy-self': {
              e.destroyTimer += dt;
              if (b.params.fadeOut) { e.scaleX=Math.max(0,1-e.destroyTimer/(b.params.delay||3)); e.scaleY=e.scaleX; }
              if (e.destroyTimer >= (b.params.delay||3)) removeQueue.push(e.id);
              break;
            }
            case 'follow-mouse': {
              const s = b.params.speed||5;
              if (b.params.smooth) { e.x+=(mouse.x-e.x)*s*dt; e.y+=(mouse.y-e.y)*s*dt; }
              else { e.x=mouse.x; e.y=mouse.y; }
              break;
            }
            case 'shooter': {
              if (getCooldown(e,'shoot')) break;
              const shouldFire = b.params.autoFire||mouse.pressed||keys.has('f')||keys.has('j');
              if (!shouldFire) break;
              let angle = b.params.aimAtMouse ? Math.atan2(mouse.y-e.y,mouse.x-e.x) : 0;
              const bs = b.params.bulletSpeed||8;
              spawnQueue.push({type:'bullet',x:e.x+Math.cos(angle)*25,y:e.y+Math.sin(angle)*25,vx:Math.cos(angle)*bs,vy:Math.sin(angle)*bs});
              setCooldown(e,'shoot',b.params.fireRate||0.3);
              break;
            }
            case 'projectile': {
              const s = b.params.speed||5;
              if (e.vx===0&&e.vy===0) { const r=(b.params.direction||0)*Math.PI/180; e.vx=Math.cos(r)*s; e.vy=Math.sin(r)*s; }
              e.x+=e.vx; e.y+=e.vy; e.lifetime+=dt;
              if (e.lifetime>(b.params.lifetime||3)||e.x<-50||e.x>W+50||e.y<-50||e.y>H+50) removeQueue.push(e.id);
              break;
            }
            case 'damage-on-contact': {
              if (getCooldown(e,'dmg')) break;
              for (const o of entities) {
                if (o===e||!o.alive||o.type===e.type) continue;
                if (!checkAABB(e,o)) continue;
                if (o.type==='player') { gameState.health-=(b.params.damage||1); variables.set('health',gameState.health); if(gameState.health<=0){gameState.isLose=true;overlayMsg='游戏结束';} }
                if (b.params.destroySelf) removeQueue.push(e.id);
                setCooldown(e,'dmg',b.params.cooldown||0.5);
                break;
              }
              break;
            }
            case 'timer': {
              const dur = b.params.duration||2;
              const key = 'timer-'+b.type;
              if (!e.timers[key]) e.timers[key]={elapsed:0,fired:false};
              const tm = e.timers[key];
              tm.elapsed += dt;
              if (tm.elapsed>=dur && !tm.fired) {
                if (b.params.repeat) { tm.elapsed=0; gameState.score++; variables.set('score',gameState.score); }
                else tm.fired=true;
              }
              break;
            }
            case 'progress-bar': {
              const varName = b.params.variable||'health';
              const maxVal = b.params.maxValue||3;
              const cur = variables.get(varName)||0;
              const pct = Math.max(0,Math.min(1,cur/maxVal));
              e.text = '█'.repeat(Math.round(pct*10))+'░'.repeat(10-Math.round(pct*10));
              break;
            }
          }
        }
      }

      // Spawns
      for (const s of spawnQueue) {
        const ne = createEntity({id:'s-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),type:s.type,name:s.type,x:s.x,y:s.y,rotation:0,scaleX:1,scaleY:1,width:s.type==='bullet'?6:36,height:s.type==='bullet'?6:36,color:s.type==='bullet'?'#ffff00':'#ef5350',shape:'circle',behaviors:s.type==='bullet'?[{type:'destroy-self',enabled:true,params:{delay:3,fadeOut:false}},{type:'damage-on-contact',enabled:true,params:{damage:1,cooldown:0,knockback:5,destroySelf:true}}]:[{type:'chase',enabled:true,params:{speed:1.2,range:300}},{type:'obstacle',enabled:true,params:{damage:1,destroyPlayer:false}}],rigidbody:null,vx:s.vx||0,vy:s.vy||0});
        entities.push(ne);
        const gfx = createGraphic(ne);
        app.stage.addChild(gfx);
        gfxMap.set(ne.id, gfx);
      }

      // Removes
      for (const id of removeQueue) { const e = entities.find(x=>x.id===id); if(e) e.alive=false; }

      // Update graphics
      for (const e of entities) {
        const gfx = gfxMap.get(e.id);
        if (!gfx) continue;
        if (!e.alive) { gfx.visible=false; continue; }
        gfx.visible=e.visible;
        gfx.position.set(e.x, e.y);
        gfx.rotation=(e.rotation*Math.PI)/180;
        gfx.scale.set(e.scaleX, e.scaleY);
        gfx.alpha = e.flashTimer>0?(Math.sin(e.flashTimer*30)>0?0.3:1):1;
        for (const ch of gfx.children) {
          if (ch instanceof PIXI.Text && e.text!==undefined) ch.text=e.text;
        }
      }

      mouse.justPressed = false;

      // Overlay
      if (overlayMsg) showOverlay(overlayMsg, gameState.isWin);
    }

    function showOverlay(msg, isWin) {
      const el = document.getElementById('overlay');
      el.classList.add('show');
      document.getElementById('overlay-msg').textContent = msg;
      document.getElementById('overlay-msg').style.color = isWin ? '#4caf50' : '#f44336';
      document.getElementById('overlay-hint').textContent = '最终得分: ' + gameState.score;
    }

    document.getElementById('restart-btn').addEventListener('click', initGame);

    initGame();
    app.ticker.add(ticker => tick(ticker.deltaTime / 60));

    console.log('${project.name} — 由游戏编辑器导出');
  </script>
</body>
</html>`;
}
