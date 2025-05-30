import { _decorator, Component, Node, SpriteFrame, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Symbol')
export class Symbol extends Component {
    @property({ type: Sprite })
    public sprite: Sprite = null!;

    protected onLoad(): void {
        this.sprite = this.getComponent(Sprite);
    }

    start() {
    }

    update(deltaTime: number) {
        
    }

    /**
     * Set the symbol's sprite frame
     * @param spriteFrame The new sprite frame to set
     */
    public setSymbol(spriteFrame: SpriteFrame): void {
        if (this.sprite) {
            this.sprite.spriteFrame = spriteFrame;
        } else  {
            console.error('Sprite component is not assigned in Symbol.');
        }
    }
}


