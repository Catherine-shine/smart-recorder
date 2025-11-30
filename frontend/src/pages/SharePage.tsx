import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { WhiteboardContent } from '../components/whiteboard/whiteboard';
import { Provider } from 'react-redux';
import { store } from '../store';
import type { Recording } from '../store/slices/whiteboardSlice';

const SharePageContent: React.FC = () => {
    const [searchParams] = useSearchParams();
    const hashid = searchParams.get('hashid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recording, setRecording] = useState<Recording | null>(null);

    useEffect(() => {
        if (!hashid) {
            setError('缺少录制ID');
            setLoading(false);
            return;
        }

        const fetchRecording = async () => {
            try {
                // Fetch recording metadata/trajectory
                const response = await fetch(`/api/recordings/${hashid}`);
                if (!response.ok) {
                    throw new Error('无法加载录制数据');
                }
                const data = await response.json();
                
                // Construct the recording object
                // The backend returns { id, trajectory, audioUrl }
                // We need to adapt it to the frontend Recording interface
                
                const loadedRecording: Recording = {
                    id: data.hashid,
                    name: 'Shared Recording',
                    createdAt: data.createdAt || Date.now(),
                    duration: 0, // Will be calculated from actions
                    actions: data.trajectory,
                    audioUrl: data.audioUrl ? `${data.audioUrl}` : undefined
                };

                setRecording(loadedRecording);
            } catch (err) {
                console.error(err);
                setError('加载失败，录制可能不存在或已过期');
            } finally {
                setLoading(false);
            }
        };

        fetchRecording();
    }, [hashid]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="正在加载录制..." />
            </div>
        );
    }

    if (error) {
        return (
            <Result
                status="404"
                title="无法访问"
                subTitle={error}
            />
        );
    }

    return (
        <div style={{ height: '100vh', width: '100vw' }}>
            {recording && (
                <WhiteboardContent 
                    readOnly={true} 
                    initialRecording={recording} 
                />
            )}
        </div>
    );
};

export default function SharePage() {
    return (
        <Provider store={store}>
            <SharePageContent />
        </Provider>
    );
}
