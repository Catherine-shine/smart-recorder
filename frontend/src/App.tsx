import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WhiteboardApp from "./components/whiteboard/whiteboard";
import SharePage from "./pages/SharePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WhiteboardApp />} />
        <Route path="/share" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
