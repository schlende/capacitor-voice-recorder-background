import type { Plugin } from '@capacitor/core'

export type Base64String = string;

export interface RecordingData {
  value: {
    recordDataBase64: Base64String;
    msDuration: number;
    mimeType: string;
  };
}

export interface GenericResponse {
  value: boolean;
}

export interface RecordingTimeResponse {
  value: number;
}

export interface HelloWorldResponse {
  value: string;
}

export const RecordingStatus = {
  RECORDING: 'RECORDING',
  PAUSED: 'PAUSED',
  NONE: 'NONE',
} as const;

export interface CurrentRecordingStatus {
  status: (typeof RecordingStatus)[keyof typeof RecordingStatus];
}

export interface VoiceRecorderPlugin extends Plugin {
  canDeviceVoiceRecord(): Promise<GenericResponse>;

  requestAudioRecordingPermission(): Promise<GenericResponse>;

  hasAudioRecordingPermission(): Promise<GenericResponse>;

  startRecording(): Promise<GenericResponse>;

  stopRecording(): Promise<RecordingData>;

  pauseRecording(): Promise<GenericResponse>;

  resumeRecording(): Promise<GenericResponse>;

  getCurrentStatus(): Promise<CurrentRecordingStatus>;

  helloWorld(): Promise<HelloWorldResponse>;

	isRecording(): Promise<GenericResponse>;

	recordingTime(): Promise<RecordingTimeResponse>;

	startBgRecording(): Promise<void>;

	stopBgRecording(): Promise<void>;
}
