package com.tchvu3.capacitorvoicerecorder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.io.File;

import java.io.IOException;

public class MediaRecorderService extends Service {
    private final IBinder binder = new LocalBinder();

    private static final String CHANNEL_ID = "MediaRecorderServiceChannel";
    private CustomMediaRecorder customMediaRecorder;

    private boolean isRecording = false;
    private int recordingTime = 0;
    private IUpdateListener updateListener;

    // To keep track of recording time...
    private Handler mHandler;

    @Override
    public void onCreate() {
        super.onCreate();
        mHandler = new Handler();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(1, createNotification());
        // Service will not be restarted if killed
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    public class LocalBinder extends Binder {
        MediaRecorderService getService() {
            return MediaRecorderService.this;
        }
    }

    private Notification createNotification() {
        createNotificationChannel();

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Recording in Progress")
                .setContentText("Recording audio in the background.")
                .setSmallIcon(R.drawable.icon)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Media Recorder Service",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // This will let our app die properly
        if(customMediaRecorder != null){
            customMediaRecorder.stopRecording();
        }

        updateListener = null;
        stopSelf();
    }

    public void addUpdateListener(IUpdateListener listener){
        updateListener = listener;
    }

    private void updateListeners(){
        if(updateListener != null){
            updateListener.handleUpdate(isRecording, recordingTime);
        }
    }

    public void startRecording(){

        // Start recording
        if (!isRecording) {
            try {
                customMediaRecorder = new CustomMediaRecorder(this);
                customMediaRecorder.startRecording();

                recordingTime = 0;
                isRecording = true;
                updateListeners();

                final Runnable runnable = new Runnable() {
                    @Override
                    public void run() {
                        if(isRecording == false){
                            mHandler.removeCallbacks(this);
                        }else{
                            recordingTime += 1;
                            updateListeners();
                            mHandler.postDelayed(this, 1000);
                        }
                    }
                };

                mHandler.postDelayed(runnable, 1000);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        System.out.println("Called start recording...");
    }

    public void stopRecording(){
        // Stop recording
        if (customMediaRecorder != null && isRecording) {
            customMediaRecorder.stopRecording();
            isRecording = false;
            updateListeners();
        }

        System.out.println("Called stop recording...");
    }

    public CustomMediaRecorder getMediaRecorder(){
        return customMediaRecorder;
    }

    public void pauseRecording(){

        System.out.println("Called pause recording...");
    }

    public boolean isRecording(){
        return isRecording;
    }

    public int getRecordingTime() {
        return recordingTime;
    }
}
