import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PDF from './components/PDF.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PDF />} />
      </Routes>
    </Router>
  );
}

export default App;
