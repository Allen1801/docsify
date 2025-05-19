import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import "./css/Chat.css";

interface Message {
  id: number;
  text: string;
  sender: string;
}

const ydoc = new Y.Doc(); // Ensure this is shared across all users

const ChatSidebar: React.FC = () => {
  const { room } = useParams(); // Get session key from URL
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  
  // WebSocket provider (Ensures persistence)
  const provider = new WebsocketProvider("https://docsify-pw6s.onrender.com", room ?? "default-room", ydoc);
  const yArray = ydoc.getArray<Message>("chat");

  useEffect(() => {
    if (!room) return;

    const updateMessages = () => setMessages([...yArray.toArray()]);
    yArray.observeDeep(updateMessages); // Listen for changes

    return () => provider.disconnect(); // Cleanup WebSocket
  }, [room]);

  const sendMessage = () => {
    if (input.trim() && username.trim()) {
      yArray.push([{ id: Date.now(), text: input, sender: username }]);
      setInput("");
    }
  };

  return (
    <>
      <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close Chat" : "Open Chat"}
      </button>

      <div className={`chat-sidebar ${isOpen ? "open" : ""}`}>
        <div className="chat-header">
          <h2>Chat - Session {room}</h2>
          <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✖</button>
        </div>

        {/* Username Input */}
        <div className="chat-username">
          <input
            type="text"
            placeholder="Enter your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.sender === username ? "sent" : "received"}`}>
              <div className="message-bubble">
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="chat-send-btn" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
