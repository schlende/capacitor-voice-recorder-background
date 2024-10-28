import { WebPlugin } from '@capacitor/core';

import { VoiceRecorderImpl } from './VoiceRecorderImpl';
import type { CurrentRecordingStatus, GenericResponse, HelloWorldResponse, RecordingData, RecordingTimeResponse, VoiceRecorderPlugin } from './definitions';

export class VoiceRecorderWeb extends WebPlugin implements VoiceRecorderPlugin {
	private voiceRecorderInstance = new VoiceRecorderImpl(this);

	public canDeviceVoiceRecord(): Promise<GenericResponse> {
		return VoiceRecorderImpl.canDeviceVoiceRecord();
	}

	public hasAudioRecordingPermission(): Promise<GenericResponse> {
		return VoiceRecorderImpl.hasAudioRecordingPermission();
	}

	public requestAudioRecordingPermission(): Promise<GenericResponse> {
		return VoiceRecorderImpl.requestAudioRecordingPermission();
	}

	public startRecording(): Promise<GenericResponse> {
		return this.voiceRecorderInstance.startRecording();
	}

	public stopRecording(): Promise<RecordingData> {
		return this.voiceRecorderInstance.stopRecording();
	}

	public helloWorld(): Promise<HelloWorldResponse> {
		return this.voiceRecorderInstance.helloWorld();
	}

	public pauseRecording(): Promise<GenericResponse> {
		return this.voiceRecorderInstance.pauseRecording();
	}

	public resumeRecording(): Promise<GenericResponse> {
		return this.voiceRecorderInstance.resumeRecording();
	}

	public getCurrentStatus(): Promise<CurrentRecordingStatus> {
		return this.voiceRecorderInstance.getCurrentStatus();
	}

	public isRecording(): Promise<GenericResponse>{
		return Promise.resolve({value: this.voiceRecorderInstance.isRecording()});
	}

	public recordingTime(): Promise<RecordingTimeResponse>{
		return Promise.resolve({value: this.voiceRecorderInstance.getRecordTime()});
	}

	public startBgRecording(): Promise<void> {
		console.log("Not implemented");
		return Promise.resolve();
	}

	public stopBgRecording(): Promise<void> {
		console.log("Not implemented");
		return Promise.resolve();
	}

	public sendUpdate(isRecording:boolean, recordingTime:number):void {
		this.notifyListeners("recordingUpdate", {isRecording: isRecording, recordingTime: recordingTime})
	}
}
