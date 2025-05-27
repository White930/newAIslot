// assets/scripts/SlotLayoutGenerator.ts
import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame, Vec3, resources, director } from 'cc';
import { SlotReel } from '../components/SlotReel';
import { Symbol } from '../components/Symbol';
import { SpriteManager } from '../SpriteManager';
import { GameController } from '../GameController';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('SlotLayoutGenerator')
@executeInEditMode
export class SlotLayoutGenerator extends Component {

  public symbols: SpriteFrame[] = [];

  @property
  public columns = 5;

  @property
  public rows = 5;

  @property
  public cellSize = 100;

  @property
  public spacingX = 150;

  @property
  public spacingY = 120;

  @property
  public offsetX = 0;
  @property
  public offsetY = 0;

  private gameController: GameController | null = null;
  private spriteManager: SpriteManager | null = null;

  onEnable() {
    // 1. 取得目前的 Scene 根節點
    const scene = director.getScene();
    if (!scene) {
      console.error('SlotLayoutGenerator: 無法取得目前場景');
      return;
    }

    // 2. 在整個場景樹中尋找 SpriteManager
    this.spriteManager = scene.getComponentInChildren(SpriteManager);
    if (!this.spriteManager) {
      console.error('SlotLayoutGenerator: 找不到 SpriteManager 元件');
      return;
    }

    // 3. 檢查是否已存在 GameController
    this.gameController = this.node.getComponent(GameController);
    if (!this.gameController) {
      // 如果沒有 GameController，則創建一個
      this.node.name = 'GameController';
      this.gameController = this.node.addComponent(GameController);
      console.log('SlotLayoutGenerator: 創建新的 GameController');
    } else {
      console.log('SlotLayoutGenerator: 使用現有的 GameController');
    }

    // 4. 讀取它的 symbols
    this.symbols = this.spriteManager.symbols;
    console.log('SlotLayoutGenerator symbols loaded:', this.symbols);

    // 5. 之後就可以用 this.symbols 來做 5x3 版面生成
    this.generateLayout();
  }

  private generateLayout() {
    // 先清空老节点
    this.node.children.slice().forEach(n => n.destroy());
    const reels: SlotReel[] = [];

    for (let col = 0; col < this.columns; col++) {
      const reelNode = new Node(`Reel_${col}`);
      reelNode.parent = this.node;
      reelNode.setPosition(this.offsetX + col * this.spacingX, 0, 0);
      const reel = reelNode.addComponent(SlotReel);
      
      // 設置 SpriteManager 引用
      if (this.spriteManager) {
        reel.spMgr = this.spriteManager;
      }
      
      reels.push(reel);

      for (let row = 0; row < this.rows; row++) {
        const symbolNode = new Node(`Slot_${col}_${row}`);
        symbolNode.parent = reelNode;

        // 大小
        const ui = symbolNode.addComponent(UITransform);
        ui.setContentSize(this.cellSize, this.cellSize);

        // 随机图
        const sp = symbolNode.addComponent(Sprite);
        if (this.symbols.length > 0) {
          sp.spriteFrame = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        }

        reel.symbolNodes.push(symbolNode);
        symbolNode.addComponent(Symbol);

        symbolNode.setPosition(0, this.offsetY - row * this.spacingY, 0);
      }
    }

    // 將生成的 reels 添加到 GameController
    if (this.gameController) {
      this.gameController.setReels(reels);
    }
  }
}
