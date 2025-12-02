export type ToolType = 'draw' | 'eraser' | 'text' | 'clear' | 'none';
export type ColorType = `#${string}`; // 严格约束十六进制颜色格式
export type LineWidthType = number;

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
}