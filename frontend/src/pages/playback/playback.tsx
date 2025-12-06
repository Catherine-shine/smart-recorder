
import PlaybackList from "../../components/playback/playBackList/playBackList";
import {  Row, Col, } from 'antd';
import React from "react";
import './index.css';
import PlayBackBody from "../../components/playback/playBackBody/playBackBody";
import WhiteboardPlayback from "../../components/playback/playBackWhiteboard/playBackWhiteboard";


//注明组件的 ts 类型是 React 函数式组件（React.FC）
const PlaybackModule: React.FC = () => { 
  return (
    <div className="playback-container">
      <div className="playback-content">
          <Row gutter={[0, 20]}>
            {/* 第一行：列表 + 白板回放 */}
            <Col xs={24}>
            {/* 整体布局：桌面端左列表右白板，移动端上列表下白板 */}
              <Row gutter={[20, 20]} className="playback-layout">
                {/* 回放列表：桌面端占8列，平板占6列，移动端占24列 */}
                <Col xs={24} sm={6} md={6} lg={5} className="playback-list-col">
                  <PlaybackList
                  />
                </Col>

                {/* 白板回放区域：桌面端占16列，平板占18列，移动端占24列 */}
                <Col xs={24} sm={18} md={18} lg={19} className="playback-player-col">
                {/* 仅添加必要高度，避免布局塌陷 */}
                <div style={{ height: 500 }}>
                  <WhiteboardPlayback
                  data={{ images: [], drawPaths: [] }} isDarkMode={false}
                  />
                </div>
                </Col>
                
              </Row>
            </Col>
            {/* 第二行：视频播放器 */}
            <Col xs={24}>
              <PlayBackBody />
            </Col>
        </Row>
      </div>
       
    </div>
  );
};

export default PlaybackModule;