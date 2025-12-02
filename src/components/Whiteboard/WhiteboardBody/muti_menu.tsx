// 多人同步自定义菜单
import { useSyncDemo } from "@tldraw/sync";
import {Tldraw, useEditor, useValue} from 'tldraw'
import "tldraw/tldraw.css"
import "./sync-custom-people-menu.css"

export const muti_components = {
    // 使用Tldraw支持的自定义面板组件名称
    Panel: () => (
        <div className="muti_share_zone" draggable={false}>
            <CustomPeopleMenu />
        </div>
    ),
}

function CustomPeopleMenu() {
	const editor = useEditor()

	// [a]
	const myUserColor = useValue('user', () => editor.user.getColor(), [editor])
	const myUserName = useValue('user', () => editor.user.getName() || 'Guest', [editor])
	const myUserId = useValue('user', () => editor.user.getId(), [editor])

	// [b]
	const allOtherPresences = useValue('presences', () => editor.getCollaborators(), [editor])

	return (
		<div className="custom-people-menu">

			<div className="user-section">
				<h4 className="section-title">Me</h4>
				<div className="user-info">
					<div className="user-avatar" style={{ background: myUserColor }} />
					<span className="user-name" style={{ color: myUserColor }}>
						{myUserName}, ID: {myUserId}
					</span>
				</div>
			</div>


			{allOtherPresences.length > 0 && (
				<div className="other-users-section">
					<h4 className="section-title">Other connected users:</h4>
					<div className="other-users-list">
						{allOtherPresences.map(({ userId, userName, color, cursor }) => (
							<div key={userId} className="other-user-item">
								<div className="other-user-avatar" style={{ background: color }} />
								<span className="other-user-name" style={{ color: color }}>
									{userName || `ID: ${userId}`}
								</span>
								<span className="cursor-info">
									Cursor
									<br />
									{cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y)
										? `(${Math.round(cursor.x)}, ${Math.round(cursor.y)})`
										: 'cursor data unavailable'}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}