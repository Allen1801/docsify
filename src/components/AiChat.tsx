import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import "./css/AiChat.css";

interface Message {
  id: number;
  text: string;
  sender: string;
}

const ydoc = new Y.Doc(); // Ensure this is shared across all users

const AiChatSidebar: React.FC = () => {
  const { sessionKey } = useParams(); // Get session key from URL
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");

  // WebSocket provider (Ensures persistence)
  const provider = new WebsocketProvider("ws://localhost:1234", sessionKey ?? "default-room", ydoc);
  const yArray = ydoc.getArray<Message>("ai-chat"); // Use a different array name for AI chat

  useEffect(() => {
    if (!sessionKey) return;

    const updateMessages = () => setMessages([...yArray.toArray()]);
    yArray.observeDeep(updateMessages); // Listen for changes

    return () => provider.disconnect(); // Cleanup WebSocket
  }, [sessionKey]);

  const sendMessage = async () => {
    if (input.trim() && username.trim()) {
      const message: Message = { id: Date.now(), text: input, sender: username };
      yArray.push([message]);

      // Send message to backend
      try {
        const response = await fetch("http://127.0.0.1:5173/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: input, model: "deepseek-r1:32b" }),
        });
        const data = await response.json();
        const aiMessage: Message = { id: Date.now() + 1, text: data.response, sender: "AI" };
        yArray.push([aiMessage]);
      } catch (error) {
        console.error("Error sending message to backend:", error);
      }

      setInput("");
    }
  };

  return (
    <>
      <button className="aichat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close AI Chat" : "Open AI Chat"}
      </button>

      <div className={`aichat-sidebar ${isOpen ? "open" : ""}`}>
        <div className="aichat-header">
          <h2>AI Chat - Session #{sessionKey}</h2>
          <button className="aichat-close-btn" onClick={() => setIsOpen(false)}>✖</button>
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
        <div className="aichat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`aichat-message ${msg.sender === username ? "sent" : "received"}`}>
              <div className="message-bubble">
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="aichat-input-container">
          <input
            type="text"
            className="aichat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="aichat-send-btn" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default AiChatSidebar;
