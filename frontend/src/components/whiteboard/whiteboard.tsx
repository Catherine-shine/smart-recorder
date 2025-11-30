"use client"
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
DefaultToolbar,
DrawToolbarItem,
EraserToolbarItem,
TextToolbarItem,
SelectToolbarItem,
Tldraw,
TldrawUiMenuGroup,
Editor,
    type TLRecord,
    createShapeId
} from 'tldraw'
import { Provider } from 'react-redux'
import { Layout, message, Button, Modal } from 'antd'
import { StopOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { store, useAppDispatch, useAppSelector } from '../../store'
import { 
    setIsDrawing, 
    type Recording, 
    addAction as addWhiteboardAction,
    saveRecording,
    updateRecording,
    clearActions,
    setCurrentRecordingId,
    setIsRecording
} from '../../store/slices/whiteboardSlice'
import { PlaybackSidebar } from './PlaybackSidebar'
import { PlaybackControlBar } from './PlaybackControlBar'
import 'tldraw/tldraw.css'

const { Content } = Layout;

// Helper functions for Blob/Base64 conversion
export function dataURLtoBlob(dataurl: string) {
    try {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1] || 'audio/webm',
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    } catch (e) {
        console.error("Error converting data URL to blob", e);
        return new Blob([], {type: 'audio/webm'});
    }
}

export function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function formatTime(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface WhiteboardContentProps {
    initialRecording?: Recording;
    readOnly?: boolean;
}

// 白板内容组件，用于与Redux集成
export function WhiteboardContent({ initialRecording, readOnly }: WhiteboardContentProps) {
    const dispatch = useAppDispatch()
    const [editor, setEditor] = useState<Editor | null>(null)
    const currentActions = useAppSelector(state => state.whiteboard.actions);
    const currentRecordingId = useAppSelector(state => state.whiteboard.currentRecordingId);
    const recordings = useAppSelector(state => state.whiteboard.recordings);
    const isRecording = useAppSelector(state => state.whiteboard.isRecording);

    // Recording State
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]); 
    const recordingStartTimeRef = useRef<number>(0);
    const timerIntervalRef = useRef<any>(null);

    // Playback state
    const [playbackState, setPlaybackState] = useState<{
        isActive: boolean;
        isPlaying: boolean;
        currentTime: number;
        duration: number;
        recording: Recording | null;
    }>({
        isActive: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        recording: null
    });

    const playbackRef = useRef({
        startTime: 0,
        lastRenderedTime: 0,
        laserId: createShapeId('laser-pointer')
    });
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlaybackActiveRef = useRef(false);

    // Update ref when state changes
    useEffect(() => {
        isPlaybackActiveRef.current = playbackState.isActive;
    }, [playbackState.isActive]);

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = []; // Start fresh for this segment

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            dispatch(setIsRecording(true));
            recordingStartTimeRef.current = Date.now();
            
            // Start Timer
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(Date.now() - recordingStartTimeRef.current);
            }, 1000);

            message.success('已开始');
        } catch (err) {
            console.error("Error starting recording:", err);
            message.error("无法启动录音，请检查麦克风权限");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            dispatch(setIsRecording(false));
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            message.info('已结束');
        }
    };

    // Toolbar with Recording Controls
    const components = useMemo(() => {
        if (playbackState.isActive || readOnly) {
            return {
                Toolbar: () => null as any,
                StylePanel: () => null as any,
                MainMenu: () => null as any,
                PageMenu: () => null as any,
                HelpMenu: () => null as any,
                NavigationPanel: () => null as any,
                DebugPanel: () => null as any,
                SharePanel: () => null as any,
                QuickActions: () => null as any,
                HelperButtons: () => null as any,
                ZoomMenu: () => null as any,
            }
        }
        return {
            Toolbar: () => (
                <DefaultToolbar orientation="horizontal">
                    <TldrawUiMenuGroup id="basic-tools">
                        <SelectToolbarItem />
                        <DrawToolbarItem />
                        <EraserToolbarItem />
                        <TextToolbarItem />
                    </TldrawUiMenuGroup>
                    <div style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, background: '#f0f0f0', padding: '4px 8px', borderRadius: 8 }}>
                        {!isRecording ? (
                            <Button onClick={startRecording} icon={<PlayCircleOutlined />} type="primary" title="开始">开始</Button>
                        ) : (
                            <Button onClick={stopRecording} icon={<StopOutlined />} danger title="结束">结束</Button>
                        )}
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', minWidth: 45 }}>
                            {formatTime(recordingTime)}
                        </span>
                    </div>
                </DefaultToolbar>
            ),
        }
    }, [isRecording, recordingTime, playbackState.isActive, readOnly]);

    const handleMount = useCallback((editor: Editor) => {
        setEditor(editor)
        
        // 监听 store 变化
        const cleanup = editor.store.listen((entry) => {
             if (isPlaybackActiveRef.current) return;

             // Check tool for UI state
             const currentToolId = editor.getCurrentToolId();
             dispatch(setIsDrawing(currentToolId === 'draw'));

             const { changes } = entry;
             
             // 忽略激光笔的变化
             if (Object.keys(changes.added).some(id => id.includes('laser')) ||
                 Object.keys(changes.updated).some(id => id.includes('laser')) ||
                 Object.keys(changes.removed).some(id => id.includes('laser'))) {
                 return;
             }

             // 处理新增的形状
             Object.values(changes.added).forEach((record) => {
                 if (record.typeName === 'shape') {
                     dispatch(addWhiteboardAction({
                         id: record.id,
                         type: record.type === 'text' ? 'text' : 'draw',
                         data: record,
                         timestamp: Date.now()
                     }))
                 }
             })

             // 处理更新的形状 (用于轨迹回放)
             Object.values(changes.updated).forEach((change) => {
                 const [, to] = change as [TLRecord, TLRecord];
                 if (to.typeName === 'shape' && to.type === 'draw') {
                     dispatch(addWhiteboardAction({
                         id: to.id,
                         type: 'update',
                         data: to,
                         timestamp: Date.now()
                     }))
                 }
             })

             // 处理删除的形状
             Object.values(changes.removed).forEach((record) => {
                 if (record.typeName === 'shape') {
                     dispatch(addWhiteboardAction({
                         id: record.id,
                         type: 'erase',
                         data: { shapeId: record.id },
                         timestamp: Date.now()
                     }))
                 }
             })
        })
        
        return () => cleanup()
    }, [dispatch])

    // Animation Loop
    useEffect(() => {
        if (!playbackState.isActive || !playbackState.isPlaying || !playbackState.recording) return;

        let animationFrameId: number;
        let lastTimestamp = Date.now();

        const animate = () => {
            const now = Date.now();
            const delta = now - lastTimestamp;
            lastTimestamp = now;

            setPlaybackState(prev => {
                if (!prev.isPlaying) return prev;
                const newTime = prev.currentTime + delta;
                
                if (newTime >= prev.duration) {
                    return { ...prev, isPlaying: false, currentTime: prev.duration };
                }
                
                return { ...prev, currentTime: newTime };
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [playbackState.isActive, playbackState.isPlaying]);

    // Audio Playback Sync
    useEffect(() => {
        if (!playbackState.isActive) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            return;
        }

        if (playbackState.isPlaying) {
            audioRef.current?.play().catch(e => console.warn("Audio play failed", e));
        } else {
            audioRef.current?.pause();
        }
    }, [playbackState.isPlaying, playbackState.isActive]);

    // Render Loop based on currentTime
    useEffect(() => {
        if (!playbackState.isActive || !playbackState.recording || !editor) return;

        const { recording, currentTime } = playbackState;
        const { startTime, lastRenderedTime, laserId } = playbackRef.current;

        // Sync Audio Time if drifted significantly
        if (audioRef.current && Math.abs(audioRef.current.currentTime * 1000 - currentTime) > 300) {
             if (Math.abs(audioRef.current.currentTime * 1000 - currentTime) > 1000) {
                 // Only seek if diff is large to avoid stutter
                 audioRef.current.currentTime = currentTime / 1000;
             }
        }

        // If we seeked backwards, or just started, we might need to reset
        let renderStartTime = lastRenderedTime;
        if (currentTime < lastRenderedTime) {
            // Reset canvas for seek backwards
            editor.selectAll();
            editor.deleteShapes(editor.getSelectedShapeIds());
            
            // Re-create laser pointer
            editor.createShape({
                id: laserId,
                type: 'geo',
                x: 0,
                y: 0,
                props: {
                    geo: 'ellipse',
                    w: 10,
                    h: 10,
                    color: 'red',
                    fill: 'solid',
                },
                opacity: 0.8,
            });
            renderStartTime = 0;
        }

        // Filter actions to apply
        const actionsToApply = recording.actions.filter(action => {
            const actionTime = action.timestamp - startTime;
            return actionTime > renderStartTime && actionTime <= currentTime;
        });

        // Apply actions
        actionsToApply.forEach(action => {
             try {
                // Update laser pointer position
                if (action.type === 'draw' || action.type === 'update') {
                    const shape = action.data;
                    let x = shape.x;
                    let y = shape.y;

                    if (shape.type === 'draw' && shape.props?.segments) {
                        const segments = shape.props.segments;
                        if (segments.length > 0) {
                            const lastSegment = segments[segments.length - 1];
                            if (lastSegment.points && lastSegment.points.length > 0) {
                                const lastPoint = lastSegment.points[lastSegment.points.length - 1];
                                x += lastPoint.x;
                                y += lastPoint.y;
                            }
                        }
                    }

                    editor.updateShape({
                        id: laserId,
                        type: 'geo',
                        x: x - 5,
                        y: y - 5,
                    });
                    editor.bringToFront([laserId]);
                }

                if (action.type === 'draw' || action.type === 'text') {
                    if (!editor.getShape(action.data.id)) {
                        editor.createShape(action.data)
                    }
                } else if (action.type === 'update') {
                    if (editor.getShape(action.data.id)) {
                        editor.updateShape(action.data)
                    }
                } else if (action.type === 'erase') {
                    editor.deleteShape(action.data.shapeId)
                }
            } catch (e) {
                console.error('Error applying action:', e)
            }
        });

        playbackRef.current.lastRenderedTime = currentTime;

    }, [playbackState.currentTime, playbackState.isActive, playbackState.recording, editor]);


    const handleLoad = useCallback((recording: Recording) => {
        if (!editor) return;

        // 1. Exit Playback Mode if active
        if (playbackState.isActive) {
            setPlaybackState(prev => ({ ...prev, isActive: false, isPlaying: false }));
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            // Remove laser pointer if exists
             try {
                editor.deleteShape(playbackRef.current.laserId);
            } catch (e) {}
        }

        dispatch(setCurrentRecordingId(recording.id));
        
        // 2. Clear Canvas
        editor.selectAll();
        editor.deleteShapes(editor.getSelectedShapeIds());

        // 3. Reconstruct Final State
        const sortedActions = [...recording.actions].sort((a, b) => a.timestamp - b.timestamp);
        
        // Tldraw Editor doesn't have a batch method exposed directly in this version or type definition might be tricky.
        // We can just run the loop. Tldraw handles updates efficiently.
        sortedActions.forEach(action => {
            try {
                if (action.type === 'draw' || action.type === 'text') {
                    if (!editor.getShape(action.data.id)) {
                        editor.createShape(action.data)
                    }
                } else if (action.type === 'update') {
                    if (editor.getShape(action.data.id)) {
                        editor.updateShape(action.data)
                    }
                } else if (action.type === 'erase') {
                    editor.deleteShape(action.data.shapeId)
                }
            } catch (e) {
                // ignore
            }
        });
        
        message.success(`已加载: ${recording.name}`);

    }, [editor, dispatch, playbackState.isActive]);

    const handlePlay = useCallback(async (recording: Recording) => {
        if (!editor) return;
        
        // Stop current audio if active
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        dispatch(setCurrentRecordingId(recording.id));
        dispatch(clearActions());

        // Sort actions
        const sortedActions = [...recording.actions].sort((a, b) => a.timestamp - b.timestamp);
        if (sortedActions.length === 0) {
             message.warning("没有可回放的操作");
             return;
        }

        const startTime = sortedActions[0].timestamp;
        const endTime = sortedActions[sortedActions.length - 1].timestamp;
        const duration = Math.max(endTime - startTime + 1000, recording.duration || 0);

        // Reset Canvas
        editor.selectAll();
        editor.deleteShapes(editor.getSelectedShapeIds());

        // Initialize Playback State
        playbackRef.current = {
            startTime,
            lastRenderedTime: Infinity, // Force initial render reset
            laserId: createShapeId('laser-pointer')
        };

        // Setup Audio
        if (recording.audioUrl) {
            audioRef.current = new Audio(recording.audioUrl);
            audioRef.current.load();
        }

        setPlaybackState({
            isActive: true,
            isPlaying: true,
            currentTime: 0,
            duration,
            recording: { ...recording, actions: sortedActions }
        });
    }, [editor, dispatch]);

    // Auto-play if initialRecording is provided
    useEffect(() => {
        if (initialRecording && editor) {
            handlePlay(initialRecording);
        }
    }, [initialRecording, editor, handlePlay]);

    const handlePlayPause = () => {
        setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    };

    const handleSeek = (time: number) => {
        setPlaybackState(prev => ({ ...prev, currentTime: time }));
        if (audioRef.current) {
            audioRef.current.currentTime = time / 1000;
        }
    };

    const handleClosePlayback = () => {
        setPlaybackState(prev => ({ ...prev, isActive: false, isPlaying: false }));
        if (editor) {
             try {
                editor.deleteShape(playbackRef.current.laserId);
            } catch (e) {
                // ignore
            }
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };

    const handleSave = async () => {
        if (currentActions.length === 0 && audioChunksRef.current.length === 0) {
            message.warning('没有可保存的操作或录音');
            return;
        }

        const hide = message.loading('正在处理...', 0);

        try {
            // 1. Prepare Audio
            let finalAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // If we are editing an existing recording, we might want to merge audio.
            // For this "Share" feature, let's simplify and just upload the current session's result.
            // If it's an update, we should probably merge first.
            
            if (currentRecordingId) {
                const existingRecording = recordings.find(r => r.id === currentRecordingId);
                if (existingRecording && existingRecording.audioUrl) {
                    const oldBlob = dataURLtoBlob(existingRecording.audioUrl);
                    if (finalAudioBlob.size > 0) {
                        finalAudioBlob = new Blob([oldBlob, finalAudioBlob], { type: 'audio/webm' });
                    } else {
                        finalAudioBlob = oldBlob;
                    }
                }
            }

            // 2. Upload to Backend
            const formData = new FormData();
            formData.append('audio', finalAudioBlob, 'recording.webm');
            const trajectoryBlob = new Blob([JSON.stringify(currentActions)], { type: 'application/json' });
            formData.append('trajectory', trajectoryBlob, 'trajectory.json');

            const response = await fetch('/api/recordings', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            const shareUrl = `${window.location.origin}/share?hashid=${data.hashid}`;

            // 3. Save Locally (Redux)
            let finalAudioUrl = await blobToDataURL(finalAudioBlob);
            if (currentRecordingId) {
                dispatch(updateRecording({ audioUrl: finalAudioUrl }));
            } else {
                const name = `录制 ${new Date().toLocaleString()}`;
                dispatch(saveRecording({ name, audioUrl: finalAudioUrl }));
            }

            Modal.success({
                title: '保存并上传成功',
                content: (
                    <div>
                        <p>您的录制已生成分享链接：</p>
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer">{shareUrl}</a>
                    </div>
                ),
            });

            audioChunksRef.current = [];

        } catch (error) {
            console.error(error);
            message.error('保存/上传失败');
        } finally {
            hide();
        }
    };

    const handleNewWhiteboard = () => {
        if (editor) {
            editor.selectAll();
            editor.deleteShapes(editor.getSelectedShapeIds());
        }
        dispatch(clearActions());
        dispatch(setCurrentRecordingId(null));
        dispatch(setIsRecording(false));
        setPlaybackState(prev => ({ ...prev, isActive: false, isPlaying: false }));
        audioChunksRef.current = [];
        setRecordingTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        message.success('已新建画板');
    };

    return (
        <Layout style={{ height: '100vh', flexDirection: 'row' }}>
            <Content style={{ position: 'relative', flex: 1 }}>
                <div className="tldraw__editor" style={{ position:'absolute', inset:'0' }}>
                    <Tldraw 
                        persistenceKey={readOnly ? undefined : "smart-recorder-whiteboard"}
                        components={components}
                        onMount={handleMount}
                    >
                        {!isRecording && !playbackState.isActive && !readOnly && (
                            <div 
                                style={{ 
                                    position: 'absolute', 
                                    inset: 0, 
                                    zIndex: 100, 
                                    background: 'rgba(255,255,255,0.1)',
                                    cursor: 'not-allowed'
                                }} 
                                onClick={() => message.warning("请先点击开始按钮")}
                            />
                        )}
                    </Tldraw>
                    {playbackState.isActive && (
                        <PlaybackControlBar 
                            isPlaying={playbackState.isPlaying}
                            currentTime={playbackState.currentTime}
                            duration={playbackState.duration}
                            onPlayPause={handlePlayPause}
                            onSeek={handleSeek}
                            onClose={readOnly ? undefined : handleClosePlayback}
                        />
                    )}
                </div>
            </Content>
            {!readOnly && (
                <PlaybackSidebar 
                    onPlay={handlePlay} 
                    onLoad={handleLoad}
                    onSave={handleSave}
                    onNew={handleNewWhiteboard}
                />
            )}
        </Layout>
    )
}

export default function WhiteboardApp() {
    return (
        <Provider store={store}>
            <WhiteboardContent />
        </Provider>
    )
}
