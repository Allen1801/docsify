import React, { useEffect, useRef } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useParams } from "react-router-dom";

import "quill/dist/quill.snow.css"; // Import Quill styles

const QuillEditor: React.FC = () => {
  const { room } = useParams(); // Get session key from URL
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillInstance = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorContainerRef.current || quillInstance.current) return;

    // Create a Yjs document
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider("wss://docsify-pw6s.onrender.com", room || "default", ydoc);
    const ytext = ydoc.getText("quill");

    // Create a new editor only if not already initialized
    const editorElement = document.createElement("div");
    editorContainerRef.current.innerHTML = ""; // Clear any existing elements
    editorContainerRef.current.appendChild(editorElement);

    quillInstance.current = new Quill(editorElement, {
      theme: "snow",
      placeholder: "Start typing...",
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"]
        ]
      }
    });

    new QuillBinding(ytext, quillInstance.current, provider.awareness);

    return () => {
      provider.destroy();
      ydoc.destroy();
      quillInstance.current = null;
    };
  }, [room]);

  return (
    <div ref={editorContainerRef} style={{ height: "80vh", width: "100%" }} />
  );
};

export default QuillEditor;
