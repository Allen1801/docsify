import { useParams, useNavigate } from "react-router-dom";
import QuillEditor from "./QuillEditor";
import VideoConference from "./VideoConference";
import ChatSidebar from "./Chat"; 
import AiChatSidebar from "./AiChat";
import "./css/SessionPage.css";
import { useEffect, useState } from "react";

function SessionPage() {
  const navigate = useNavigate();
  const { room } = useParams();


  useEffect(() => {
    if(room){
      localStorage.setItem(room, 'true');

    }
  }, [room]);


  const leaveRoom = () => {
    if(room){
      localStorage.setItem(room, 'false');
      localStorage.removeItem("Current Room");
      navigate('/')
    }
  }
  return (
    <div className="session-page">
      <h1>Session Page</h1>
      <p>Welcome to <strong>{room}</strong></p>

      <div className="session-container">
        <div className="editor-container">
          <QuillEditor />
        </div>

        <div className="video-container">
          <VideoConference  />
          
        </div>
        
      </div>

      {/* ChatSidebar at the Root Level */}
      <ChatSidebar />
      {/* <AiChatSidebar /> */}
      <button onClick={() => leaveRoom()}>Leave Room</button>
    </div>
  );
}

export default SessionPage;
