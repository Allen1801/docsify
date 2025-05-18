import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Peer, { MediaConnection } from "peerjs";
import { v4 as uuidv4 } from "uuid";
import { Container, Row, Col } from "react-bootstrap";

const VideoChat: React.FC = () => {
  const { room } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const [peers, setPeers] = useState<{ [id: string]: MediaConnection }>({});
  const [remotePeerIds, setRemotePeerIds] = useState<string[]>([]);
  const [localPeerId, setLocalPeerId] = useState<string>("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const sendMessage = (message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("📤 WS →", message);
      socketRef.current.send(message);
    } else {
      console.warn("⚠️ WS not open, drop →", message);
    }
  };

  const handleEndCall = () => {
    console.log("🔚 Ending call...");
  
    // Stop local media tracks and clear references
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
  
    // Clear local video element
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
    }
  
    // Close and clear all remote peer connections and their video elements
    Object.entries(peers).forEach(([peerId, conn]) => {
      try {
        conn.close();
      } catch (e) {
        console.warn("❌ Failed to close connection", e);
      }
  
      const remoteVideoEl = videoRefs.current[peerId];
      if (remoteVideoEl) {
        remoteVideoEl.pause();
        remoteVideoEl.srcObject = null;
      }
    });
  
    // Destroy PeerJS
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  
    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  
    // Clear React state
    setPeers({});
    setRemotePeerIds([]);
    setLocalPeerId("");
  
    // Clear video refs
    videoRefs.current = {};
  
    // Navigate out
    const countKey = `${room ?? ''}_count`;
    const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10);
    localStorage.setItem(countKey, (currentCount-1).toString());
    localStorage.setItem(room ?? '', 'false');
    localStorage.removeItem("Current Room");
    navigate('/');

  };

  useEffect(() => {
    const ws = new WebSocket(`https://docsify-pw6s.onrender.com/ws/${room}`);
    socketRef.current = ws;

    ws.onopen = () => console.log("✅ WS connected");
    ws.onerror = e => console.error("🛑 WS error", e);
    ws.onclose = () => console.log("❌ WS closed");

    const myPeerId = uuidv4(); // 🎯 custom UUID
    const peer = new Peer(myPeerId, {
      host: "https://docsify-pw6s.onrender.com",
      port: 9000,
      path: "/peerjs",
      debug: 3,
    });
    peerRef.current = peer;

    peer.on("open", id => {
      console.log("✅ PeerJS open:", id);
      setLocalPeerId(id);
      sendMessage(JSON.stringify({ type: "join", room, peerId: id }));
    });

    peer.on("call", call => {
      console.log("📞 peer.on('call') from", call.peer);
    
      const waitForLocalStream = () => {
        if (localStreamRef.current) {
          console.log("✅ Local stream available, answering call from", call.peer);
          call.answer(localStreamRef.current);
    
          call.on("stream", remoteStream => {
            console.log("📡 peer.on('stream') from", call.peer);
            attachStream(call.peer, remoteStream);
          });
    
          call.on("error", err => console.error("🛑 incoming call err", err));
          setPeers(prev => ({ ...prev, [call.peer]: call }));
          setRemotePeerIds(ids => Array.from(new Set([...ids, call.peer])));
        } else {
          console.warn("⚠️ Waiting for local stream to answer call from", call.peer);
          setTimeout(waitForLocalStream, 200);
        }
      };
    
      waitForLocalStream();
    });
    

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(console.warn);
        }

        ws.onmessage = ev => {
          const msg = JSON.parse(ev.data);
          const { type, from } = msg;
          console.log("📩 WS ←", msg);

          if (type !== "new-user") return;

          if (!peerRef.current || from === peerRef.current.id) {
            console.log("⏭ ignoring self");
            return;
          }

          const isAlreadyCalling = Object.keys(peerRef.current.connections || {}).includes(from);
          if (isAlreadyCalling) {
            console.log("⏭ already connected to", from);
            return;
          }

          console.log("📞 calling new-peer", from);
          const call = peerRef.current.call(from, stream);
          call.on("stream", remoteStream => {
            console.log("📡 outbound call stream from", from);
            attachStream(from, remoteStream);
          });
          call.on("error", err => console.error("🛑 outgoing call err", err));
          call.on("close", () => console.log("❌ call closed with", from));

          setPeers(prev => ({ ...prev, [from]: call }));
          setRemotePeerIds(ids => Array.from(new Set([...ids, from])));
        };
      })
      .catch(err => console.error("🛑 getUserMedia failed:", err));

    return () => {
      console.log("🧹 cleanup");
      peerRef.current?.destroy();
      ws.close();
    };
  }, [room]);

  const attachStream = (peerId: string, stream: MediaStream) => {
    const tryAttach = () => {
      const videoEl = videoRefs.current[peerId];
      if (videoEl) {
        console.log("🎥 attachStream for", peerId);
        videoEl.srcObject = stream;
        videoEl.play().catch(console.warn);
      } else {
        setTimeout(tryAttach, 200);
      }
    };
    tryAttach();
  };

  return (
    <Container>
      <Row>
        <Col className="d-flex flex-column align-items-center">
          <p>My PeerID: {localPeerId}</p>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            style={{ width: "30%", border: "2px solid green" }}
          />
        </Col>
      </Row>

      <Row className="text-center">
        <Col>
        <button onClick={handleEndCall} className="btn btn-danger">
          End Call 
        </button>
        </Col>
      </Row>

      <Row>
        {remotePeerIds.map((peerId) => (
        <Col xs={12} sm={6} md={4} lg={3} className="mb-4" key={peerId}>
          <p>PeerID: {peerId}</p>
          <video
            ref={(el) => {
              videoRefs.current[peerId] = el;
            }}
            autoPlay
            playsInline
            style={{ width: "100%", border: "2px solid red" }}
          />
      </Col>
    ))}
      </Row>
    </Container>
  );
};

export default VideoChat;
