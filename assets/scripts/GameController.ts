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

    public setReels(reels: SlotReel[]) {
        this.reels = reels;
    }

    public startSpin() {
        this.reels[0].spin();
        // this.reels.forEach(reel => reel.spin());
    }
}
