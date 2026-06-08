package com.example.myapplication1;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.LinearLayout;

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
        options.add("--avcodec-fast");         // SW 디코딩 속도 향상
        options.add("--avcodec-skiploopfilter=2"); // 화질 감소 cpu 부하 감소
        options.add("--drop-late-frames"); // 지연 누적 방지
        options.add("--skip-frames"); // 버벅 거리면 건너 뛰기

        libVLC = new LibVLC(this, options);
        mediaPlayer = new MediaPlayer(libVLC);

        mediaPlayer.attachViews(mainPreview, null, false, false);

        String streamUrl =
                BuildConfig.BASE_URL
                        + "/stream/streamingfile.m3u8";

        Media media = new Media(
                libVLC,
                Uri.parse(streamUrl)
        );

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

        LinearLayout btnEnvironment =
                findViewById(R.id.btn_environment);

        LinearLayout btnCamera =
                findViewById(R.id.btn_camera);

        LinearLayout btnSchedule =
                findViewById(R.id.btn_schedule);

        LinearLayout btnGraph =
                findViewById(R.id.btn_graph);

        LinearLayout btnReport =
                findViewById(R.id.btn_report);

        LinearLayout btnPolicy =
                findViewById(R.id.btn_policy);

        ivProfile.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                mypage.class
                        )
                )
        );

        btnEnvironment.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                EnvironmentActivity.class
                        )
                )
        );

        btnCamera.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                camera.class
                        )
                )
        );

        btnSchedule.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                Schedule.class
                        )
                )
        );

        btnGraph.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                GrapeActivity.class
                        )
                )
        );

        btnReport.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                GptReportActivity.class
                        )
                )
        );

        btnPolicy.setOnClickListener(v ->
                startActivity(
                        new Intent(
                                Menuactivity.this,
                                policy.class
                        )
                )
        );

        // 저장된 로그인 userId 가져오기
        SharedPreferences prefs =
                getSharedPreferences(
                        "UserPrefs",
                        MODE_PRIVATE
                );

        String userId =
                prefs.getString("username", "");

        // 울음 감지 서비스 시작
        Intent serviceIntent =
                new Intent(
                        this,
                        CryAlertService.class
                );

        serviceIntent.putExtra("userId", userId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            startForegroundService(serviceIntent);

        } else {

            startService(serviceIntent);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (mediaPlayer != null && libVLC != null) {
            VLCVideoLayout mainPreview = findViewById(R.id.mainPreview);
            mediaPlayer.detachViews();
            mediaPlayer.attachViews(mainPreview, null, false, false);

            String streamUrl = BuildConfig.BASE_URL + "/stream/streamingfile.m3u8";
            Media media = new Media(libVLC, Uri.parse(streamUrl));
            media.setHWDecoderEnabled(true, false);
            mediaPlayer.setMedia(media);
            media.release();
            mediaPlayer.play();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mediaPlayer != null) {
            mediaPlayer.stop();
        }
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