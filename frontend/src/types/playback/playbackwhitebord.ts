export interface Point {
  x: number;
  y: number;
}

export interface DrawPath {
  color: string;
  lineWidth: number;
  points: Point[];
  id?: string | number;
}

export interface WhiteboardImage {
  id: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

export interface WhiteboardPlaybackProps {
  data: {
    images: WhiteboardImage[];
    drawPaths: DrawPath[];
  };
  isDarkMode: boolean;
  isLaserPen?: boolean;
}