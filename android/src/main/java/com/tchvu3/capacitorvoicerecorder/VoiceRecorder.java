package com.tchvu3.capacitorvoicerecorder;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import com.getcapacitor.JSObject;
import android.content.Intent;

@CapacitorPlugin(
    name = "VoiceRecorder",
    permissions = { @Permission(alias = VoiceRecorder.RECORD_AUDIO_ALIAS, strings = { Manifest.permission.RECORD_AUDIO }) }
)

public class VoiceRecorder extends Plugin implements IUpdateListener {

    static final String RECORD_AUDIO_ALIAS = "voice recording";
    private CustomMediaRecorder mediaRecorder;

    @PluginMethod
    public void canDeviceVoiceRecord(PluginCall call) {
        if (CustomMediaRecorder.canPhoneCreateMediaRecorder(getContext())) {
            call.resolve(ResponseGenerator.successResponse());
        } else {
            call.resolve(ResponseGenerator.failResponse());
        }
    }

    @PluginMethod
    public void requestAudioRecordingPermission(PluginCall call) {
        if (doesUserGaveAudioRecordingPermission()) {
            call.resolve(ResponseGenerator.successResponse());
        } else {
            requestPermissionForAlias(RECORD_AUDIO_ALIAS, call, "recordAudioPermissionCallback");
        }
    }

    @PermissionCallback
    private void recordAudioPermissionCallback(PluginCall call) {
        this.hasAudioRecordingPermission(call);
    }

    @PluginMethod
    public void hasAudioRecordingPermission(PluginCall call) {
        call.resolve(ResponseGenerator.fromBoolean(doesUserGaveAudioRecordingPermission()));
    }

    // @PluginMethod
    // public void startRecording(PluginCall call) {
    //     if (!CustomMediaRecorder.canPhoneCreateMediaRecorder(getContext())) {
    //         call.reject(Messages.CANNOT_RECORD_ON_THIS_PHONE);
    //         return;
    //     }

    //     if (!doesUserGaveAudioRecordingPermission()) {
    //         call.reject(Messages.MISSING_PERMISSION);
    //         return;
    //     }

    //     if (this.isMicrophoneOccupied()) {
    //         call.reject(Messages.MICROPHONE_BEING_USED);
    //         return;
    //     }

    //     if (mediaRecorder != null) {
    //         call.reject(Messages.ALREADY_RECORDING);
    //         return;
    //     }

    //     try {
    //         mediaRecorder = new CustomMediaRecorder(getContext());
    //         mediaRecorder.startRecording();
    //         call.resolve(ResponseGenerator.successResponse());
    //     } catch (Exception exp) {
    //         mediaRecorder = null;
    //         call.reject(Messages.FAILED_TO_RECORD, exp);
    //     }
    // }

    // @PluginMethod
    // public void stopRecording(PluginCall call) {
    //     if (mediaRecorder == null) {
    //         call.reject(Messages.RECORDING_HAS_NOT_STARTED);
    //         return;
    //     }

    //     try {
    //         mediaRecorder.stopRecording();
    //         File recordedFile = mediaRecorder.getOutputFile();
    //         RecordData recordData = new RecordData(
    //             readRecordedFileAsBase64(recordedFile),
    //             getMsDurationOfAudioFile(recordedFile.getAbsolutePath()),
    //             "audio/aac"
    //         );
    //         if (recordData.getRecordDataBase64() == null || recordData.getMsDuration() < 0) {
    //             call.reject(Messages.EMPTY_RECORDING);
    //         } else {
    //             call.resolve(ResponseGenerator.dataResponse(recordData.toJSObject()));
    //         }
    //     } catch (Exception exp) {
    //         call.reject(Messages.FAILED_TO_FETCH_RECORDING, exp);
    //     } finally {
    //         mediaRecorder.deleteOutputFile();
    //         mediaRecorder = null;
    //     }
    // }

    @PluginMethod
    public void pauseRecording(PluginCall call) {
        if (mediaRecorder == null) {
            call.reject(Messages.RECORDING_HAS_NOT_STARTED);
            return;
        }
        try {
            call.resolve(ResponseGenerator.fromBoolean(mediaRecorder.pauseRecording()));
        } catch (NotSupportedOsVersion exception) {
            call.reject(Messages.NOT_SUPPORTED_OS_VERSION);
        }
    }

    @PluginMethod
    public void resumeRecording(PluginCall call) {
        if (mediaRecorder == null) {
            call.reject(Messages.RECORDING_HAS_NOT_STARTED);
            return;
        }
        try {
            call.resolve(ResponseGenerator.fromBoolean(mediaRecorder.resumeRecording()));
        } catch (NotSupportedOsVersion exception) {
            call.reject(Messages.NOT_SUPPORTED_OS_VERSION);
        }
    }

    @PluginMethod
    public void getCurrentStatus(PluginCall call) {
        if (mediaRecorder == null) {
            call.resolve(ResponseGenerator.statusResponse(CurrentRecordingStatus.NONE));
        } else {
            call.resolve(ResponseGenerator.statusResponse(mediaRecorder.getCurrentStatus()));
        }
    }

    private boolean doesUserGaveAudioRecordingPermission() {
        return getPermissionState(VoiceRecorder.RECORD_AUDIO_ALIAS).equals(PermissionState.GRANTED);
    }

    private String readRecordedFileAsBase64(File recordedFile) {
        BufferedInputStream bufferedInputStream;
        byte[] bArray = new byte[(int) recordedFile.length()];
        try {
            bufferedInputStream = new BufferedInputStream(new FileInputStream(recordedFile));
            bufferedInputStream.read(bArray);
            bufferedInputStream.close();
        } catch (IOException exp) {
            return null;
        }
        return Base64.encodeToString(bArray, Base64.DEFAULT);
    }

    private int getMsDurationOfAudioFile(String recordedFilePath) {
        try {
            MediaPlayer mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(recordedFilePath);
            mediaPlayer.prepare();
            return mediaPlayer.getDuration();
        } catch (Exception ignore) {
            return -1;
        }
    }

    private boolean isMicrophoneOccupied() {
        AudioManager audioManager = (AudioManager) this.getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return true;
        return audioManager.getMode() != AudioManager.MODE_NORMAL;
    }

    // New methods...

    @Override
    public void load() {
        connectToBackgroundService();
    }

    @PluginMethod
    public void helloWorld(PluginCall call){
        JSObject ret = new JSObject();
        ret.put("value", "Hello from Android!");
        call.resolve(ret);
    }

    @PluginMethod
    public void isRecording(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", mediaRecorderService.isRecording());
        call.resolve(ret);
    }

    @PluginMethod
    public void recordingTime(PluginCall call) {
        connectToBackgroundService();
        JSObject ret = new JSObject();
        ret.put("value", mediaRecorderService.getRecordingTime());
        call.resolve(ret);
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
    // public void startBgRecording(PluginCall call) {
        if(!mediaRecorderService.isRecording()){
            startMediaRecordingService();
            mediaRecorderService.startRecording();
        }

        call.resolve();
    }

    

    // @PluginMethod
    // public void stopRecording(PluginCall call) {
    // // public void stopBgRecording(PluginCall call) {
    //     if(mediaRecorderService.isRecording()){
    //         mediaRecorderService.stopRecording();
    //         stopMediaRecordingService();
    //     }

    //     call.resolve();
    // }
    

    @PluginMethod
    public void stopRecording(PluginCall call) {
        CustomMediaRecorder mediaRecorder = mediaRecorderService.getMediaRecorder();

        try {

            if(mediaRecorderService.isRecording()){
                mediaRecorderService.stopRecording();
                stopMediaRecordingService();
            }

            File recordedFile = mediaRecorder.getOutputFile();
            RecordData recordData = new RecordData(
                readRecordedFileAsBase64(recordedFile),
                getMsDurationOfAudioFile(recordedFile.getAbsolutePath()),
                "audio/aac"
            );
            if (recordData.getRecordDataBase64() == null || recordData.getMsDuration() < 0) {
                call.reject(Messages.EMPTY_RECORDING);
            } else {
                call.resolve(ResponseGenerator.dataResponse(recordData.toJSObject()));
            }
        } catch (Exception exp) {
            call.reject(Messages.FAILED_TO_FETCH_RECORDING, exp);
        } finally {
            mediaRecorder.deleteOutputFile();
            mediaRecorder = null;
        }
    }
    

    private MediaRecorderService mediaRecorderService;
    private boolean isBound = false;

    private void connectToBackgroundService(){
        if(!isBound){
            Intent serviceIntent = new Intent(getContext(), MediaRecorderService.class);
            getContext().bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    private void disconnectFromService(){
        if(isBound){
            getContext().unbindService(serviceConnection);
        }
    }

    private void startMediaRecordingService() {
        Context context = getContext();
        Intent serviceIntent = new Intent(context, MediaRecorderService.class);

        // Use startForegroundService for Android 8.0 (API 26) and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            // Use startService for Android versions below 8.0
            context.startService(serviceIntent);
        }
    }

    private void stopMediaRecordingService() {
        Context context = getContext();
        Intent serviceIntent = new Intent(context, MediaRecorderService.class);
        context.stopService(serviceIntent);
    }

    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            MediaRecorderService.LocalBinder localBinder = (MediaRecorderService.LocalBinder) binder;
            mediaRecorderService = localBinder.getService();
            mediaRecorderService.addUpdateListener(VoiceRecorder.this);
            isBound = true;
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            isBound = false;
        }
    };

    @Override
    public void handleUpdate(boolean isRecording, int recordingTime) {
        System.out.println("Got recording update " + isRecording + " " + recordingTime);
        JSObject ret = new JSObject();
        ret.put("isRecording", isRecording);
        ret.put("recordingTime", recordingTime);
        notifyListeners("recordingUpdate", ret);
    }
}
