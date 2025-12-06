// src/types/whiteboard.ts
export type ToolType = 'draw' | 'eraser' | 'text' | 'clear' | 'camera' | 'microphone' | 'none';
export type ColorType = '#007bff' | '#ff4d4f' | '#52c41a' | '#faad14' | '#722ed1' | '#000000';
export type LineWidthType = 2 | 4 | 6 | 8;
// 笔迹透明度/橡皮擦大小类型
export type OpacityType = 0.2 | 0.4 | 0.6 | 0.8 | 1.0; // 固定5档透明度
export type EraserSizeType = 8 | 16 | 24 | 32 | 40; // 固定5档橡皮擦大小（px）
