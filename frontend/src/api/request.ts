import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// 创建Axios实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 接口基准地址（从环境变量读取）
  timeout: 60000, // 增加超时时间到60秒，适应文件上传
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
});


// 请求拦截器：添加token等通用配置
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 示例：添加认证token（根据实际业务调整）
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('请求错误：', error);
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理响应/错误
request.interceptors.response.use(
  (response) => {
    // 统一处理响应数据（根据后端返回格式调整）
    return response.data;
  },
  (error: AxiosError) => {
    console.error('响应错误：', error);
    // 统一错误提示（可结合UI组件如ElMessage）
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('未授权，请重新登录');
          // 可跳转登录页
          break;
        case 404:
          console.error('接口不存在');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        default:
          console.error('请求失败：', (error.response?.data as any)?.message || '未知错误');
      }
    }
    return Promise.reject(error);
  }
);

// 导出请求方法（支持自定义配置）
export default request;