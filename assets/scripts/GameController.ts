// assets/scripts/GameController.ts
import { _decorator, Component, Node, UITransform, SpriteFrame, CCInteger, CCFloat } from 'cc';
import { SlotReel } from './components/SlotReel';
import GameConfig from './config/GameConfig'; // Import GameConfig
import { GameEvents } from './events/GameEvents'; // 引入事件定義
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property([SlotReel])
    public reels: SlotReel[] = [];

    private isSpinningActive: boolean = false; // 新增：追蹤是否有旋轉正在進行
    private activeSpinCount: number = 0;    // 新增：追蹤目前正在旋轉的轉軸數量

    // GameConfig is now used directly in initializeReels.

    start() {
        this.initializeReels();
    }

    initializeReels() {
        const slotData = GameConfig.slotData;
        const yGap = GameConfig.Y_GAP;
        const symbolHeight = GameConfig.SYMBOL_HEIGHT; // Assuming SYMBOL_HEIGHT is defined in GameConfig

        this.reels.forEach((reel, i) => {
            const reelId = i; // 使用索引作為 reelId
            const currentReelStrip = slotData[reelId % slotData.length];
            reel.initialize(reelId, currentReelStrip, yGap, symbolHeight);

            // 監聽此轉軸停止事件
            reel.node.on(GameEvents.REEL_STOPPED_EVENT, this.onReelStopped, this);
        });
    }

    public startSpin() {
        if (this.isSpinningActive) {
            console.log('[GameController] 旋轉已在進行中，請稍候。');
            return;
        }

        if (this.reels.length === 0) {
            console.warn('[GameController] 沒有可旋轉的轉軸。');
            return;
        }

        this.isSpinningActive = true;
        this.activeSpinCount = this.reels.length;
        console.log('[GameController] 開始轉動 - 純隨機模式');
        
        this.reels.forEach((reel, i) => {
            setTimeout(() => {
                reel.node.emit(GameEvents.START_REEL_COMMAND);
            }, i * 150); // 每個轉軸啟動間隔 150ms
        });
    }

    private onReelStopped(event: { reelId: number, symbols: number[] }) {
        console.log(`[GameController] 轉軸 ${event.reelId} 已停止，圖標: ${event.symbols.join(',')}`);
        
        this.activeSpinCount--;
        if (this.activeSpinCount <= 0) {
            this.isSpinningActive = false;
            this.activeSpinCount = 0; // 確保計數器不會變為負數
            console.log('[GameController] 所有轉軸已停止。');
            // 在這裡可以添加檢查中獎組合的邏輯
        }
    }

    public setReels(reels: SlotReel[]) {
        this.reels.length = 0; // 清空現有陣列
        reels.forEach(reel => this.reels.push(reel));
        // If reels are set dynamically after start, you might need to re-initialize event listeners
    }

    onDestroy() {
        // Clean up event listeners when GameController is destroyed
        this.reels.forEach(reel => {
            if (reel && reel.node) {
                reel.node.off(GameEvents.REEL_STOPPED_EVENT, this.onReelStopped, this);
            }
        });
    }
}
