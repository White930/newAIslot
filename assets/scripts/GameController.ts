// assets/scripts/GameController.ts
import { _decorator, Component, Node, UITransform, SpriteFrame, CCInteger, CCFloat } from 'cc';
import { SlotReel } from './components/SlotReel';
import GameConfig from './config/GameConfig'; // Import GameConfig
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property([SlotReel])
    public reels: SlotReel[] = [];

    // Add properties to hold GameConfig values if they are used by GameController directly
    // For now, we assume GameConfig is primarily for SlotReel initialization

    start() {
        this.initializeReels();
    }

    initializeReels() {
        const slotData = GameConfig.slotData;
        const yGap = GameConfig.Y_GAP;
        const symbolHeight = GameConfig.SYMBOL_HEIGHT; // Assuming SYMBOL_HEIGHT is defined in GameConfig

        this.reels.forEach((reel, i) => {
            const reelId = i; // Or derive from node name if preferred, but direct index is simpler
            const currentReelStrip = slotData[reelId % slotData.length];
            reel.initialize(reelId, currentReelStrip, yGap, symbolHeight);
        });
    }

    public startSpin() {
        // 純隨機模式：不設置預定結果，讓轉軸自然停止
        console.log('[GameController] 開始轉動 - 純隨機模式');
        
        this.reels.forEach((reel, i) => {
            setTimeout(() => {
                reel.spin();
            }, i * 150); // 每個轉軸啟動間隔 150ms
        });
    }

    public setReels(reels: SlotReel[]) {
        this.reels.length = 0; // 清空現有陣列
        reels.forEach(reel => this.reels.push(reel));
    }
}
