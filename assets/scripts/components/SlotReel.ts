import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, CCInteger, CCFloat, UITransform, UIOpacity, easing } from 'cc';
import { SpriteManager } from '.././SpriteManager';
import { Symbol } from './Symbol';
const { ccclass, property } = _decorator;

@ccclass('SlotReel')
export class SlotReel extends Component {
  @property({ type: SpriteManager }) public spMgr: SpriteManager = null;
  @property({ type: CCFloat }) public spinDuration = 2.0;
  @property({ type: [Node] }) public symbolNodes: Node[] = [];
  @property({ type: CCFloat }) private symbolHeight: number = 100;
  @property({ type: CCFloat }) private spinSpeed: number = 1000;
  @property({ type: CCFloat }) private accelerationTime: number = 0.3;
  @property({ type: CCFloat }) private decelerationTime: number = 0.3;
  @property({ type: CCFloat }) public offsetY: number = 0;

  private isSpinning: boolean = false;
  private currentSpeed: number = 0;
  private targetSpeed: number = 0;
  private spinDirection: number = -1;
  private spinElapsed: number = 0;
  private spinPhase: 'idle' | 'accel' | 'steady' | 'decel' = 'idle';
  private reelOffset: number = 0; // float, 0~symbolNodes.length
  private symbolIndices: number[] = []; // 畫面上每格要顯示的 symbol index
  private resultIndices: number[] = [];

  start() {
    // 初始化 symbolIndices 為隨機
    if (this.spMgr && this.spMgr.symbols.length > 0) {
      this.symbolIndices = [];
      for (let i = 0; i < this.symbolNodes.length; i++) {
        this.symbolIndices.push(Math.floor(Math.random() * this.spMgr.symbols.length));
      }
      this.updateSymbolNodes();
    }
  }

  public spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.currentSpeed = 0;
    this.targetSpeed = this.spinSpeed;
    this.spinElapsed = 0;
    this.spinPhase = 'accel';
    this.reelOffset = 0;
    this.schedule(this.updateSpin, 0);
  }

  public setResult(resultIndices: number[]) {
    this.resultIndices = resultIndices.slice();
  }

  private updateSpin = (dt: number) => {
    if (!this.isSpinning) return;
    this.spinElapsed += dt;
    // 狀態機
    if (this.spinPhase === 'accel') {
      const t = Math.min(this.spinElapsed / this.accelerationTime, 1);
      this.currentSpeed = this.targetSpeed * easing.quadOut(t);
      if (t >= 1) {
        this.spinPhase = 'steady';
        this.spinElapsed = 0;
      }
    } else if (this.spinPhase === 'steady') {
      this.currentSpeed = this.targetSpeed;
      if (this.spinElapsed >= this.spinDuration - this.accelerationTime - this.decelerationTime) {
        this.spinPhase = 'decel';
        this.spinElapsed = 0;
      }
    } else if (this.spinPhase === 'decel') {
      const t = Math.min(this.spinElapsed / this.decelerationTime, 1);
      this.currentSpeed = this.targetSpeed * (1 - easing.quadOut(t));
      if (t >= 1) {
        this.isSpinning = false;
        this.unschedule(this.updateSpin);
        this.spinPhase = 'idle';
        // 停止時直接對齊結果
        if (this.resultIndices.length > 0) {
          // 假設 symbolNodes.length = visibleCount + 2 (上下各一格隱藏格)
          const visibleCount = this.resultIndices.length;
          const totalCount = this.symbolNodes.length;
          this.symbolIndices = [
            this.resultIndices[0],
            ...this.resultIndices,
            this.resultIndices[visibleCount - 1]
          ];
        }
        this.reelOffset = 0;
        this.updateSymbolNodes();
        return;
      }
    }
    // 滾動 reelOffset
    this.reelOffset += (this.currentSpeed * dt) / this.symbolHeight;
    while (this.reelOffset >= 1) {
      this.reelOffset -= 1;
      // 環狀下移一格，最下方補隨機
      this.symbolIndices.pop();
      this.symbolIndices.unshift(Math.floor(Math.random() * this.spMgr.symbols.length));
    }
    this.updateSymbolNodes();
  }

  private updateSymbolNodes() {
    // 讓 slot reel 的中心（可見格）對齊 y=0
    const n = this.symbolNodes.length;
    const centerIdx = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const node = this.symbolNodes[i];
      // 讓中心格對齊 y=0，其他格依序排列
      const y = (centerIdx - i - this.reelOffset) * this.symbolHeight + this.offsetY;
      node.setPosition(0, y, 0);
      const symbol = node.getComponent(Symbol);
      const idx = this.symbolIndices[i] % this.spMgr.symbols.length;
      if (symbol && this.spMgr && this.spMgr.symbols.length > 0) {
        symbol.setSymbol(this.spMgr.symbols[idx]);
      }
    }
  }

  onDestroy() {
    // this.spinTween && this.spinTween.stop();
    this.unschedule(this.updateSpin);
  }
}