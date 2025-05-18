import { useParams, } from "react-router-dom";
import QuillEditor from "./Quill/QuillEditor";
import VideoConference from "./VideoConference/VideoConference";

// import ChatSidebar from "./Chat"; 
// import AiChatSidebar from "./AiChat";
// import "./css/SessionPage.css";
import { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";

function SessionPage() {
  // const navigate = useNavigate();
  const { room } = useParams();


  useEffect(() => {
    if(room){
      localStorage.setItem(room, 'true');

    }
  }, [room]);


  // const leaveRoom = () => {
  //   if(room){
  //     localStorage.setItem(room, 'false');
  //     localStorage.removeItem("Current Room");
  //     navigate('/')
  //   }
  // }
  return (
    <Container fluid>
      <Row className="pt-3">
        <Col md={6}>
          <h1>Session Room <span className="badge bg-primary fs-6">Room: {room}</span></h1>
          <QuillEditor/>
        </Col>
        <Col md={6}>
        <VideoConference/>
        </Col>
      </Row>
    </Container>
  );
}

export default SessionPage;
