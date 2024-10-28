import getBlobDuration from 'get-blob-duration';

import { RecordingStatus } from './definitions';
import type { Base64String, CurrentRecordingStatus, GenericResponse, HelloWorldResponse, RecordingData } from './definitions';
import {
	alreadyRecordingError,
	couldNotQueryPermissionStatusError,
	deviceCannotVoiceRecordError,
	emptyRecordingError,
	failedToFetchRecordingError,
	failedToRecordError,
	failureResponse,
	missingPermissionError,
	recordingHasNotStartedError,
	successResponse,
} from './predefined-web-responses';
import type { VoiceRecorderWeb } from './web';

// these mime types will be checked one by one in order until one of them is found to be supported by the current browser
const possibleMimeTypes = ['audio/aac', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
const neverResolvingPromise = (): Promise<any> => new Promise(() => undefined);

export class VoiceRecorderImpl {

	private recordTime = 0;
	private timerInterval: NodeJS.Timeout | null = null;
	private mediaRecorder: MediaRecorder | null = null;
	private chunks: any[] = [];
	private pendingResult: Promise<RecordingData> = neverResolvingPromise();
	private plugin:VoiceRecorderWeb;

	constructor(plugin:VoiceRecorderWeb) {
		this.plugin = plugin
	}

	public static async canDeviceVoiceRecord(): Promise<GenericResponse> {
		if (navigator?.mediaDevices?.getUserMedia == null || VoiceRecorderImpl.getSupportedMimeType() == null) {
			return failureResponse();
		} else {
			return successResponse();
		}
	}

	public async startRecording(): Promise<GenericResponse> {
		if (this.mediaRecorder != null) {
			throw alreadyRecordingError();
		}
		const deviceCanRecord = await VoiceRecorderImpl.canDeviceVoiceRecord();
		if (!deviceCanRecord.value) {
			throw deviceCannotVoiceRecordError();
		}
		const havingPermission = await VoiceRecorderImpl.hasAudioRecordingPermission().catch(() => successResponse());
		if (!havingPermission.value) {
			throw missingPermissionError();
		}

		return navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(this.onSuccessfullyStartedRecording.bind(this))
			.catch(this.onFailedToStartRecording.bind(this));
	}

	public async stopRecording(): Promise<RecordingData> {
		if (this.mediaRecorder == null) {
			throw recordingHasNotStartedError();
		}
		try {
			this.mediaRecorder.stop();
			this.stopTimer();
			this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
			return this.pendingResult;
		} catch (ignore) {
			throw failedToFetchRecordingError();
		} finally {
			this.prepareInstanceForNextOperation();
		}
	}

	public static async hasAudioRecordingPermission(): Promise<GenericResponse> {
		if (navigator.permissions.query == null) {
			if (navigator.mediaDevices == null) {
				return Promise.reject(couldNotQueryPermissionStatusError());
			}
			return navigator.mediaDevices
				.getUserMedia({ audio: true })
				.then(() => successResponse())
				.catch(() => {
					throw couldNotQueryPermissionStatusError();
				});
		}

		return navigator.permissions
			.query({ name: 'microphone' as any })
			.then((result) => ({ value: result.state === 'granted' }))
			.catch(() => {
				throw couldNotQueryPermissionStatusError();
			});
	}

	public static async requestAudioRecordingPermission(): Promise<GenericResponse> {
		const havingPermission = await VoiceRecorderImpl.hasAudioRecordingPermission().catch(() => failureResponse());
		if (havingPermission.value) {
			return successResponse();
		}

		return navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(() => successResponse())
			.catch(() => failureResponse());
	}

	public pauseRecording(): Promise<GenericResponse> {
		if (this.mediaRecorder == null) {
			throw recordingHasNotStartedError();
		} else if (this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
			return Promise.resolve(successResponse());
		} else {
			return Promise.resolve(failureResponse());
		}
	}

	public resumeRecording(): Promise<GenericResponse> {
		if (this.mediaRecorder == null) {
			throw recordingHasNotStartedError();
		} else if (this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
			return Promise.resolve(successResponse());
		} else {
			return Promise.resolve(failureResponse());
		}
	}

	public getCurrentStatus(): Promise<CurrentRecordingStatus> {
		if (this.mediaRecorder == null) {
			return Promise.resolve({ status: RecordingStatus.NONE });
		} else if (this.mediaRecorder.state === 'recording') {
			return Promise.resolve({ status: RecordingStatus.RECORDING });
		} else if (this.mediaRecorder.state === 'paused') {
			return Promise.resolve({ status: RecordingStatus.PAUSED });
		} else {
			return Promise.resolve({ status: RecordingStatus.NONE });
		}
	}

	public isRecording():boolean {
		return this.mediaRecorder && this.mediaRecorder.state === 'recording' || false;
	}

	public getRecordTime():number {
		return this.recordTime
	}

	public helloWorld(): Promise<HelloWorldResponse> {
		return Promise.resolve({ value: "Hello there from web!" });
	}

	public static getSupportedMimeType(): string | null {
		if (MediaRecorder?.isTypeSupported == null) return null;
		const foundSupportedType = possibleMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
		return foundSupportedType ?? null;
	}

	private onSuccessfullyStartedRecording(stream: MediaStream): GenericResponse {
		this.startTimer();
		this.pendingResult = new Promise((resolve, reject) => {
			this.mediaRecorder = new MediaRecorder(stream);
			this.mediaRecorder.onerror = () => {
				this.prepareInstanceForNextOperation();
				reject(failedToRecordError());
			};
			this.mediaRecorder.onstop = async () => {
				const mimeType = VoiceRecorderImpl.getSupportedMimeType();
				if (mimeType == null) {
					this.prepareInstanceForNextOperation();
					reject(failedToFetchRecordingError());
					return;
				}
				const blobVoiceRecording = new Blob(this.chunks, { type: mimeType });
				if (blobVoiceRecording.size <= 0) {
					this.prepareInstanceForNextOperation();
					reject(emptyRecordingError());
					return;
				}
				const recordDataBase64 = await VoiceRecorderImpl.blobToBase64(blobVoiceRecording);
				const recordingDuration = await getBlobDuration(blobVoiceRecording);
				this.prepareInstanceForNextOperation();
				resolve({ value: { recordDataBase64, mimeType, msDuration: recordingDuration * 1000 } });
			};
			this.mediaRecorder.ondataavailable = (event: any) => this.chunks.push(event.data);
			this.mediaRecorder.start();
		});
		return successResponse();
	}

	private onFailedToStartRecording(): GenericResponse {
		this.stopTimer();
		this.prepareInstanceForNextOperation();
		throw failedToRecordError();
	}

	private static blobToBase64(blob: Blob): Promise<Base64String> {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const recordingResult = String(reader.result);
				const splitResult = recordingResult.split('base64,');
				const toResolve = splitResult.length > 1 ? splitResult[1] : recordingResult;
				resolve(toResolve.trim());
			};
			reader.readAsDataURL(blob);
		});
	}

	private prepareInstanceForNextOperation(): void {
		if (this.mediaRecorder != null && this.mediaRecorder.state === 'recording') {
			try {
				this.mediaRecorder.stop();
			} catch (error) {
				console.warn('While trying to stop a media recorder, an error was thrown', error);
			}
		}
		this.pendingResult = neverResolvingPromise();
		this.mediaRecorder = null;
		this.chunks = [];
	}

	private startTimer(): void {
		this.recordTime = 0;
		this.timerInterval = setInterval(() => {
			if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
				this.recordTime++;
				this.plugin.sendUpdate(this.mediaRecorder.state === 'recording', this.recordTime);
			}
		}, 1000);
	}

	private stopTimer(): void {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}
}
