import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// 定义白板操作数据的类型
export interface WhiteboardAction {
  id: string;
  type: 'draw' | 'erase' | 'text' | 'select';
  data: any; // 这里可以根据需要定义更具体的类型
  timestamp: number;
}

interface WhiteboardState {
  actions: WhiteboardAction[];
  currentPageId: string;
  isDrawing: boolean;
}

// 初始状态
const initialState: WhiteboardState = {
  actions: [],
  currentPageId: 'page-1',
  isDrawing: false,
};

// 创建slice
const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    // 添加操作记录
    addAction: (state, action: PayloadAction<WhiteboardAction>) => {
      state.actions.push(action.payload);
    },
    
    // 清除所有操作记录
    clearActions: (state) => {
      state.actions = [];
    },
    
    // 设置当前页面ID
    setCurrentPageId: (state, action: PayloadAction<string>) => {
      state.currentPageId = action.payload;
    },
    
    // 设置是否正在绘制
    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.isDrawing = action.payload;
    },
  },
});

// 导出actions
export const { addAction, clearActions, setCurrentPageId, setIsDrawing } = whiteboardSlice.actions;

// 导出reducer
export default whiteboardSlice.reducer;