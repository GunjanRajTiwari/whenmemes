import styles from "./Homepage.module.css";
import socket from "../util/socket";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
	const navigate = useNavigate();

	const handleCreateRoom = () => {
		socket.emit("room.create", response => {
			if (response && response.roomId) {
				navigate("/" + response.roomId);
			} else {
				alert("Failed to create room.");
			}
		});
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1 className={styles.title}>When Memes</h1>
				<div className={styles.inner}>
					<button onClick={handleCreateRoom}>Create Room</button>
				</div>
			</div>
		</div>
	);
};

export default Homepage;
