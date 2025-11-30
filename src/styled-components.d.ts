// 扩展 Styled Components 的 DefaultTheme 接口，添加自定义的 dark 属性
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    dark: boolean; // 新增 dark 布尔属性，用于控制深色/浅色模式
    // 可扩展其他主题属性，如主色、副色等
    // primaryColor?: string;
    // secondaryColor?: string;
  }
}
