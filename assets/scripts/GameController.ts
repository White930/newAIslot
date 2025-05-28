// assets/scripts/GameController.ts
import { _decorator, Component, Node, UITransform, SpriteFrame, CCInteger, CCFloat } from 'cc';
import { SlotReel } from './components/SlotReel';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property([SlotReel])
    public reels: SlotReel[] = [];

    @property(CCFloat)
    private spinDuration: number = 2.0;

    @property(CCInteger)
    private totalReels: number = 5;

    @property(CCInteger)
    private totalRows: number = 3;

    @property(CCInteger)
    private totalSymbols: number = 10;

    public startSpin() {
        // 每個 reel 增加遞增延遲
        this.reels.forEach((reel, i) => {
            setTimeout(() => {
                reel.spin();
            }, i * 150); // 每個 reel 間隔 150ms，可依需求調整
        });
    }

    public setReels(reels: SlotReel[]) {
        // 直接覆蓋 reels 陣列內容，確保 reference 正確
        this.reels.length = 0;
        reels.forEach(reel => this.reels.push(reel));
        // 若有 UI 需刷新，可在此加上事件或 callback
    }
}
