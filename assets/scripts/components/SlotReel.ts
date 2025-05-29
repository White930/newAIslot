import { _decorator, Component, Node, Sprite, SpriteFrame, CCFloat, easing, tween } from 'cc';
import { SpriteManager } from '.././SpriteManager';
import { Symbol } from './Symbol';
// import GameConfig from '../config/GameConfig'; // Removed GameConfig import
import { SpinPhase } from './SpinPhase';
const { ccclass, property } = _decorator;

@ccclass('SlotReel')
export class SlotReel extends Component {
  @property({ type: SpriteManager, tooltip: "圖標資源管理器" }) 
  public spMgr: SpriteManager = null;
  @property({ type: CCFloat, tooltip: "基礎旋轉持續時間 (秒)" }) 
  public spinDuration = 2.0;
  @property({ type: [Node], tooltip: "轉軸上的圖標節點陣列" }) 
  public symbolNodes: Node[] = [];
  // @property({ type: CCFloat, tooltip: "單個圖標的高度 (像素)" }) // No longer a property, will be injected
  // private symbolHeight: number = 100; // No longer a property, will be injected
  @property({ type: CCFloat, tooltip: "基礎旋轉速度 (像素/秒)" }) 
  private spinSpeed: number = 1000;
  @property({ type: CCFloat, tooltip: "加速階段持續時間 (秒)" }) 
  private accelerationTime: number = 0.3;
  @property({ type: CCFloat, tooltip: "減速階段持續時間 (秒) - 注意：實際減速時間由 preStopTime 控制" }) 
  private decelerationTime: number = 0.3; // 此屬性目前未直接用於控制減速時長，preStopTime 更重要
  @property({ type: CCFloat, tooltip: "整個轉軸的Y軸顯示偏移" }) 
  public offsetY: number = 0;

  @property({ type: CCFloat, tooltip: "停止前減速的持續時間 (秒)" }) 
  public preStopTime: number = 0.5;

  @property({ type: CCFloat, tooltip: "回彈動畫的過衝量 (圖標高度的百分比)" }) 
  public overshootAmount: number = 0.2;
  
  @property({ type: CCFloat, tooltip: "回彈動畫總持續時間 (秒)" }) 
  public bounceAnimDuration: number = 0.3;

  // 內部狀態與資料
  private isSpinning = false; // 是否正在旋轉
  private currentSpeed = 0;   // 目前速度
  private targetSpeed = 0;    // 目標速度
  private spinElapsed = 0;    // 目前旋轉階段已過時間
  private spinPhase: SpinPhase = SpinPhase.Idle; // 旋轉階段
  
  private reelOffset = 0;     // 轉軸滾動的偏移量 (以圖標高度為單位，例如0.5代表滾動半格)
  private symbolIndices: number[] = []; // 目前顯示在 symbolNodes 上的圖標索引陣列
  private reelDataCursor: number = 0; // 用於從 GameConfig.slotData 中提取下一個圖標的指針
  private spinStartTime: number = 0;  // 本次旋轉開始的絕對時間戳
  private spinCount: number = 0;      // 旋轉次數計數器
  private reelIndex: number = 0;      // 此轉軸在 GameController 中的索引 (從0開始)

  // New private members for injected dependencies
  private private_reelStripData: number[] = [];
  private private_yGap: number = 0;
  private private_symbolHeight: number = 100; // Default value, will be overridden

  // New initialize method
  public initialize(reelId: number, reelStripData: number[], yGap: number, symbolHeight: number) {
    this.reelIndex = reelId;
    this.private_reelStripData = reelStripData;
    this.private_yGap = yGap;
    this.private_symbolHeight = symbolHeight;

    // Initialization logic previously in start() that depends on these values
    // 從節點名稱解析並儲存 reelIndex (例如 "Reel0" -> 0) - reelIndex is now passed directly
    // this.reelIndex = this.node.name.match(/\\d+/) ? parseInt(this.node.name.match(/\\d+/)[0]) : 0;
    
    // 從 GameConfig 獲取此轉軸的圖標數據 - Now uses injected data
    // const slotData = GameConfig.slotData;
    // const currentReelStrip = slotData[this.reelIndex % slotData.length]; // 使用 % 避免索引越界
    const currentReelStrip = this.private_reelStripData; // Use the injected reel strip data directly

    // 初始化 symbolIndices，填滿可見的 symbolNodes
    this.symbolIndices = currentReelStrip.slice(0, this.symbolNodes.length);
    // 設定 reelDataCursor 的初始位置，指向 strip 中 symbolIndices 後的第一個圖標
    this.reelDataCursor = this.symbolIndices.length % currentReelStrip.length;
    
    this.updateSymbolNodes(); // 更新節點顯示
  }

  start() {
    // Most initialization is moved to initialize()
    // If there's any other start logic that doesn't depend on injected data, it can remain here.
    // For now, we assume GameController will call initialize() after the node is ready.
  }
  public spin() {
    if (this.isSpinning) return; // 如果已在旋轉，則不執行

    // 純隨機模式：不設置預定結果，讓轉軸自然停止

    this.isSpinning = true;
    this.currentSpeed = 0;
    this.targetSpeed = this.spinSpeed; // 設定目標速度為配置的 spinSpeed
    this.spinElapsed = 0;              // 重置階段計時器
    this.spinPhase = SpinPhase.Accel;  // 進入加速階段
    this.reelOffset = 0;               // 重置滾動偏移
    this.spinStartTime = Date.now();   // 記錄旋轉開始時間
    
    this.schedule(this.updateSpin, 0); // 啟動 updateSpin 循環，每幀執行
    this.spinCount++;                  // 增加旋轉計數
  }

  // 每幀更新旋轉邏輯
  private updateSpin = (dt: number) => {
    // 如果不在旋轉且不是減速階段 (減速完成後可能還在播放動畫)，則返回
    if (!this.isSpinning && this.spinPhase !== SpinPhase.Decel) return;
    this.spinElapsed += dt; // 累加階段時間

    // 加速階段
    if (this.spinPhase === SpinPhase.Accel) {
      const t = Math.min(this.spinElapsed / this.accelerationTime, 1); // 計算加速進度 (0-1)
      this.currentSpeed = this.targetSpeed * easing.quadOut(t); // 使用 quadOut 緩動計算目前速度
      if (t >= 1) { // 加速完成
        this.spinPhase = SpinPhase.Steady; // 進入穩定旋轉階段
        this.spinElapsed = 0; // 重置階段計時器
      }
    // 穩定旋轉階段
    } else if (this.spinPhase === SpinPhase.Steady) {
      this.currentSpeed = this.targetSpeed; // 保持目標速度
      // 判斷是否接近總旋轉時間，需要開始減速
      // 總旋轉時間 - 加速時間 - 預計停止前減速時間
      if (this.spinElapsed >= this.spinDuration - this.accelerationTime - this.preStopTime) {
        this.spinPhase = SpinPhase.Decel; // 進入減速階段
        this.spinElapsed = 0; // 重置階段計時器        // ---- 設定目標減速 ----
        // 現在使用隨機模式，不再需要精確的結果配置
        // 直接讓轉軸自然停止即可
        // console.log(`[SlotReel] ${this.node.name} 減速開始。使用隨機停止模式。`);
        // ---- 目標減速設定結束 ----
      }
    // 減速階段
    } else if (this.spinPhase === SpinPhase.Decel) {
      const decelProgress = Math.min(this.spinElapsed / this.preStopTime, 1); // 計算減速進度 (0-1)
      // 使用 (1 - quadOut) 來模擬 quadIn 的減速效果
      this.currentSpeed = this.targetSpeed * (1 - easing.quadOut(decelProgress)); 
      this.currentSpeed = Math.max(0, this.currentSpeed); // 確保速度不為負      // 減速完成
      if (decelProgress >= 1) {
        this.isSpinning = false; // 停止旋轉狀態
        this.unschedule(this.updateSpin); // 停止 updateSpin 循環
        this.currentSpeed = 0;

        // console.log(`[SlotReel] ${this.node.name} 減速旋轉完成。保持目前圖標位置並播放回彈動畫。`);
        
        // 直接播放回彈動畫，不更改 symbolIndices
        // 保持轉軸在自然停止位置的圖標，不套用最終結果配置
        this.playStopBounceAnimation(); // 播放停止回彈動畫

        if (this.spinStartTime) {
          // const totalSpinTime = (Date.now() - this.spinStartTime) / 1000;
          // console.log(`[SlotReel] ${this.node.name} 本次旋轉總耗時: ${totalSpinTime.toFixed(3)}s (spinCount: ${this.spinCount})`);
          this.spinStartTime = 0;
        }
        return; // 結束 updateSpin
      }
    }

    // 加速、穩定、減速 (只要速度 > 0) 階段的通用圖標滾動邏輯
    if (this.isSpinning || (this.spinPhase === SpinPhase.Decel && this.currentSpeed > 0)) {
        // 根據目前速度和時間間隔，計算滾動偏移量 (單位：圖標高度)
        this.reelOffset += (this.currentSpeed * dt) / this.private_symbolHeight; // Use injected symbolHeight
        // const slotData = GameConfig.slotData; // Removed GameConfig access
        const currentReelData = this.private_reelStripData; // Use injected reel strip data

        // 當偏移量超過一個圖標高度時，進行圖標的增補和移除
        while (this.reelOffset >= 1) { // 向下滾動 (正偏移)
          this.reelOffset -= 1; // 減去一整格偏移
          this.symbolIndices.pop(); // 移除底部圖標
          // 從 reelDataCursor 位置獲取新圖標，加到頂部
          this.symbolIndices.unshift(currentReelData[this.reelDataCursor]); 
          this.reelDataCursor = (this.reelDataCursor + 1) % currentReelData.length; // 更新 cursor
        }
        // 理論上在目前僅向前旋轉的設計中，不太會進入此迴圈
        while (this.reelOffset < 0) { // 向上滾動 (負偏移)
            this.reelOffset += 1;
            this.symbolIndices.shift(); // 移除頂部圖標
            // 更新 cursor (反向)，從 reelData 獲取新圖標加到尾部
            this.reelDataCursor = (this.reelDataCursor - 1 + currentReelData.length) % currentReelData.length;
            this.symbolIndices.push(currentReelData[this.reelDataCursor]); 
        }
        this.updateSymbolNodes(); // 更新節點顯示
    }
  }

  // 更新所有 symbolNode 的位置和顯示的圖標
  private updateSymbolNodes() {
    const n = this.symbolNodes.length;
    const centerIdx = Math.floor(n / 2); // 中心節點的索引 (用於對齊)
    for (let i = 0; i < n; i++) {
      const node = this.symbolNodes[i];
      // 計算每個圖標節點的 Y 座標
      // (centerIdx - i) 使節點以上下對稱方式排列
      // - this.reelOffset 應用滾動偏移
      // * GameConfig.Y_GAP 轉換為像素距離 // Now private_yGap
      // + this.offsetY 應用整體轉軸的Y軸偏移
      const y = (centerIdx - i - this.reelOffset) * this.private_yGap + this.offsetY; // Use injected yGap
      node.setPosition(0, y, 0);
      
      const symbolComponent = node.getComponent(Symbol);
      // 從 symbolIndices 獲取對應的圖標 ID，並確保 ID 在 spMgr.symbols 範圍內
      const symbolIdToShow = this.symbolIndices[i] % this.spMgr.symbols.length;
      if (symbolComponent && this.spMgr && this.spMgr.symbols.length > 0) {
        symbolComponent.setSymbol(this.spMgr.symbols[symbolIdToShow]);
      }
    }
  }

  // 播放停止時的回彈動畫
  private playStopBounceAnimation() {
    // 此時 this.symbolIndices 已經設定為最終結果
    // this.reelOffset 是減速自然停止時的殘餘偏移量
    // 動畫目標是將 reelOffset 變為 0，並帶有過衝和回彈效果

    const overshootVal = this.overshootAmount; // 過衝量 (單位：圖標高度的倍數)
    const durationPart = this.bounceAnimDuration / 3; // 將總時長分給三段動畫

    // 創建一個臨時對象來進行 tween 動畫，其 value 屬性代表 reelOffset
    // 直接 tween Node 的屬性在某些情況下可能不夠靈活或導致問題
    let tempTweenTarget = { value: this.reelOffset }; 

    tween(tempTweenTarget) 
        // 第一段：過衝到 overshootVal
        .to(durationPart, { value: overshootVal }, { 
            easing: easing.sineOut,
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes(); // 每幀更新節點位置
            }
        })
        // 第二段：回彈到 -overshootVal / 2
        .to(durationPart, { value: -overshootVal / 2 }, { 
            easing: easing.sineInOut,
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes();
            }
        })
        // 第三段：平滑回到 0
        .to(durationPart, { value: 0 }, { 
            easing: easing.sineIn, 
            onUpdate: () => {
                this.reelOffset = tempTweenTarget.value;
                this.updateSymbolNodes();
            },
            onComplete: () => {
                this.reelOffset = 0; // 確保動畫結束時 reelOffset 精確為 0
                this.updateSymbolNodes();
                this.spinPhase = SpinPhase.Idle; // 設定為閒置狀態
                // console.log(`[SlotReel] ${this.node.name} 回彈動畫完成。轉軸偏移: ${this.reelOffset}`);
            }
        })
        .start();
  }

  onDestroy() {
    this.unschedule(this.updateSpin); // 組件銷毀時，停止 updateSpin 循環
  }
}