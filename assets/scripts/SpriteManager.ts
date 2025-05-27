import { _decorator, Component, Node, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpriteManager')
export class SpriteManager extends Component {
    @property({ type: [SpriteFrame] }) public symbols: SpriteFrame[] = [];
    start() {

    }

    update(deltaTime: number) {
        
    }
}


