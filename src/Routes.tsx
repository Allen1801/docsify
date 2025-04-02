import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import SessionPage from './components/SessionPage';

function Main() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/:room" element={<SessionPage />} />
        </Routes>
      </Router>
    );
  }
  
export default Main;
  