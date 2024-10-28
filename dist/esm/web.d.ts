import { WebPlugin } from '@capacitor/core';
import type { CurrentRecordingStatus, GenericResponse, HelloWorldResponse, RecordingData, RecordingTimeResponse, VoiceRecorderPlugin } from './definitions';
export declare class VoiceRecorderWeb extends WebPlugin implements VoiceRecorderPlugin {
    private voiceRecorderInstance;
    canDeviceVoiceRecord(): Promise<GenericResponse>;
    hasAudioRecordingPermission(): Promise<GenericResponse>;
    requestAudioRecordingPermission(): Promise<GenericResponse>;
    startRecording(): Promise<GenericResponse>;
    stopRecording(): Promise<RecordingData>;
    helloWorld(): Promise<HelloWorldResponse>;
    pauseRecording(): Promise<GenericResponse>;
    resumeRecording(): Promise<GenericResponse>;
    getCurrentStatus(): Promise<CurrentRecordingStatus>;
    isRecording(): Promise<GenericResponse>;
    recordingTime(): Promise<RecordingTimeResponse>;
    startBgRecording(): Promise<void>;
    stopBgRecording(): Promise<void>;
    sendUpdate(isRecording: boolean, recordingTime: number): void;
}
