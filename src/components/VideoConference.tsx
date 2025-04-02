import React, { useEffect, useRef} from "react";
import { useParams } from "react-router-dom";

const VideoChat: React.FC = () => {
    const { room } = useParams();
    const socketRef = useRef<WebSocket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    //const pendingAnswerRef = useRef<RTCSessionDescriptionInit | null>(null);

    useEffect(() => {
        //if (socketRef.current) return; // Prevent multiple WebSocket instances

        // ✅ Create WebSocket Connection to the signaling server
        console.log("🌍 Creating WebSocket Connection...");
        // socketRef.current = new WebSocket(`ws://localhost:6969/ws/${room}`);
        socketRef.current = new WebSocket(`https://docsify-pw6s.onrender.com/ws/${room}`);
        const ws = socketRef.current;

        // ✅ Create PeerConnection once
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerConnectionRef.current = pc; // Store in ref immediately

        peerConnectionRef.current.onicecandidate = event => {
            if (event.candidate) {
                console.log("📤 Sending ICE Candidate:", event.candidate);
                ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
            } else {
                console.log("🚫 No more ICE candidates.");
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("🔄 ICE Connection State:", pc.iceConnectionState);
        };

        pc.ontrack = event => {
            console.log("🎥 Remote track received:", event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        ws.onmessage = async (event) => {
            console.log("📩 Received WebSocket message:", event.data);

            try {
                const data = JSON.parse(event.data);
                console.log("🔍 Parsed Message:", data);

                if (data.type === "offer") {
                    await handleReceivedOffer(data.offer);
                } else if (data.type === "answer") {
                    await handleReceivedAnswer(data.answer);
                } else if (data.type === "ice-candidate") {
                    console.log("🌍 ICE Candidate received:", data.candidate);
                    await handleReceivedIceCandidate(data.candidate);
                } else {
                    console.warn("⚠️ Unknown message type received:", data);
                }
            } catch (error) {
                console.error("❌ Failed to parse WebSocket message:", error);
            }
        };

        ws.onopen = () => {
            console.log("WebSocket connection opened");
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        return () => {
            ws.close();
            console.log("WebSocket Closed!");
        };
    }, []);

    const startCall = async () => {
        if (!peerConnectionRef.current) {
            console.error("❌ PeerConnection is not initialized!");
            return;
        }

        console.log("***startCall ", peerConnectionRef.current);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        // ✅ Attach tracks to the existing PeerConnection
        stream.getTracks().forEach(track => peerConnectionRef.current!.addTrack(track, stream));

        const offer = await peerConnectionRef.current!.createOffer();
        await peerConnectionRef.current!.setLocalDescription(offer);
        console.log("📤 Sending Offer:", JSON.stringify({ type: "offer", offer }));
        socketRef.current?.send(JSON.stringify({ type: "offer", offer }));

        console.log("📤 Offer Sent:", offer);
    };

    const handleReceivedOffer = async (offer: RTCSessionDescriptionInit) => {
        console.log("📩 Handling Received Offer:", offer);

        console.log("***handleReceivedOffer ", peerConnectionRef.current);

        if (!peerConnectionRef.current) {
            console.error("❌ PeerConnection is null!");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach(track => peerConnectionRef.current!.addTrack(track, stream));

        await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(offer));

        // ✅ Process pending ICE candidates after setting remote description
        while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
                await peerConnectionRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("✅ Added pending ICE candidate:", candidate);
            }
        }

        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);
        console.log("***Before Sending Answer: ", peerConnectionRef.current);
        console.log("📤 Sending Answer:", JSON.stringify({ type: "answer", answer }));

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "answer", answer }));
            console.log("📤 Answer Sent:", answer);
        } else {
            console.error("❌ WebSocket is not open. Cannot send answer.");
        }
    };

    

    const handleReceivedAnswer = async (answer: RTCSessionDescriptionInit) => {
        console.log("📩 Received answer:", answer);
        if (!peerConnectionRef.current) {
            console.error("❌ PeerConnection is null!");
            return;
        }

        try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("✅ Remote description set!");

            // 🔥 Process pending ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
                const candidate = pendingCandidatesRef.current.shift();
                if (candidate) {
                    console.log("🚀 Adding stored ICE candidate:", candidate);
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            }
        } catch (error) {
            console.error("❌ Failed to set remote description:", error);
        }
    };

    const handleReceivedIceCandidate = async (candidate: RTCIceCandidateInit) => {
        console.log("📩 Handling ICE candidate:", candidate);
        if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
            console.warn("⚠️ Remote description is null. Storing ICE candidate for later.");
            pendingCandidatesRef.current.push(candidate);
            return;
        }

        try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ ICE candidate added successfully!");
        } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
        }
    };

    return (
        <div style={{ textAlign: "center" }}>
          <h2>WebRTC Video Conference</h2>
          {/* <p>Your Peer ID: <strong>{peerId}</strong></p> */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "80%", maxWidth: "400px", border: "2px solid black" }} />
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "80%", maxWidth: "400px", border: "2px solid black" }} />
          </div>
          <button onClick={startCall}>Start Call</button>
        </div>
      );
};

export default VideoChat;
