'use strict';

var core = require('@capacitor/core');
var getBlobDuration = require('get-blob-duration');

const RecordingStatus = {
    RECORDING: 'RECORDING',
    PAUSED: 'PAUSED',
    NONE: 'NONE',
};

const VoiceRecorder = core.registerPlugin('VoiceRecorder', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.VoiceRecorderWeb()),
});

const successResponse = () => ({ value: true });
const failureResponse = () => ({ value: false });
const missingPermissionError = () => new Error('MISSING_PERMISSION');
const alreadyRecordingError = () => new Error('ALREADY_RECORDING');
const deviceCannotVoiceRecordError = () => new Error('DEVICE_CANNOT_VOICE_RECORD');
const failedToRecordError = () => new Error('FAILED_TO_RECORD');
const emptyRecordingError = () => new Error('EMPTY_RECORDING');
const recordingHasNotStartedError = () => new Error('RECORDING_HAS_NOT_STARTED');
const failedToFetchRecordingError = () => new Error('FAILED_TO_FETCH_RECORDING');
const couldNotQueryPermissionStatusError = () => new Error('COULD_NOT_QUERY_PERMISSION_STATUS');

// these mime types will be checked one by one in order until one of them is found to be supported by the current browser
const possibleMimeTypes = ['audio/aac', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
const neverResolvingPromise = () => new Promise(() => undefined);
class VoiceRecorderImpl {
    constructor(plugin) {
        this.recordTime = 0;
        this.timerInterval = null;
        this.mediaRecorder = null;
        this.chunks = [];
        this.pendingResult = neverResolvingPromise();
        this.plugin = plugin;
    }
    static async canDeviceVoiceRecord() {
        var _a;
        if (((_a = navigator === null || navigator === void 0 ? void 0 : navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia) == null || VoiceRecorderImpl.getSupportedMimeType() == null) {
            return failureResponse();
        }
        else {
            return successResponse();
        }
    }
    async startRecording() {
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
    async stopRecording() {
        if (this.mediaRecorder == null) {
            throw recordingHasNotStartedError();
        }
        try {
            this.mediaRecorder.stop();
            this.stopTimer();
            this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            return this.pendingResult;
        }
        catch (ignore) {
            throw failedToFetchRecordingError();
        }
        finally {
            this.prepareInstanceForNextOperation();
        }
    }
    static async hasAudioRecordingPermission() {
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
            .query({ name: 'microphone' })
            .then((result) => ({ value: result.state === 'granted' }))
            .catch(() => {
            throw couldNotQueryPermissionStatusError();
        });
    }
    static async requestAudioRecordingPermission() {
        const havingPermission = await VoiceRecorderImpl.hasAudioRecordingPermission().catch(() => failureResponse());
        if (havingPermission.value) {
            return successResponse();
        }
        return navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(() => successResponse())
            .catch(() => failureResponse());
    }
    pauseRecording() {
        if (this.mediaRecorder == null) {
            throw recordingHasNotStartedError();
        }
        else if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            return Promise.resolve(successResponse());
        }
        else {
            return Promise.resolve(failureResponse());
        }
    }
    resumeRecording() {
        if (this.mediaRecorder == null) {
            throw recordingHasNotStartedError();
        }
        else if (this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            return Promise.resolve(successResponse());
        }
        else {
            return Promise.resolve(failureResponse());
        }
    }
    getCurrentStatus() {
        if (this.mediaRecorder == null) {
            return Promise.resolve({ status: RecordingStatus.NONE });
        }
        else if (this.mediaRecorder.state === 'recording') {
            return Promise.resolve({ status: RecordingStatus.RECORDING });
        }
        else if (this.mediaRecorder.state === 'paused') {
            return Promise.resolve({ status: RecordingStatus.PAUSED });
        }
        else {
            return Promise.resolve({ status: RecordingStatus.NONE });
        }
    }
    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording' || false;
    }
    getRecordTime() {
        return this.recordTime;
    }
    helloWorld() {
        return Promise.resolve({ value: "Hello there from web!" });
    }
    static getSupportedMimeType() {
        if ((MediaRecorder === null || MediaRecorder === void 0 ? void 0 : MediaRecorder.isTypeSupported) == null)
            return null;
        const foundSupportedType = possibleMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
        return foundSupportedType !== null && foundSupportedType !== void 0 ? foundSupportedType : null;
    }
    onSuccessfullyStartedRecording(stream) {
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
            this.mediaRecorder.ondataavailable = (event) => this.chunks.push(event.data);
            this.mediaRecorder.start();
        });
        return successResponse();
    }
    onFailedToStartRecording() {
        this.stopTimer();
        this.prepareInstanceForNextOperation();
        throw failedToRecordError();
    }
    static blobToBase64(blob) {
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
    prepareInstanceForNextOperation() {
        if (this.mediaRecorder != null && this.mediaRecorder.state === 'recording') {
            try {
                this.mediaRecorder.stop();
            }
            catch (error) {
                console.warn('While trying to stop a media recorder, an error was thrown', error);
            }
        }
        this.pendingResult = neverResolvingPromise();
        this.mediaRecorder = null;
        this.chunks = [];
    }
    startTimer() {
        this.recordTime = 0;
        this.timerInterval = setInterval(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.recordTime++;
                this.plugin.sendUpdate(this.mediaRecorder.state === 'recording', this.recordTime);
            }
        }, 1000);
    }
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}

class VoiceRecorderWeb extends core.WebPlugin {
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

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    VoiceRecorderWeb: VoiceRecorderWeb
});

exports.RecordingStatus = RecordingStatus;
exports.VoiceRecorder = VoiceRecorder;
//# sourceMappingURL=plugin.cjs.js.map
