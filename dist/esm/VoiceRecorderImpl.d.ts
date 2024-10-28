import type { CurrentRecordingStatus, GenericResponse, HelloWorldResponse, RecordingData } from './definitions';
import type { VoiceRecorderWeb } from './web';
export declare class VoiceRecorderImpl {
    private recordTime;
    private timerInterval;
    private mediaRecorder;
    private chunks;
    private pendingResult;
    private plugin;
    constructor(plugin: VoiceRecorderWeb);
    static canDeviceVoiceRecord(): Promise<GenericResponse>;
    startRecording(): Promise<GenericResponse>;
    stopRecording(): Promise<RecordingData>;
    static hasAudioRecordingPermission(): Promise<GenericResponse>;
    static requestAudioRecordingPermission(): Promise<GenericResponse>;
    pauseRecording(): Promise<GenericResponse>;
    resumeRecording(): Promise<GenericResponse>;
    getCurrentStatus(): Promise<CurrentRecordingStatus>;
    isRecording(): boolean;
    getRecordTime(): number;
    helloWorld(): Promise<HelloWorldResponse>;
    static getSupportedMimeType(): string | null;
    private onSuccessfullyStartedRecording;
    private onFailedToStartRecording;
    private static blobToBase64;
    private prepareInstanceForNextOperation;
    private startTimer;
    private stopTimer;
}
