// assets/scripts/SlotLayoutGenerator.ts
import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame, Vec3, resources, director } from 'cc';
import { SlotReel } from '../components/SlotReel';
import { Symbol } from '../components/Symbol';
import { SpriteManager } from '../SpriteManager';
import { GameController } from '../GameController';
import GameConfig from '../config/GameConfig';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('SlotLayoutGenerator')
@executeInEditMode
export class SlotLayoutGenerator extends Component {

  public symbols: SpriteFrame[] = [];

  public columns = GameConfig.COLS;
  public rows = GameConfig.ROWS;
  public cellSize = GameConfig.SYMBOL_WIDTH;
  public spacingX = GameConfig.X_GAP;
  public spacingY = GameConfig.Y_GAP;
  public offsetX = GameConfig.START_X;
  public offsetY = GameConfig.START_Y;

  private gameController: GameController | null = null;
  private spriteManager: SpriteManager | null = null;

  onEnable() {
    // 先抓 GameConfig 設定
    this.columns = GameConfig.COLS;
    this.rows = GameConfig.ROWS;
    this.cellSize = GameConfig.SYMBOL_WIDTH;
    this.spacingX = GameConfig.X_GAP;
    this.spacingY = GameConfig.Y_GAP;
    this.offsetX = GameConfig.START_X;
    this.offsetY = GameConfig.START_Y;

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

    // 3. 在整個場景樹中尋找 GameController（不要用 this.node）
    this.gameController = scene.getComponentInChildren(GameController);
    if (!this.gameController) {
      console.error('SlotLayoutGenerator: 找不到 GameController 元件');
      return;
    }

    // 4. 讀取 symbols
    if (this.spriteManager.symbols && this.spriteManager.symbols.length > 0) {
      this.symbols = this.spriteManager.symbols;
    } else {
      this.symbols = [];
      console.warn('SlotLayoutGenerator: SpriteManager.symbols 為空');
    }

    // 5. 產生 slot layout
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
        const symbolNode = new Node(`Symbol_${col}_${row}`);
        symbolNode.parent = reelNode;

        // 大小
        const ui = symbolNode.addComponent(UITransform);
        ui.setContentSize(this.cellSize, this.cellSize);

        // 隨機圖
        const sp = symbolNode.addComponent(Sprite);
        if (this.symbols.length > 0) {
          sp.spriteFrame = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        }

        reel.symbolNodes.push(symbolNode);
        const symbol = symbolNode.addComponent(Symbol);
        symbol.sprite = sp;

        // 讓中心格在 y=0
        const centerIdx = Math.floor((this.rows - 1) / 2);
        symbolNode.setPosition(0, (centerIdx - row) * this.spacingY + this.offsetY, 0);
      }
    }

    // 將生成的 reels 添加到 GameController
    if (this.gameController && reels.length > 0) {
      console.log('SlotLayoutGenerator: 更新 GameController 的 reels');
      // 直接用 setReels 方法（若有）或 splice 覆蓋
      if (typeof this.gameController.setReels === 'function') {
        this.gameController.setReels(reels);
      } else {
        this.gameController.reels.splice(0, this.gameController.reels.length, ...reels);
      }
      // 若有 UI 需刷新，可在此加上事件或 callback
    }
  }
}
