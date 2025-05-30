// src/config/GameConfig.ts
import slotData from './slotData.json';

export default class GameConfig {
  /** 轉軸列數 */
  public static COLS: number = 5;
  /** 轉軸行數 */
  public static ROWS: number = 5;

  /** 每格水平間距 (像素) */
  public static X_GAP: number = 150;
  /** 每格垂直間距 (像素) */
  public static Y_GAP: number = 120;

  /** 左上角第一格起始座標 */
  public static START_X: number = 0;
  public static START_Y: number = 0;

  /** Symbols 資源資料夾路徑 */
  public static SYMBOLS_PATH: string = 'symbols';

  /** 單格寬高 (像素) */
  public static SYMBOL_WIDTH: number = 100;
  public static SYMBOL_HEIGHT: number = 100;

  /** slotData 資料 */
  public static slotData: number[][] = slotData;
}

// 遊戲啟動時 log slotData
console.log('GameConfig.slotData', GameConfig.slotData);

// 之後有新常數也一樣用 public static 加在這裡