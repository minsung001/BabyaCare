package com.example.myapplication1;

import android.content.Intent;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.ImageView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

public class Menuactivity extends AppCompatActivity {

    private ExoPlayer player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_menuactivity);

        PlayerView mainPreview = findViewById(R.id.mainPreview);
        ImageView ivProfile = findViewById(R.id.ivHeaderIcon);

        player = new ExoPlayer.Builder(this).build();
        mainPreview.setPlayer(player);
        MediaItem mediaItem = MediaItem.fromUri("http://10.0.2.2:3001/stream/streamingfile.m3u8");
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();

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
        if (player != null) player.play();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) player.pause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}