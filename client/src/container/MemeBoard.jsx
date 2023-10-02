import styles from "./MemeBoard.module.css";
import socket from "../util/socket";
import { useEffect, useRef, useState } from "react";
import characters from "../constant/characters";
import memeList from "../constant/memeList";
import {
	randomIndex,
	randomUniqueIndices,
} from "../util/randomGenerators";
import { GAME_STAGE } from "../constant/common";

const findWinner = players => {
	let winner = null;
	let score = -1;
	players.forEach(p => {
		if (p.score > score) {
			winner = p.socketId;
			score = p.score;
		}
	});
	return winner;
};

const MemeBoard = () => {
	const [stage, setStage] = useState(GAME_STAGE.LOBBY);
	const [ready, setReady] = useState(false);
	const [copyText, setCopyText] = useState("Copy");
	const [room, setRoom] = useState("new room");
	const roomId = window.location.pathname.slice(1);
	const nickname = useRef(characters[randomIndex(characters.length)]);
	const [memePrompt, setMemePrompt] = useState("");
	const [myChoice, setMyChoice] = useState(null);
	const [myVote, setMyVote] = useState(null);
	const [leader, setLeader] = useState(null);

	useEffect(() => {
		let value = prompt("Enter Nickname", nickname.current);
		if (!!value) {
			nickname.current = value;
		}
		socket.emit("room.join", roomId, nickname.current, response => {
			setRoom(() => response);
		});
	}, []);

	useEffect(() => {
		socket.on("room.changed", response => {
			setRoom(() => response);
		});

		socket.on("room.start", response => {
			setRoom(() => response);
			setMyChoice(null);
			console.log("start", response);
			if (response.players[response.turn].socketId == socket.id) {
				setStage(GAME_STAGE.PROMPT);
			} else {
				setStage(GAME_STAGE.WAIT);
			}
		});

		socket.on("room.prompt", response => {
			setMemePrompt(response);
			setStage(GAME_STAGE.CHOOSE);
		});

		socket.on("room.vote", response => {
			setRoom(() => response);
			setStage(GAME_STAGE.VOTE);
		});

		socket.on("room.gameover", response => {
			setRoom(() => response);
			setMyChoice(null);
			setMyVote(null);
			setLeader(findWinner(response.players));
			setReady(false);
			setMemePrompt(null);
			setStage(GAME_STAGE.LOBBY);
		});

		return () => {
			socket.off("room.changed");
			socket.off("room.start");
			socket.off("room.prompt");
			socket.off("room.vote");
			socket.off("room.gameover");
		};
	}, [room]);

	const linkCopyHandler = () => {
		window.navigator.clipboard.writeText(
			window.location.origin + "/" + roomId
		);
		setCopyText("👍");
		setTimeout(() => {
			setCopyText("Copy");
		}, 2000);
	};

	const readyHandler = state => {
		setReady(state);
		socket.emit("player.ready", roomId, state);
	};

	const submitPromptHandler = () => {
		if (memePrompt.length < 8) {
			alert("Prompt too short!");
			return;
		}
		socket.emit("room.prompt.post", roomId, memePrompt);
	};

	const handleImageChoice = image => {
		socket.emit("room.choice.post", roomId, image, () => {
			setMyChoice(image);
			setStage(GAME_STAGE.WAIT);
		});
	};

	const handleVote = (player, image) => {
		socket.emit("room.vote.post", roomId, player, () => {
			setMyVote(image);
		});
	};

	return (
		<div>
			<div className={styles.header}>
				<h1>When Memes</h1>
				<div className={styles.link}>
					<input
						type='text'
						disabled
						value={window.location.origin + "/" + roomId}
					/>
					<button onClick={linkCopyHandler}>{copyText}</button>
				</div>
			</div>
			<div className={styles.main}>
				<div className='sidebar'>
					{stage === GAME_STAGE.LOBBY ? (
						<>
							{ready ? (
								<button
									onClick={() => readyHandler(false)}>
									Not Ready
								</button>
							) : (
								<button onClick={() => readyHandler(true)}>
									Ready
								</button>
							)}
						</>
					) : (
						<p>Score</p>
					)}
					<div className='leaerboard'>
						{room?.players?.map(player => (
							<div
								key={player.socketId}
								className={`${styles.player} ${
									player.ready && styles.ready
								} ${
									player.socketId === socket.id &&
									styles.me
								} ${
									player.socketId === leader &&
									styles.leader
								}`}>
								<p className={styles.nickname}>
									{player.nickname}
								</p>
								<small>{player.score} pts</small>
							</div>
						))}
					</div>
				</div>
				<div className={styles.gameboard}>
					<h2>{memePrompt}</h2>
					{!!myChoice && (
						<img
							src={memeList[myChoice].url}
							className={styles.memeSmall}
						/>
					)}
					<div>
						{stage === GAME_STAGE.LOBBY && (
							<div>Waiting for Players to be ready!</div>
						)}
						{stage === GAME_STAGE.WAIT && (
							<div>Waiting ...</div>
						)}
						{stage === GAME_STAGE.PROMPT && (
							<div>
								<input
									onChange={e =>
										setMemePrompt(e.target.value)
									}
									type='text'
									placeholder='When you ...'
								/>
								<button onClick={submitPromptHandler}>
									Meme
								</button>
							</div>
						)}
						{stage === GAME_STAGE.CHOOSE && (
							<div className={styles.memeList}>
								{randomUniqueIndices(
									memeList.length,
									6
								).map(idx => {
									return (
										<img
											className={styles.meme}
											key={idx}
											src={memeList[idx].url}
											onClick={() =>
												handleImageChoice(idx)
											}
										/>
									);
								})}
							</div>
						)}
						{stage === GAME_STAGE.VOTE && (
							<>
								<h2 className={styles.center}>Vote</h2>
								{!!myVote && (
									<img
										src={memeList[myVote].url}
										className={styles.memeSmall}
									/>
								)}
								{!myVote && (
									<div className={styles.memeList}>
										{room.players.map(
											player =>
												player.choice &&
												player.socketId !=
													socket.id && (
													<img
														className={
															styles.meme
														}
														key={
															player.socketId
														}
														src={
															memeList[
																player
																	.choice
															].url
														}
														onClick={() =>
															handleVote(
																player.socketId,
																player.choice
															)
														}
													/>
												)
										)}
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MemeBoard;
