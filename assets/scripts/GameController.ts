// assets/scripts/GameController.ts
import { _decorator, Component, Node, UITransform, SpriteFrame, CCInteger, CCFloat } from 'cc';
import { SlotReel } from './components/SlotReel';
import GameConfig from './config/GameConfig'; // Import GameConfig
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property([SlotReel])
    public reels: SlotReel[] = [];

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
            reel.node.on('REEL_STOPPED_EVENT', this.onReelStopped, this);
        });
    }

    public startSpin() {
        // 純隨機模式：不設置預定結果，讓轉軸自然停止
        console.log('[GameController] 開始轉動 - 純隨機模式');
        
        this.reels.forEach((reel, i) => {
            setTimeout(() => {
                // reel.spin(); // Old direct call
                reel.node.emit('START_REEL_COMMAND'); // Emit event to start the reel
            }, i * 150); // 每個轉軸啟動間隔 150ms
        });
    }

    private onReelStopped(event: { reelId: number, symbols: number[] }) {
        console.log(`[GameController] 轉軸 ${event.reelId} 已停止，圖標: ${event.symbols.join(',')}`);
        // Here you can add logic to check for winning combinations
        // For example, collect results from all reels and then check.

        // Basic example: Check if all reels have stopped
        // This needs a more robust way to track stopping reels if complex logic is needed
        // For now, just logging the event.
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
                reel.node.off('REEL_STOPPED_EVENT', this.onReelStopped, this);
            }
        });
    }
}
