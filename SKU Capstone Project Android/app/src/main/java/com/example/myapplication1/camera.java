package com.example.myapplication1;

import android.net.Uri;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

public class camera extends AppCompatActivity {

    private LibVLC libVLC;
    private MediaPlayer mediaPlayer;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_camera);

        statusText = findViewById(R.id.statusText);
        VLCVideoLayout playerView = findViewById(R.id.playerView);

        ArrayList<String> options = new ArrayList<>();
        options.add("--network-caching=150");
        options.add("--live-caching=150");
        options.add("--clock-jitter=0");
        options.add("--clock-synchro=0");
        options.add("--video-filter=transform");
        options.add("--transform-type=90");

        libVLC = new LibVLC(this, options);
        mediaPlayer = new MediaPlayer(libVLC);
        mediaPlayer.attachViews(playerView, null, false, false);

        Media media = new Media(libVLC, Uri.parse("http://10.0.2.2:3001/stream/streamingfile.m3u8"));
        media.setHWDecoderEnabled(true, false);
        mediaPlayer.setMedia(media);
        media.release();
        mediaPlayer.play();

        statusText.setText("Live Streaming");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mediaPlayer != null) mediaPlayer.play();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (libVLC != null) {
            libVLC.release();
            libVLC = null;
        }
    }
}