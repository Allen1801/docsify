import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from '../App';
import SessionPage from '../components/SessionPage';


function Main() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/session/:room" element={<SessionPage />} />
        </Routes>
      </Router>
    );
  }
  
export default Main;
  