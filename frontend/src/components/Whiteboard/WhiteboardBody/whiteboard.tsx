"use client"
import { useMemo, useCallback, useEffect } from 'react'
import {
	DefaultToolbar,
	DrawToolbarItem,
	EraserToolbarItem,
	TextToolbarItem,
	SelectToolbarItem,
	Tldraw,
	TldrawUiMenuGroup,
	type TLStore,
	useEditor,
	useValue
} from 'tldraw'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { addAction, setIsDrawing } from '../../../store/slices/whiteboardSlice'
import { useRecordingScheduler } from '../../../utils/recording/RecordingScheduler'; // 核心Hook

import 'tldraw/tldraw.css'
import { useSyncDemo } from '@tldraw/sync'
import { muti_components } from './muti_menu'
import './sync-custom-people-menu.css'

// 白板内容组件，用于与Redux集成
function WhiteboardContent() {
	const dispatch = useAppDispatch()
	// 获取当前主题
	const { theme } = useAppSelector(state => state.layout)
	// 从录制Hook中解构：收集数据方法 + 录制状态
	const { 
		recordingStatus, 
		collectWhiteboardData, 
		collectMouseData 
	} = useRecordingScheduler();

	// 优化：抽离白板数据收集逻辑（复用 + 仅录制中执行）
	const collectSingleWhiteboardAction = useCallback((shape: any, actionType: 'draw' | 'erase' | 'text' | 'select') => {
		// 1. 原有逻辑：存入whiteboardSlice
		dispatch(addAction({
			id: shape.id,
			type: actionType,
			data: shape.type === 'erase' ? { shapeId: shape.id } : shape,
			timestamp: Date.now()
		}));
		
		// 2. 新增逻辑：仅录制中，存入recordingSlice的collectedData
		// console.log('collectSingleWhiteboardAction:', actionType, 'status:', recordingStatus);
		if (recordingStatus === 1) { // 匹配RECORDING_STATUS.RECORDING的值
			console.log('Collecting whiteboard data:', shape.id);
			collectWhiteboardData({
				id: shape.id,
				type: actionType,
				data: shape.type === 'erase' ? { shapeId: shape.id } : shape,
				timestamp: Date.now()
			});
		}
	}, [dispatch, recordingStatus, collectWhiteboardData]);

	// 处理白板变更事件（核心：同时同步到whiteboardSlice和recordingSlice）
	const handleStoreChange = useCallback((prevStore: TLStore, nextStore: TLStore) => {
		const changes = (nextStore as any).getChangesSince(prevStore);
		
		if (changes.shapesCreated.length > 0 || changes.shapesUpdated.length > 0 || changes.shapesDeleted.length > 0) {
			// 处理创建/更新的形状
			changes.shapesCreated.forEach((shape: any) => {
				let actionType: 'draw' | 'text' | 'select' = 'draw';
				if (shape.type === 'text') actionType = 'text';
				collectSingleWhiteboardAction(shape, actionType);
			});
			
			// 处理删除/擦除的形状
			changes.shapesDeleted.forEach((shape: any) => {
				collectSingleWhiteboardAction(shape, 'erase');
			});
		}
	}, [collectSingleWhiteboardAction]);

	// 处理工具变化事件，更新绘制状态
	const handleToolChange = useCallback((prevToolId: string, nextToolId: string) => {
		dispatch(setIsDrawing(nextToolId === 'draw'));
	}, [dispatch]);

	// 监听鼠标移动：仅录制中收集鼠标轨迹数据
	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (recordingStatus !== 1) return;
		collectMouseData({
			x: e.clientX,
			y: e.clientY,
			timestamp: Date.now()
		});
	}, [recordingStatus, collectMouseData]);

	// 多人协作设置
	const muti_store = useSyncDemo({roomId : "ginka"});

	// 创建一个自定义组件，在Tldraw内部使用useEditor
	const EditorHooks = () => {
		// 获取编辑器实例
		const editor = useEditor();

		// 使用 editor.store.listen 监听变化
		useEffect(() => {
			const cleanup = editor.store.listen((event) => {
				const { changes } = event;
				
				// 处理新增的形状
				Object.values(changes.added).forEach((record: any) => {
					if (record.typeName === 'shape') {
						let actionType: 'draw' | 'text' | 'select' = 'draw';
						if (record.type === 'text') actionType = 'text';
						collectSingleWhiteboardAction(record, actionType);
					}
				});

				// 处理更新的形状
				Object.values(changes.updated).forEach((change: any) => {
					const [from, to] = change;
					if (to.typeName === 'shape') {
						let actionType: 'draw' | 'text' | 'select' = 'draw';
						if (to.type === 'text') actionType = 'text';
						collectSingleWhiteboardAction(to, actionType);
					}
				});

				// 处理删除的形状
				Object.values(changes.removed).forEach((record: any) => {
					if (record.typeName === 'shape') {
						collectSingleWhiteboardAction(record, 'erase');
					}
				});
			});

			return () => cleanup();
		}, [editor, collectSingleWhiteboardAction]);
		
		// 用useValue监听工具变化
		useValue('tool-change', () => {
			const currentTool = editor.getCurrentToolId();
			handleToolChange('', currentTool);
		}, [handleToolChange, editor]);

		return null;
	};

	// 合并工具条组件和多人同步菜单组件
	const components = useMemo(() => {
		return {
			// 自定义工具栏
			Toolbar: () => (
				<DefaultToolbar orientation="horizontal">
					<TldrawUiMenuGroup id="basic-tools">
						<SelectToolbarItem />
						<DrawToolbarItem />
						<EraserToolbarItem />
						<TextToolbarItem />
					</TldrawUiMenuGroup>
				</DefaultToolbar>
			),
			// 集成多人同步菜单
			...muti_components,
			// 添加自定义Hooks组件
			EditorHooks
		}
	}, [handleStoreChange, handleToolChange]);

	return (
		<div 
			className="tldraw__editor" 
			style={{ 
				width: '100%', 
				height: '100%',
				overflow: 'visible',
				position: 'relative'
			}}
			onMouseMove={handleMouseMove} // 监听鼠标轨迹
		>
			<Tldraw 
				store={muti_store} // 取消注释即可恢复多人协作（需解决图片上传问题）
				components={components}
				className={theme === 'dark' ? 'tl-theme__dark' : ''}
				// 兜底：同时绑定onStoreChange确保兼容性
				// onStoreChange 已弃用，改为通过 useValue 监听 store 变化
			/>
		</div>
	)
}

// 主应用组件
export default function WhiteboardApp() {
	return (
		<WhiteboardContent />
	)
}