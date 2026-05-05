package com.example.myapplication1;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.net.DatagramPacket;
import java.net.DatagramSocket;

public class Menuactivity extends AppCompatActivity {

    // 💡 변수 선언 (이게 클래스 바로 밑에 있어야 함)
    private ImageView mainPreview;
    private DatagramSocket socket;
    private Thread receiveThread;
    private boolean isStreaming = false;
    private final int UDP_PORT = 5005;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_menuactivity);

        // 1. UI 객체 연결
        mainPreview = findViewById(R.id.mainPreview);
        ImageView ivProfile = findViewById(R.id.ivHeaderIcon);

        LinearLayout btnEnvironment = findViewById(R.id.btn_environment);
        LinearLayout btnCamera = findViewById(R.id.btn_camera);
        LinearLayout btnSchedule = findViewById(R.id.btn_schedule);
        LinearLayout btnGraph = findViewById(R.id.btn_graph);
        LinearLayout androidBtnReport = findViewById(R.id.btn_report);
        LinearLayout btnPolicy = findViewById(R.id.btn_policy);

        // 2. 클릭 리스너 설정
        ivProfile.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, mypage.class));
        });

        btnEnvironment.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, enviroment.class));
        });

        btnCamera.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, camera.class));
        });

        btnSchedule.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, Schedule.class));
        });

        btnGraph.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, GrapeActivity.class));
        });

        androidBtnReport.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, report.class));
        });

        btnPolicy.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, policy.class));
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        isStreaming = true;
        startUdpReceiver();
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopStreaming();
    }

    private void startUdpReceiver() {
        receiveThread = new Thread(() -> {
            try {
                socket = new DatagramSocket(UDP_PORT);
                byte[] buffer = new byte[65535];
                while (isStreaming) {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    socket.receive(packet);

                    Bitmap bitmap = BitmapFactory.decodeByteArray(packet.getData(), 0, packet.getLength());
                    if (bitmap != null) {
                        runOnUiThread(() -> mainPreview.setImageBitmap(bitmap));
                    }
                }
            } catch (Exception e) {
                Log.e("UDP_MENU", "에러: " + e.getMessage());
            } finally {
                stopStreaming();
            }
        });
        receiveThread.start();
    }

    private void stopStreaming() {
        isStreaming = false;
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        if (receiveThread != null && receiveThread.isAlive()) {
            receiveThread.interrupt();
        }
    }
}