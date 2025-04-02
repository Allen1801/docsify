import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import './App.css'

function App() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([
    { id: 'room1', name: 'Room 1', isActive: false },
    { id: 'room2', name: 'Room 2',  isActive: false },
    { id: 'room3', name: 'Room 3', isActive: false }
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
      <h1>Docsify</h1>

      <p>Pear to pear text editor and video call using websockets.</p>

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
              <p>Status: {room.isActive ? 'Active 🟢' : 'Inactive 🔴'}</p>
              <button onClick={() => joinRoom(room.id)}>Join {room.name}</button>
            </div>
          ))}
      </div>
    </>
  )
}

export default App
