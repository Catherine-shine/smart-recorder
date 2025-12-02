"use client"
import { useMemo } from 'react'
import {
	DefaultToolbar,
	DrawToolbarItem,
	EraserToolbarItem,
	TextToolbarItem,
	SelectToolbarItem,
	Tldraw,
	TldrawUiMenuGroup,
	TLStore,
	useEditor,
	useValue
} from 'tldraw'
import { Provider } from 'react-redux'
import { store } from '../src/store/store'
import { useAppDispatch } from '../src/store/hooks'
import { addAction, setIsDrawing } from '../src/store/slices/whiteboardSlice'
import 'tldraw/tldraw.css'
import { useSyncDemo } from '@tldraw/sync'
import {useState} from 'react'
import { muti_components } from './muti_menu'
import './sync-custom-people-menu.css'

// 白板内容组件，用于与Redux集成
function WhiteboardContent() {
	const dispatch = useAppDispatch()

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
			...muti_components
		}
		
	}, [])

	// 处理白板变更事件，将操作数据发送到Redux store
	const handleStoreChange = (prevStore, nextStore) => {
		// 获取最近的变更操作
		const changes = nextStore.getChangesSince(prevStore)
		
		// 如果有变更，将其发送到Redux store
		if (changes.shapesCreated.length > 0 || changes.shapesUpdated.length > 0 || changes.shapesDeleted.length > 0) {
			// 为每个创建的形状创建操作记录
			changes.shapesCreated.forEach(shape => {
				let actionType = 'draw'
				
				// 根据形状类型确定操作类型
				if (shape.type === 'text') {
					actionType = 'text'
				}
				
				// 发送到Redux store
				dispatch(addAction({
					id: shape.id,
					type: actionType,
					data: shape,
					timestamp: Date.now()
				}))
			})
			
			// 处理删除操作（橡皮功能）
			changes.shapesDeleted.forEach(shape => {
				dispatch(addAction({
					id: shape.id,
					type: 'erase',
					data: { shapeId: shape.id },
					timestamp: Date.now()
				}))
			})
		}
	}

	// 处理工具变化事件，更新绘制状态
	const handleToolChange = (prevToolId, nextToolId) => {
		// 更新绘制状态
		dispatch(setIsDrawing(nextToolId === 'draw'))
	}
	// 多人协作设置
	const muti_store = useSyncDemo({roomId : "ginka"})

	return (
		<div className="tldraw__editor" style={{ position:'fixed', inset:'0' }}>
			<Tldraw 
				store={muti_store}
				components={components} 
				hideMenu
				hideZoomTool
				hidePanel
				hidePages
				onStoreChange={handleStoreChange}
				onToolChange={handleToolChange}
			/>
		</div>
	)
}

// 主应用组件，提供Redux Provider
export default function WhiteboardApp() {
	return (
		<Provider store={store}>
			<WhiteboardContent />
		</Provider>
	)
}
