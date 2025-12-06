import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';


interface LayoutState {
  sidebarCollapsed: boolean;
  activeTool: string;
  theme: 'light' | 'dark';
}

const initialState: LayoutState = {
  sidebarCollapsed: false,
  activeTool: 'draw',
  theme: 'light',
};
 
const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setActiveTool: (state, action: PayloadAction<string>) => {
      state.activeTool = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme',state.theme);
    },
    loadTheme:(state)=>{
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      if (savedTheme) state.theme = savedTheme;
    }
  },
});

export const { toggleSidebar, setActiveTool, toggleTheme ,loadTheme} = layoutSlice.actions;
export default layoutSlice.reducer;