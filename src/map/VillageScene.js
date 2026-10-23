import Phaser from 'phaser';
import { MAP_W, MAP_H, NPC_SPOTS, ITEMS, KAI_START } from '../data/mapData.js';

const CHIBI_H = 104; // display height of chibi sprites in map pixels
const SPEED = 0.32; // map px per ms

export default class VillageScene extends Phaser.Scene {
  constructor(opts) {
    super('village');
    this.opts = opts; // { base, kaiPos, markers:{npcId:'!'|'★'|null}, onNpc, onItem, onKaiMove }
  }

  preload() {
    const b = this.opts.base;
    this.load.image('map', `${b}assets/bg/map.webp`);
    for (const c of ['kai', 'mira', 'hana', 'tomo']) this.load.image(`${c}_chibi`, `${b}assets/chars/${c}_chibi.webp`);
  }

  // Phaser listens for pointerup/touchend on window, so a tap that started on a DOM
  // panel above the canvas would still "land" on map objects. Only accept taps that
  // both started and ended on the canvas, and ignore everything while input is locked.
  isCanvasTap(p) {
    const c = this.game.canvas;
    if (this.locked || this.dragMoved) return false;
    if (p.downElement !== c) return false;
    if (p.upElement && p.upElement !== c) return false;
    return true;
  }

  setLocked(v) {
    this.locked = !!v;
    if (this.input) this.input.enabled = !v;
  }

  create() {
    const map = this.add.image(0, 0, 'map').setOrigin(0).setDisplaySize(MAP_W, MAP_H);
    map.setInteractive();
    map.on('pointerup', (p) => {
      if (!this.isCanvasTap(p)) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.walkTo(wp.x, wp.y);
    });

    // item sparkles (tap targets are generous: 40 map px radius ~ 26+ css px)
    this.items = ITEMS.map((it) => {
      const g = this.add.container(it.x, it.y);
      const glow = this.add.circle(0, 0, 13, 0xfff3b0, 0.55);
      const dot = this.add.circle(0, 0, 6, 0xffffff, 0.95);
      g.add([glow, dot]);
      g.setDepth(5000);
      this.tweens.add({ targets: glow, scale: 1.7, alpha: 0.1, duration: 1300, repeat: -1, ease: 'Sine.easeOut', delay: Math.random() * 1000 });
      const hit = this.add.zone(it.x, it.y, 72, 72).setInteractive().setDepth(5001);
      hit.on('pointerup', (p, lx, ly, ev) => { ev?.stopPropagation(); if (!this.isCanvasTap(p)) return; this.opts.onItem?.(it); });
      return g;
    });

    // NPCs
    this.npcs = {};
    for (const [id, spot] of Object.entries(NPC_SPOTS)) {
      const s = this.add.image(spot.x, spot.y, `${id}_chibi`).setOrigin(0.5, 1);
      s.setScale(CHIBI_H / s.height).setFlipX(!!spot.flip).setDepth(spot.y);
      this.tweens.add({ targets: s, y: spot.y - 3, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const shadow = this.add.ellipse(spot.x, spot.y - 2, 46, 12, 0x000000, 0.25).setDepth(spot.y - 1);
      const hit = this.add.zone(spot.x, spot.y - CHIBI_H / 2, 90, CHIBI_H + 20).setInteractive().setDepth(9000);
      hit.on('pointerup', (p, lx, ly, ev) => {
        ev?.stopPropagation();
        if (!this.isCanvasTap(p)) return;
        const side = this.kai.x < spot.x ? -1 : 1;
        this.walkTo(spot.x + side * 62, spot.y + 4, () => {
          this.kai.setFlipX(side > 0); // face the NPC
          this.opts.onNpc?.(id);
        });
      });
      const marker = this.add.text(spot.x, spot.y - CHIBI_H - 18, '', {
        fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#3a2a10',
        backgroundColor: '#ffd75e', padding: { x: 8, y: 2 },
      }).setOrigin(0.5).setDepth(9500);
      this.tweens.add({ targets: marker, y: marker.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.npcs[id] = { sprite: s, shadow, marker, hit };
    }
    this.setMarkers(this.opts.markers || {});
    if (this.locked) this.input.enabled = false;

    // Kai
    const k = this.opts.kaiPos || KAI_START;
    this.kaiShadow = this.add.ellipse(k.x, k.y - 2, 46, 12, 0x000000, 0.25);
    this.kai = this.add.image(k.x, k.y, 'kai_chibi').setOrigin(0.5, 1);
    this.kai.setScale(CHIBI_H / this.kai.height);
    this.syncKaiDepth();

    // tap ripple
    this.ripple = this.add.circle(0, 0, 14, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(4999).setVisible(false);

    // camera: cover viewport, allow drag-pan on the overflowing axis
    this.dragMoved = false;
    this.input.on('pointerdown', (p) => {
      if (p.downElement !== this.game.canvas) { this.dragStart = null; return; } this.dragStart = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY }; this.dragMoved = false; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !this.dragStart || this.locked) return;
      const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 10) this.dragMoved = true;
      if (this.dragMoved) {
        const cam = this.cameras.main;
        cam.scrollX = this.dragStart.sx - dx / cam.zoom;
        cam.scrollY = this.dragStart.sy - dy / cam.zoom;
        this.clampCam();
      }
    });
    this.scale.on('resize', () => this.fitCamera());
    this.fitCamera();
    this.events.emit('ready');
  }

  fitCamera() {
    const cam = this.cameras.main;
    const w = this.scale.width, h = this.scale.height;
    cam.setSize(w, h);
    const zoom = Math.max(w / MAP_W, h / MAP_H);
    cam.setZoom(zoom);
    // keep Kai roughly centered horizontally when map overflows
    cam.centerOn(this.kai ? Phaser.Math.Clamp(this.kai.x, 0, MAP_W) : MAP_W / 2, MAP_H / 2);
    this.clampCam();
  }

  clampCam() {
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom, vh = cam.height / cam.zoom;
    // with origin 0.5 Phaser's scroll is offset; use worldView math
    const minX = (vw - cam.width) / 2, minY = (vh - cam.height) / 2;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, minX, minX + Math.max(0, MAP_W - vw));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, minY, minY + Math.max(0, MAP_H - vh));
  }

  syncKaiDepth() {
    this.kai.setDepth(this.kai.y);
    this.kaiShadow.setPosition(this.kai.x, this.kai.y - 2).setDepth(this.kai.y - 1);
  }

  walkTo(x, y, done) {
    x = Phaser.Math.Clamp(x, 40, MAP_W - 40);
    y = Phaser.Math.Clamp(y, 200, MAP_H - 30);
    this.ripple.setPosition(x, y).setVisible(true).setScale(0.6).setAlpha(1);
    this.tweens.add({ targets: this.ripple, scale: 1.6, alpha: 0, duration: 450, onComplete: () => this.ripple.setVisible(false) });
    if (this.walkTween) this.walkTween.stop();
    if (this.bobTween) { this.bobTween.stop(); this.kai.setAngle(0); }
    const dist = Phaser.Math.Distance.Between(this.kai.x, this.kai.y, x, y);
    // chibi art faces down-right: mirror when walking left
    if (Math.abs(x - this.kai.x) > 4) this.kai.setFlipX(x < this.kai.x);
    this.bobTween = this.tweens.add({ targets: this.kai, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: -1 });
    this.walkTween = this.tweens.add({
      targets: this.kai, x, y, duration: Math.max(120, dist / SPEED),
      onUpdate: () => this.syncKaiDepth(),
      onComplete: () => {
        this.bobTween?.stop(); this.kai.setAngle(0); this.syncKaiDepth();
        this.opts.onKaiMove?.({ x: Math.round(this.kai.x), y: Math.round(this.kai.y) });
        done?.();
      },
    });
  }

  setMarkers(markers) {
    for (const [id, n] of Object.entries(this.npcs || {})) {
      const m = markers[id];
      n.marker.setText(m || '').setVisible(!!m);
    }
  }

  // for automated tests: screen position of an NPC / item
  screenPos(x, y) {
    const cam = this.cameras.main;
    return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
  }
}
