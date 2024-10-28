import { WebPlugin } from '@capacitor/core';
import { VoiceRecorderImpl } from './VoiceRecorderImpl';
export class VoiceRecorderWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.voiceRecorderInstance = new VoiceRecorderImpl(this);
    }
    canDeviceVoiceRecord() {
        return VoiceRecorderImpl.canDeviceVoiceRecord();
    }
    hasAudioRecordingPermission() {
        return VoiceRecorderImpl.hasAudioRecordingPermission();
    }
    requestAudioRecordingPermission() {
        return VoiceRecorderImpl.requestAudioRecordingPermission();
    }
    startRecording() {
        return this.voiceRecorderInstance.startRecording();
    }
    stopRecording() {
        return this.voiceRecorderInstance.stopRecording();
    }
    helloWorld() {
        return this.voiceRecorderInstance.helloWorld();
    }
    pauseRecording() {
        return this.voiceRecorderInstance.pauseRecording();
    }
    resumeRecording() {
        return this.voiceRecorderInstance.resumeRecording();
    }
    getCurrentStatus() {
        return this.voiceRecorderInstance.getCurrentStatus();
    }
    isRecording() {
        return Promise.resolve({ value: this.voiceRecorderInstance.isRecording() });
    }
    recordingTime() {
        return Promise.resolve({ value: this.voiceRecorderInstance.getRecordTime() });
    }
    startBgRecording() {
        console.log("Not implemented");
        return Promise.resolve();
    }
    stopBgRecording() {
        console.log("Not implemented");
        return Promise.resolve();
    }
    sendUpdate(isRecording, recordingTime) {
        this.notifyListeners("recordingUpdate", { isRecording: isRecording, recordingTime: recordingTime });
    }
}
//# sourceMappingURL=web.js.map