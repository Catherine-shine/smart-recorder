
import PlaybackList from "../../components/playback/playBackList/playBackList";
import {  Row, Col, } from 'antd';
import React from "react";
import './index.css';
import PlayBackBody from "../../components/playback/playBackBody/playBackBody";


//注明组件的 ts 类型是 React 函数式组件（React.FC）
const PlaybackModule: React.FC = () => { 
  return (
    <div className="playback-container">
      <div className="playback-content">
        {/* 整体布局：桌面端左列表右播放器，移动端上列表下播放器 */}
        <Row gutter={[20, 20]} className="playback-layout">
          {/* 回放列表：桌面端占8列，平板占6列，移动端占24列 */}
          <Col xs={24} sm={6} md={6} lg={5} className="playback-list-col">
            <PlaybackList
            />
          </Col>

          {/* 播放器区域：桌面端占16列，平板占18列，移动端占24列 */}
          <Col xs={24} sm={18} md={18} lg={19} className="playback-player-col">
           <PlayBackBody />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default PlaybackModule;