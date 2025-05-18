import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css'
import { Container, Row, Col } from 'react-bootstrap';

type USERS = {
  id: number;
  name: string;
  email: string;
}

const MAX_USERS = 5;

function App() {
  const [sessionKey, setSessionKey] = useState('');
  const [inputSessionKey, setInputSessionKey] = useState('');
  const [rooms, setRooms] = useState<any[]>([])
  const navigate = useNavigate();

  // function to generate Session Key
  const createSession = () => {
    const uniqueSessionKey = [...Array(12)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    setSessionKey(uniqueSessionKey);
    navigate(`/session/${uniqueSessionKey}`);
  };

  // function to join Session
  const joinSession = () => {
    if (inputSessionKey.length === 12) {
    navigate(`/session/${inputSessionKey}`);
    } else {
    alert("Invalid session key. It must be a 12-digit hex code.");
  }
  };

  return (
    <>
      <Container fluid className='d-flex flex-column justify-content-center align-items-center min-vh-100'>
        <Row>
          <Col>
            <h1>Docsify</h1>
          </Col>
        </Row>

        <Row className='px-5' style={{maxWidth: '70%'}}>
          <Col >
            <p>Pear to pear text editor and video call using websockets.</p>
          </Col>
        </Row>

        <Row>
          <Col>
            <button onClick={createSession}>Create Session</button>
            {sessionKey && <p>Session Key: #{sessionKey}</p>}
            <input 
              type="text" 
              placeholder="Enter session key" 
              value={inputSessionKey} 
              onChange={(e) => setInputSessionKey(e.target.value)} 
            />
            <button onClick={joinSession}>Join</button>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default App
