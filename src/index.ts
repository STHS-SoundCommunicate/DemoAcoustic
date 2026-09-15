import TextWaver from "./TextWaver/TextWaver";
import {mfsk} from "./TextWaver/modules/mfsk.ts";
import {decodeUTF8} from "./TextWaver/utils.ts";
let stream: MediaStream;

let audioCtx: AudioContext;
let analyser: AnalyserNode;
let bufferLength: number;
let dataArray: Uint8Array<ArrayBuffer>;

const button = document.getElementById("listen")!;
const result = document.getElementById("result")!;
button.addEventListener("click", async function() {
	stream = await TextWaver.startRecord((e) => {
		if(stream === undefined || (!(e.data instanceof Array))) return;

		switch(e.data[0]) {
			case mfsk.PREAMBLE_DETECTED:
				result.innerText = "Preamble Detected";
				break;
			case mfsk.HEADER_CRC_CHECK_FAILED:
				result.innerText = "Header Check Failed";
				break;
			case mfsk.HEADER_CRC_CHECK_PASSED:
				result.innerText = "Header Check Passed";
				break;
			case mfsk.PAYLOAD_DETECTED:
				result.innerText = "Payload Detected";
				let str: string = decodeUTF8(e.data[1]);
				result.innerText = str;
				break;
			case mfsk.RS_DECODE_FAILED:
				result.innerText = "RS Decode Failed";
				break;
			default:
				result.innerText = "Unknown";
				break;
		}
	});


	console.log('called');
	button.innerText = "Recording...";
	audioCtx = new (window.AudioContext)({ sampleRate: 44100 });
	analyser = audioCtx.createAnalyser();
	bufferLength = analyser.frequencyBinCount;
	dataArray = new Uint8Array(bufferLength);
	const source: MediaStreamAudioSourceNode = audioCtx.createMediaStreamSource(stream);
	source.connect(analyser);
	visualize();
});

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d') as CanvasRenderingContext2D;
const WIDTH: number = canvas.width;
const HEIGHT: number = canvas.height;
canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
canvasCtx.fillStyle = "rgb(200, 200, 200)";
canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

function visualize(): void { // https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
	if(stream === undefined) return;
	requestAnimationFrame(visualize);
	// analyser.getByteTimeDomainData(dataArray); // 時間領域(db-t図)
	analyser.getByteFrequencyData(dataArray); // 周波数領域(db-f図)
	canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
	canvasCtx.fillStyle = "rgb(200, 200, 200)";
	canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

	drawFrequencyScale();

	canvasCtx.lineWidth = 2;
	canvasCtx.strokeStyle = "rgb(0, 0, 0)";
	canvasCtx.beginPath();
	const sliceWidth: number = WIDTH / bufferLength;
	let x: number = 0;
	for(let i: number = 0; i < bufferLength; ++i) {
		const v: number = dataArray[i] / 255;
		const y: number = HEIGHT - (v * HEIGHT);
		if(i === 0) canvasCtx.moveTo(x, y);
		else canvasCtx.lineTo(x, y);
		x += sliceWidth;
	}
	// canvasCtx.lineTo(WIDTH, HEIGHT / 2); // 中心線
	canvasCtx.stroke();
}

function drawFrequencyScale(): void {
	const nyquist: number = audioCtx.sampleRate / 2;
	const markerStepHz: number = 1000;
	const majorMarkerStepHz: number = 10000;

	canvasCtx.save();
	canvasCtx.fillStyle = "rgb(60, 60, 60)";

	for(let hz: number = 0; hz <= nyquist; hz += markerStepHz) {
		const x: number = hz / nyquist * WIDTH;
		const isMajorMarker: boolean = hz % majorMarkerStepHz === 0;

		canvasCtx.strokeStyle = isMajorMarker
			? "rgba(40, 40, 40, 0.7)"
			: "rgba(80, 80, 80, 0.3)";
		canvasCtx.lineWidth = isMajorMarker ? 2 : 1;

		canvasCtx.beginPath();
		canvasCtx.moveTo(x, 0);
		canvasCtx.lineTo(x, HEIGHT);
		canvasCtx.stroke();
	}
	canvasCtx.restore();
}