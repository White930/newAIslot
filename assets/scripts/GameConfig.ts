// src/config/GameConfig.ts
export default class GameConfig {
  /** 轉軸列數 */
  public static readonly COLS: number = 5;
  /** 轉軸行數 */
  public static readonly ROWS: number = 3;

  /** 每格水平間距 (像素) */
  public static readonly X_GAP: number = 100;
  /** 每格垂直間距 (像素) */
  public static readonly Y_GAP: number = 100;

  /** 左上角第一格起始座標 */
  public static readonly START_X: number = -200;
  public static readonly START_Y: number = 100;

  /** Symbols 資源資料夾路徑 */
  public static readonly SYMBOLS_PATH: string = 'symbols';

  /** 單格寬高 (像素) */
  public static readonly SYMBOL_WIDTH: number = 100;
  public static readonly SYMBOL_HEIGHT: number = 100;
}
