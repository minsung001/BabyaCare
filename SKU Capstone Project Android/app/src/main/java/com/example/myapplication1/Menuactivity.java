package com.example.myapplication1;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.ImageView;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;

public class Menuactivity extends AppCompatActivity {

    private LibVLC libVLC;
    private MediaPlayer mediaPlayer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_menuactivity);

        VLCVideoLayout mainPreview = findViewById(R.id.mainPreview);
        ImageView ivProfile = findViewById(R.id.ivHeaderIcon);

        ArrayList<String> options = new ArrayList<>();
        options.add("--network-caching=300");
        options.add("--no-audio");

        libVLC = new LibVLC(this, options);
        mediaPlayer = new MediaPlayer(libVLC);
        mediaPlayer.attachViews(mainPreview, null, false, false);

        Media media = new Media(libVLC, Uri.parse("http://10.0.2.2:3001/stream/streamingfile.m3u8"));
        media.setHWDecoderEnabled(true, false);
        mediaPlayer.setMedia(media);
        media.release();
        mediaPlayer.setAspectRatio(null);
        mediaPlayer.setScale(1);
        mainPreview.post(() -> {
            int width = mainPreview.getWidth();
            int height = width * 9 / 16;
            mainPreview.getLayoutParams().height = height;
            mainPreview.requestLayout();
        });
        mediaPlayer.play();

        LinearLayout btnEnvironment = findViewById(R.id.btn_environment);
        LinearLayout btnCamera = findViewById(R.id.btn_camera);
        LinearLayout btnSchedule = findViewById(R.id.btn_schedule);
        LinearLayout btnGraph = findViewById(R.id.btn_graph);
        LinearLayout androidBtnReport = findViewById(R.id.btn_report);
        LinearLayout btnPolicy = findViewById(R.id.btn_policy);

        ivProfile.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, mypage.class)));
        btnEnvironment.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, EnvironmentActivity.class)));
        btnCamera.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, camera.class)));
        btnSchedule.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, Schedule.class)));
        btnGraph.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, GrapeActivity.class)));
        androidBtnReport.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, GptReportActivity.class)));
        btnPolicy.setOnClickListener(v -> startActivity(new Intent(Menuactivity.this, policy.class)));
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mediaPlayer != null) mediaPlayer.play();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mediaPlayer != null) mediaPlayer.pause();
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