import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import './App.css'

function App() {
  const [sessionKey, setSessionKey] = useState('');
  const [inputSessionKey, setInputSessionKey] = useState('');
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([
    { id: 'room1', name: 'Room 1', host: 'Jerico Salenga', isActive: false },
    { id: 'room2', name: 'Room 2', host: 'Jerico Salenga', isActive: false },
    { id: 'room3', name: 'Room 3', host: 'Jerico Salenga', isActive: false }
  ]);

  // const createSession = () => {
  //   const uniqueSessionKey = [...Array(12)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  //   setSessionKey(uniqueSessionKey);
  //   navigate(`/session/${uniqueSessionKey}`);
  // };

  // const joinSession = () => {
  //   if (inputSessionKey.length === 12) {
  //     navigate(`/session/${inputSessionKey}`);
  //   } else {
  //     alert("Invalid session key. It must be a 12-digit hex code.");
  //   }
  // };

  useEffect(() => {
    const updateRooms = rooms.map(room => ({
      ...room,
      isActive: localStorage.getItem(room.id) === 'true'
    }));
    setRooms(updateRooms);
  }, []);

  const joinRoom = (roomid: string) => {
    localStorage.setItem(roomid, 'true')
    localStorage.setItem("Current Room", roomid)
    navigate(`/${roomid}`);

  }

  return (
    <>
      <h1>Vision Drafter</h1>

      <p>Auto Drafter is an advanced document automation tool specifically designed for law firms and legal professionals. 
        It streamlines the process of generating various legal documents, such as letters, judicial affidavits, pleadings, 
        and other necessary filings. By utilizing templates and customizable fields, Auto Drafter enhances efficiency, 
        reduces errors, and saves time for legal practitioners.</p>

      {/* <div className="card">
        <button onClick={createSession}>Create Session</button>
        {sessionKey && <p>Session Key: #{sessionKey}</p>}
        <input 
          type="text" 
          placeholder="Enter session key" 
          value={inputSessionKey} 
          onChange={(e) => setInputSessionKey(e.target.value)} 
        />
        <button onClick={joinSession}>Join</button>
      </div> */}

      <div className="card">
        {rooms.map(room => (
            <div className="card-container" key={room.id}>
              <h4>{room.name}</h4>
              <p>{room.host}</p>
              <p>Status: {room.isActive ? 'Active 🟢' : 'Inactive 🔴'}</p>
              <button onClick={() => joinRoom(room.id)}>Join {room.name}</button>
            </div>
          ))}
      </div>
    </>
  )
}

export default App
