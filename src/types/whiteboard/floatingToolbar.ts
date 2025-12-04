export type ToolType = 'draw' | 'eraser' | 'text' | 'clear' | 'none';
export type ColorType = `#${string}`; // 严格约束十六进制颜色格式
export type LineWidthType = number;

//笔迹透明度类型（固定可选值，也可放宽为 number 0-1）
export type OpacityType = 0.2 | 0.4 | 0.6 | 0.8 | 1.0; 
// 或放宽约束：export type OpacityType = number; // 0-1 之间的数值

// 橡皮擦大小类型（固定可选值，也可放宽为 number）
export type EraserSizeType = 8 | 16 | 24 | 32 | 40;
// 或放宽约束：export type EraserSizeType = number; // 像素值

export interface FloatingToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  color: ColorType;
  setColor: (color: ColorType) => void;
  lineWidth: LineWidthType;
  setLineWidth: (width: LineWidthType) => void;
  isCameraOn: boolean;
  setIsCameraOn: (on: boolean) => void;
  isMicOn: boolean;
  setIsMicOn: (on: boolean) => void;
  onClearCanvas: () => void;
  onInsertText: () => void;
  // 可选：传入主题配置，替代全局CSS变量
  theme?: {
    cardBg?: string;
    textPrimary?: string;
    borderColor?: string;
  };
  // 新增：笔迹透明度相关
  opacity: OpacityType;
  setOpacity: (opacity: OpacityType) => void;
  // 新增：橡皮擦大小相关
  eraserSize: EraserSizeType;
  setEraserSize: (size: EraserSizeType) => void;

}