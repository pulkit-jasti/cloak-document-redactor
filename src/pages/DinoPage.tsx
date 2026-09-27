import ChromeDinoGame from '@a7mddra/react-dino-game';
import '@a7mddra/react-dino-game/dist/style.css';

export default function DinoPage() {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="w-150">
				<ChromeDinoGame />
			</div>
		</div>
	);
}
