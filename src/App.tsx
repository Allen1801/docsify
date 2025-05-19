import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import './App.css'
import { Container, Row, Col } from 'react-bootstrap';


function App() {
  const [sessionKey, setSessionKey] = useState('');
  const [inputSessionKey, setInputSessionKey] = useState('');
  const navigate = useNavigate();

  const createSession = () => {
    const uniqueSessionKey = [...Array(12)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    setSessionKey(uniqueSessionKey);
    navigate(`/session/${uniqueSessionKey}`);
  };

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
