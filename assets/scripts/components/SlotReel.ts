import { _decorator, Component, Node, Sprite, SpriteFrame, CCFloat, easing, tween } from 'cc';
import { SpriteManager } from '.././SpriteManager';
import { Symbol } from './Symbol';
import { SpinPhase } from './SpinPhase';
import { GameEvents } from '../events/GameEvents'; // 引入事件定義
const { ccclass, property } = _decorator;

@ccclass('SlotReel')
export class SlotReel extends Component {
  @property({ type: SpriteManager, tooltip: "圖標資源管理器" }) 
  public spMgr: SpriteManager = null;
  @property({ type: CCFloat, tooltip: "基礎旋轉持續時間 (秒)" }) 
  public spinDuration = 2.0;
  @property({ type: [Node], tooltip: "轉軸上的圖標節點陣列" }) 
  public symbolNodes: Node[] = [];
  // symbolHeight is now injected
  @property({ type: CCFloat, tooltip: "基礎旋轉速度 (像素/秒)" }) 
  private spinSpeed: number = 1000;
  @property({ type: CCFloat, tooltip: "加速階段持續時間 (秒)" }) 
  private accelerationTime: number = 0.3;
  @property({ type: CCFloat, tooltip: "整個轉軸的Y軸顯示偏移" }) 
  public offsetY: number = 0;

  @property({ type: CCFloat, tooltip: "停止前減速的持續時間 (秒)" }) 
  public preStopTime: number = 0.5;

  @property({ type: CCFloat, tooltip: "回彈動畫的過衝量 (圖標高度的百分比)" }) 
  public overshootAmount: number = 0.2;
  
  @property({ type: CCFloat, tooltip: "回彈動畫總持續時間 (秒)" }) 
  public bounceAnimDuration: number = 0.3;

  // 內部狀態
  private isSpinning = false;
  private currentSpeed = 0;
  private targetSpeed = 0;
  private spinElapsed = 0;
  private spinPhase: SpinPhase = SpinPhase.Idle;
  
  private reelOffset = 0;     // 轉軸滾動偏移 (圖標高度單位)
  private symbolIndices: number[] = []; // 目前顯示圖標的索引
  private reelDataCursor: number = 0;   // 圖標數據提取指針
  private spinStartTime: number = 0;
  private spinCount: number = 0;
  private reelIndex: number = 0;      // 轉軸索引

  // 注入的依賴項
  private private_reelStripData: number[] = [];
  private private_yGap: number = 0;
  private private_symbolHeight: number = 100; // 將被 initialize 方法覆蓋

  // 初始化轉軸
  public initialize(reelId: number, reelStripData: number[], yGap: number, symbolHeight: number) {
    this.reelIndex = reelId;
    this.private_reelStripData = reelStripData;
    this.private_yGap = yGap;
    this.private_symbolHeight = symbolHeight;

    // 監聽開始旋轉指令
    this.node.on(GameEvents.START_REEL_COMMAND, this.onStartReelCommand, this);
    
    const currentReelStrip = this.private_reelStripData;

    // 初始化可見圖標
    this.symbolIndices = currentReelStrip.slice(0, this.symbolNodes.length);
    // 設定圖標數據指針初始位置
    this.reelDataCursor = this.symbolIndices.length % currentReelStrip.length;
    
    this.updateSymbolNodes(); // 更新節點顯示
  }

  start() {
    // 主要初始化已移至 initialize()
  }

  private onStartReelCommand() {
    this.spin();
  }

  public spin() {
    if (this.isSpinning) return;

    // 純隨機模式：轉軸自然停止
    this.isSpinning = true;
    this.currentSpeed = 0;
    this.targetSpeed = this.spinSpeed;
    this.spinElapsed = 0;
    this.spinPhase = SpinPhase.Accel;
    this.reelOffset = 0;
    this.spinStartTime = Date.now();
    
    this.schedule(this.updateSpin, 0); // 每幀更新
    this.spinCount++;
  }

  // 每幀更新旋轉
  private updateSpin = (dt: number) => {
    if (!this.isSpinning && this.spinPhase !== SpinPhase.Decel) return;
    this.spinElapsed += dt;

    // 加速階段
    if (this.spinPhase === SpinPhase.Accel) {
      const t = Math.min(this.spinElapsed / this.accelerationTime, 1); // 加速進度 (0-1)
      this.currentSpeed = this.targetSpeed * easing.quadOut(t);
      if (t >= 1) {
        this.spinPhase = SpinPhase.Steady; // 進入穩定旋轉
        this.spinElapsed = 0;
      }
    // 穩定旋轉階段
    } else if (this.spinPhase === SpinPhase.Steady) {
      this.currentSpeed = this.targetSpeed;
      // 判斷是否開始減速
      if (this.spinElapsed >= this.spinDuration - this.accelerationTime - this.preStopTime) {
        this.spinPhase = SpinPhase.Decel; // 進入減速
        this.spinElapsed = 0;
        // 隨機模式，自然停止
      }
    // 減速階段
    } else if (this.spinPhase === SpinPhase.Decel) {
      const decelProgress = Math.min(this.spinElapsed / this.preStopTime, 1); // 減速進度 (0-1)
      // 模擬 quadIn 減速
      this.currentSpeed = this.targetSpeed * (1 - easing.quadOut(decelProgress)); 
      this.currentSpeed = Math.max(0, this.currentSpeed); // 速度不為負
      if (decelProgress >= 1) { // 減速完成
        this.isSpinning = false;
        this.unschedule(this.updateSpin);
        this.currentSpeed = 0;
        
        // 保持目前圖標位置並播放回彈動畫
        this.playStopBounceAnimation();

        if (this.spinStartTime) {
          this.spinStartTime = 0;
        }
        return;
      }
    }

    // 圖標滾動邏輯 (適用於加速、穩定、減速且速度 > 0 時)
    if (this.isSpinning || (this.spinPhase === SpinPhase.Decel && this.currentSpeed > 0)) {
        // 計算滾動偏移 (單位：圖標高度)
        this.reelOffset += (this.currentSpeed * dt) / this.private_symbolHeight;
        const currentReelData = this.private_reelStripData;

        // 處理圖標增補和移除
        while (this.reelOffset >= 1) { // 向下滾動
          this.reelOffset -= 1;
          this.symbolIndices.pop(); // 移除底部
          this.symbolIndices.unshift(currentReelData[this.reelDataCursor]); // 頂部加入新圖標
          this.reelDataCursor = (this.reelDataCursor + 1) % currentReelData.length;
        }
        // 理論上在目前僅向前旋轉的設計中，不太會進入此迴圈
        while (this.reelOffset < 0) { // 向上滾動
            this.reelOffset += 1;
            this.symbolIndices.shift(); // 移除頂部
            this.reelDataCursor = (this.reelDataCursor - 1 + currentReelData.length) % currentReelData.length;
            this.symbolIndices.push(currentReelData[this.reelDataCursor]); // 底部加入新圖標
        }
        this.updateSymbolNodes();
    }
  }

  // 更新所有圖標節點的位置和顯示
  private updateSymbolNodes() {
    const n = this.symbolNodes.length;
    const centerIdx = Math.floor(n / 2); // 中心節點索引
    for (let i = 0; i < n; i++) {
      const node = this.symbolNodes[i];
      // 計算 Y 座標
      // (centerIdx - i): 上下對稱排列
      // - this.reelOffset: 滾動偏移
      // * this.private_yGap: 像素距離
      // + this.offsetY: 整體Y軸偏移
      const y = (centerIdx - i - this.reelOffset) * this.private_yGap + this.offsetY;
      node.setPosition(0, y, 0);
      
      const symbolComponent = node.getComponent(Symbol);
      const symbolIdToShow = this.symbolIndices[i] % this.spMgr.symbols.length;
      if (symbolComponent && this.spMgr && this.spMgr.symbols.length > 0) {
        symbolComponent.setSymbol(this.spMgr.symbols[symbolIdToShow]);
      }
    }
  }

  // 播放停止回彈動畫
  private playStopBounceAnimation() {
    // this.symbolIndices 為轉軸自然停止時的圖標
    // this.reelOffset 是減速停止時的殘餘偏移
    // 動畫目標：reelOffset -> 0，帶有過衝回彈

    const overshootVal = this.overshootAmount; // 過衝量
    const durationPart = this.bounceAnimDuration / 3; // 每段動畫時長

    let tempTweenTarget = { value: this.reelOffset }; 

    tween(tempTweenTarget) 
        // 過衝
        .to(durationPart, { value: overshootVal }, { 
            easing: easing.sineOut,
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes();
            }
        })
        // 回彈
        .to(durationPart, { value: -overshootVal / 2 }, { 
            easing: easing.sineInOut,
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes();
            }
        })
        // 平滑回到0
        .to(durationPart, { value: 0 }, { 
            easing: easing.sineIn, 
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes();
            },
            onComplete: () => {
                this.reelOffset = 0; // 確保精確為0
                this.updateSymbolNodes();
                this.spinPhase = SpinPhase.Idle;
                
                // 發送轉軸停止事件
                this.node.emit(GameEvents.REEL_STOPPED_EVENT, { 
                    reelId: this.reelIndex, 
                    symbols: [...this.symbolIndices] // 發送圖標副本
                });
            }
        })
        .start();
  }

  onDestroy() {
    this.unschedule(this.updateSpin);
    this.node.off(GameEvents.START_REEL_COMMAND, this.onStartReelCommand, this); // 清理事件監聽
  }
}