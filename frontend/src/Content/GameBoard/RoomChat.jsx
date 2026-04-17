import { useEffect, useRef } from 'react'

const formatChatTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const RoomChat = ({
  messages,
  userId,
  value,
  onChange,
  onSubmit,
  disabled,
  title = 'Chat de room',
}) => {
  const chatListRef = useRef(null)

  useEffect(() => {
    if (!chatListRef.current) {
      return
    }

    chatListRef.current.scrollTop = chatListRef.current.scrollHeight
  }, [messages])

  return (
    <aside className="game-board-chat-panel">
      <h3 className="game-board-chat-panel_title">{title}</h3>
      <div className="game-board-chat_list" ref={chatListRef}>
        {messages.map((message) => {
          const isOwnMessage = message.userId === userId
          const isSystemMessage = message.userId === null

          return (
            <div
              key={message.id}
              className={`game-board-chat_message ${
                isOwnMessage ? 'game-board-chat_message--own' : ''
              } ${isSystemMessage ? 'game-board-chat_message--system' : ''}`}
            >
              <div className="game-board-chat_header">
                <strong>{message.username}</strong>
                <span>{formatChatTime(message.createdAt)}</span>
              </div>
              <p>{message.text}</p>
            </div>
          )
        })}
      </div>
      <form className="game-board-chat_form" onSubmit={onSubmit}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ecrire un message..."
          maxLength={300}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !value.trim()}>
          Envoyer
        </button>
      </form>
    </aside>
  )
}

export default RoomChat
