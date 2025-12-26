import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PDF from './components/PDF.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PDF />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
