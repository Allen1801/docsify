import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { useParams } from 'react-router-dom';

const QuillEditor: React.FC = () => {
  const { room } = useParams<{ room: string }>(); // Get room ID from URL
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillInstance = useRef<Quill | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!editorContainerRef.current || quillInstance.current) return;

    // Initialize Quill editor
    const editorElement = document.createElement('div');
    editorContainerRef.current.innerHTML = ''; // Clear any existing elements
    editorContainerRef.current.appendChild(editorElement);

    quillInstance.current = new Quill(editorElement, {
      theme: 'snow',
      placeholder: 'Start typing...',
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean']
        ]
      }
    });

    // Initialize WebSocket connection for signaling
    const signalingSocket = new WebSocket('https://docsify-pw6s.onrender.com/ws/${room}');
    setSocket(signalingSocket);

    signalingSocket.onopen = () => {
      console.log('Connected to signaling server');
      signalingSocket.send(JSON.stringify({ type: 'join', room }));
    };

    signalingSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'offer') {
        // Handle incoming offer
        const pc = new RTCPeerConnection();
        setPeerConnection(pc);

        const channel = pc.createDataChannel('text');
        setDataChannel(channel);

        channel.onmessage = (e) => {
          console.log('Received text:', e.data);
          quillInstance.current?.setText(e.data); // Update Quill editor
        };

        // Set remote offer and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer back to peer
        signalingSocket.send(JSON.stringify({ type: 'answer', answer }));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            signalingSocket.send(
              JSON.stringify({ type: 'candidate', candidate: event.candidate })
            );
          }
        };
      }

      if (message.type === 'answer') {
        // Handle incoming answer
        const pc = peerConnection;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        }
      }

      if (message.type === 'candidate') {
        // Handle ICE candidates
        const pc = peerConnection;
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      }
    };

    // Send text data via the data channel when it's updated in the Quill editor
    const sendTextToPeer = () => {
      const text = quillInstance.current?.getText() || '';
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(text);
      }
    };

    quillInstance.current?.on('text-change', sendTextToPeer);

    // Cleanup when component unmounts
    return () => {
      signalingSocket.close();
      if (peerConnection) peerConnection.close();
    };
  }, [room]);

  return (
    <div ref={editorContainerRef} style={{ height: '80vh', width: '100%' }} />
  );
};

export default QuillEditor;