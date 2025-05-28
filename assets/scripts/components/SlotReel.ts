import { _decorator, Component, Node, Sprite, SpriteFrame, CCFloat, easing } from 'cc';
import { SpriteManager } from '.././SpriteManager';
import { Symbol } from './Symbol';
import GameConfig from '../config/GameConfig';
import { SpinPhase } from './SpinPhase';
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

  // 狀態與資料
  private isSpinning = false;
  private currentSpeed = 0;
  private targetSpeed = 0;
  private spinElapsed = 0;
  private spinPhase: SpinPhase = SpinPhase.Idle;
  private reelOffset = 0; // float, 0~symbolNodes.length
  private symbolIndices: number[] = []; // 畫面上每格要顯示的 symbol index
  private resultIndices: number[] = [];
  private reelDataCursor: number = 0; // 追蹤 slotData 補格位置
  private spinStartTime: number = 0; // spin 開始時間
  private spinCount: number = 0; // 記錄目前第幾次 spin
  private reelIndex: number = 0; // 儲存自己的 reelIndex

  start() {
    // 解析並儲存 reelIndex
    this.reelIndex = this.node.name.match(/\d+/) ? parseInt(this.node.name.match(/\d+/)[0]) : 0;
    // 直接從 GameConfig 取得 slotData，依據資料顯示 symbol
    const slotData = GameConfig.slotData;
    const indices = slotData[this.reelIndex % slotData.length];
    this.symbolIndices = indices.slice(0, this.symbolNodes.length);
    // 設定補格起始位置
    this.reelDataCursor = this.symbolIndices.length % indices.length;
    this.updateSymbolNodes();
  }

  public spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.currentSpeed = 0;
    this.targetSpeed = this.spinSpeed;
    this.spinElapsed = 0;
    this.spinPhase = SpinPhase.Accel;
    this.reelOffset = 0;
    this.spinStartTime = Date.now();
    this.schedule(this.updateSpin, 0);
    this.spinCount++;
  }

  public setResult(resultIndices: number[]) {
    this.resultIndices = [];
    // 不再於 setResult 設定 targetIndex，統一由 spin 控制
    const slotData = GameConfig.slotData;
    const indices = slotData[this.reelIndex % slotData.length];
    this.reelDataCursor = this.symbolIndices.length % indices.length;
  }

  private updateSpin = (dt: number) => {
    if (!this.isSpinning) return;
    this.spinElapsed += dt;
    // 狀態機
    if (this.spinPhase === SpinPhase.Accel) {
      const t = Math.min(this.spinElapsed / this.accelerationTime, 1);
      this.currentSpeed = this.targetSpeed * easing.quadOut(t);
      if (t >= 1) {
        this.spinPhase = SpinPhase.Steady;
        this.spinElapsed = 0;
      }
    } else if (this.spinPhase === SpinPhase.Steady) {
      this.currentSpeed = this.targetSpeed;
      if (this.spinElapsed >= this.spinDuration - this.accelerationTime - this.decelerationTime) {
        this.spinPhase = SpinPhase.Decel;
        this.spinElapsed = 0;
      }
    } else if (this.spinPhase === SpinPhase.Decel) {
      const t = Math.min(this.spinElapsed / this.decelerationTime, 1);
      this.currentSpeed = this.targetSpeed * (1 - easing.quadOut(t));
      if (t >= 1) {
        this.isSpinning = false;
        this.unschedule(this.updateSpin);
        this.spinPhase = SpinPhase.Idle;
        // 停止時直接對齊結果
        if (this.resultIndices.length > 0) {
          // 假設 symbolNodes.length = visibleCount + 2 (上下各一格隱藏格)
          const visibleCount = this.resultIndices.length;
          this.symbolIndices = [
            this.resultIndices[0],
            ...this.resultIndices,
            this.resultIndices[visibleCount - 1]
          ];
          // spin 結束時重設 reelDataCursor
          const slotData = GameConfig.slotData;
          const indices = slotData[this.reelIndex % slotData.length];
          this.reelDataCursor = (visibleCount + 2) % indices.length;
        }
        this.reelOffset = 0;
        this.updateSymbolNodes();
        // log spin 總時間
        if (this.spinStartTime) {
          const total = (Date.now() - this.spinStartTime) / 1000;
          // console.log(`[SlotReel] ${this.node.name} spin total time: ${total.toFixed(3)}s`);
          this.spinStartTime = 0;
        }
        return;
      }
    }
    // 滾動 reelOffset
    this.reelOffset += (this.currentSpeed * dt) / this.symbolHeight;
    while (this.reelOffset >= 1) {
      this.reelOffset -= 1;
      this.symbolIndices.pop();
      // 取得本reel的slotData
      const slotData = GameConfig.slotData;
      const indices = slotData[this.reelIndex % slotData.length];
      // 用 reelDataCursor 依序補格
      this.symbolIndices.unshift(indices[this.reelDataCursor]);
      this.reelDataCursor = (this.reelDataCursor + 1) % indices.length;
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
    this.unschedule(this.updateSpin);
  }
}