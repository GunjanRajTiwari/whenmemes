import "./App.css";
import Homepage from "./container/Homepage";
import MemeBoard from "./container/MemeBoard";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<Homepage />} />
				<Route path='/:room' element={<MemeBoard />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
