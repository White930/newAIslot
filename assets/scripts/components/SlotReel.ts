import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, CCInteger, CCFloat, UITransform, easing } from 'cc';
import { SpriteManager } from '.././SpriteManager';
import { Symbol } from './Symbol';
const { ccclass, property } = _decorator;

@ccclass('SlotReel')
export class SlotReel extends Component {
  @property({ type: SpriteManager }) public spMgr: SpriteManager = null;
  @property({ type: CCFloat }) public spinDuration = 2.0;
  @property({ type: [Node] }) public symbolNodes: Node[] = [];
  @property({ type: CCFloat }) private symbolHeight: number = 100;
  @property({ type: CCFloat }) private spinSpeed: number = 1000; // 最大速度
  @property({ type: CCFloat }) private accelerationTime: number = 0.3; // 加速時間
  @property({ type: CCFloat }) private decelerationTime: number = 0.3; // 減速時間
  @property({ type: CCFloat }) public offsetY: number = 0;

  private isSpinning: boolean = false;
  // private spinTween: any = null; // 移除 spinTween
  private currentSpeed: number = 0;
  private targetSpeed: number = 0;
  private spinDirection: number = -1; // -1 表示向下

  private spinElapsed: number = 0;
  private spinPhase: 'idle' | 'accel' | 'steady' | 'decel' | 'rebound' = 'idle';
  private baseY: number = 0;
  private initPositions: number[] = []; // 新增：紀錄每個 symbolNode 的初始 y 位置

  start() {
    // 記錄每個 symbolNode 的初始 y 位置
    this.initPositions = this.symbolNodes.map(node => node.position.y);
  }

  public spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.currentSpeed = 0;
    this.targetSpeed = this.spinSpeed;
    this.spinElapsed = 0;
    this.spinPhase = 'accel';

    // 停止之前的 schedule
    this.unschedule(this.updateSpin);

    // 啟動動畫
    this.schedule(this.updateSpin, 0);
  }

  private updateSpin = (dt: number) => {
    if (!this.isSpinning) return;

    this.spinElapsed += dt;

    // 加速階段
    if (this.spinPhase === 'accel') {
      if (this.spinElapsed === 0 || this.spinElapsed - dt === 0) console.log('[SlotReel] 加速階段開始');
      const t = Math.min(this.spinElapsed / this.accelerationTime, 1);
      this.currentSpeed = this.targetSpeed * easing.quadOut(t);
      if (t >= 1) {
        console.log('[SlotReel] 加速階段結束');
        this.spinPhase = 'steady';
        this.spinElapsed = 0;
      }
    }
    // 恆速階段
    else if (this.spinPhase === 'steady') {
      if (this.spinElapsed === 0 || this.spinElapsed - dt === 0) console.log('[SlotReel] 恆速階段開始');
      this.currentSpeed = this.targetSpeed;
      if (this.spinElapsed >= this.spinDuration - this.accelerationTime - this.decelerationTime) {
        console.log('[SlotReel] 恆速階段結束');
        this.spinPhase = 'decel';
        this.spinElapsed = 0;
      }
    }
    // 減速階段
    else if (this.spinPhase === 'decel') {
      if (this.spinElapsed === 0 || this.spinElapsed - dt === 0) console.log('[SlotReel] 減速階段開始');
      const t = Math.min(this.spinElapsed / this.decelerationTime, 1);
      this.currentSpeed = this.targetSpeed * (1 - easing.quadOut(t));
      if (t >= 1) {
        console.log('[SlotReel] 減速階段結束');
        this.isSpinning = false;
        this.unschedule(this.updateSpin);
        this.spinPhase = 'rebound';
        // 範例：這裡應由外部傳入結果，這裡暫用假資料
        // this.setResult(['A', 'B', 'C']);
        this.startRebound(); // 進入回彈階段
        return;
      }
    }
    else if (this.spinPhase === 'rebound') {
      // 回彈動畫進行中，不做任何事，動畫結束後可在 startRebound 裡設回 idle
    }

    this.updateSymbols(dt);
  }

  private updateSymbols(dt: number = 1/60) {
    const moveDistance = this.currentSpeed * dt * this.spinDirection;
    const minY = Math.min(...this.initPositions);
    const maxY = Math.max(...this.initPositions);
    const totalHeight = maxY - minY + this.symbolHeight;

    // 判斷是否正在回彈（減速階段結束後 isSpinning 為 false）
    const isRebound = !this.isSpinning && (this.spinPhase === 'decel' || this.spinPhase === 'rebound');

    this.symbolNodes.forEach((symbolNode, index) => {
      let newY = symbolNode.position.y + moveDistance;
      // 只有在非回彈時才做循環移動
      if (!isRebound) {
        if (this.spinDirection < 0 && newY < minY - this.symbolHeight / 2) {
          newY += totalHeight;
          // 將最下面移到最上面的 symbol 換成隨機 symbol
          const symbol = symbolNode.getComponent(Symbol);
          if (symbol && this.spMgr && this.spMgr.symbols.length > 0) {
            const randomIdx = Math.floor(Math.random() * this.spMgr.symbols.length);
            const randomSymbol = this.spMgr.symbols[randomIdx];
            console.log(`[SlotReel] 替換符號: ${symbolNode.name} -> ${randomSymbol.name}`);
            symbol.setSymbol(randomSymbol);
          }
        } else if (this.spinDirection > 0 && newY > maxY + this.symbolHeight / 2) {
          newY -= totalHeight;
          // 將最上面移到最下面的 symbol 換成隨機 symbol
          const symbol = symbolNode.getComponent(Symbol);
          if (symbol && this.spMgr && this.spMgr.symbols.length > 0) {
            const randomIdx = Math.floor(Math.random() * this.spMgr.symbols.length);
            const randomSymbol = this.spMgr.symbols[randomIdx];
            console.log(`[SlotReel] 替換符號: ${symbolNode.name} -> ${randomSymbol.name}`);
            symbol.setSymbol(randomSymbol);
          }
        }
      }
      symbolNode.setPosition(0, Math.round(newY), 0);
    });
  }

  private startRebound() {
    // 回彈動畫，讓 slot 停止後有微小下壓感，然後回正，且不會明顯跳動
    console.log('[SlotReel] 回彈階段開始');
    let finishedCount = 0;
    this.symbolNodes.forEach((symbolNode, index) => {
      const targetY = this.initPositions[index];
      const currentY = symbolNode.position.y;
      // 若已經對齊，直接結束
      if (Math.abs(currentY - targetY) < 0.5) {
        symbolNode.setPosition(0, targetY, 0);
        finishedCount++;
        if (finishedCount === this.symbolNodes.length) {
          console.log('[SlotReel] 回彈階段結束');
          this.spinPhase = 'idle';
        }
        return;
      }
      // 回彈幅度固定為 6 像素，時間短，easing 用 quadOut
      const overshoot = 6;
      const overshootY = targetY + overshoot;
      tween(symbolNode).stop();
      tween(symbolNode)
        .to(0.12, { position: new Vec3(0, overshootY, 0) }, { easing: 'quadOut' })
        .to(0.18, { position: new Vec3(0, targetY, 0) }, { easing: 'quadIn' })
        .call(() => {
          finishedCount++;
          if (finishedCount === this.symbolNodes.length) {
            console.log('[SlotReel] 回彈階段結束');
            this.spinPhase = 'idle';
          }
        })
        .start();
    });
  }

  /**
   * 設定本次 spin 結果，resultIndices 長度需等於畫面內 symbol 數量（通常是可見格數）
   * @param resultIndices 例如 [0, 2, 5]，會對應到 spMgr.symbols 的 index
   */
  public setResult(resultIndices: number[]) {
    if (!this.spMgr || !this.spMgr.symbols) return;
    const visibleCount = resultIndices.length;
    const startIdx = Math.floor((this.symbolNodes.length - visibleCount) / 2);
    for (let i = 0; i < visibleCount; i++) {
      const node = this.symbolNodes[startIdx + i];
      const symbol = node.getComponent(Symbol);
      const spriteFrame = this.spMgr.symbols[resultIndices[i]];
      if (symbol && spriteFrame) {
        
        symbol.setSymbol(spriteFrame);
      }
    }
  }

  onDestroy() {
    // this.spinTween && this.spinTween.stop();
    this.unschedule(this.updateSpin);
  }
}