package com.example.myapplication1;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class Menuactivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_menuactivity); // XML 파일명 확인 필수

        // 1. XML 레이아웃의 ID와 자바 객체 연결
        // 💡 동그라미 치신 우측 상단 프로필(human.png) 아이콘
        ImageView ivProfile = findViewById(R.id.ivHeaderIcon);

        LinearLayout btnEnvironment = findViewById(R.id.btn_environment);
        LinearLayout btnCamera = findViewById(R.id.btn_camera);
        LinearLayout btnSchedule = findViewById(R.id.btn_schedule);
        LinearLayout btnGraph = findViewById(R.id.btn_graph);
        LinearLayout btnReport = findViewById(R.id.btn_report);
        LinearLayout btnPolicy = findViewById(R.id.btn_policy);

        // 2. 각 버튼 클릭 시 화면 전환 설정

        // 프로필 클릭 -> 마이페이지(mypage) 이동
        // Menuactivity.java의 ivProfile 클릭 리스너 부분
        ivProfile.setOnClickListener(v -> {
            // 💡 아래 코드를 추가해서 화면 하단에 글자가 뜨는지 보세요.
            Toast.makeText(Menuactivity.this, "마이페이지 버튼 클릭됨!", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(Menuactivity.this, mypage.class);
            startActivity(intent);
        });

        // 환경 클릭 -> enviroment 클래스 이동
        btnEnvironment.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, enviroment.class));
        });

        // 카메라 클릭 -> camera 클래스 이동
        btnCamera.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, camera.class));
        });

        // 일정 클릭 -> Schedule 클래스 이동 (대문자 S 주의)
        btnSchedule.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, Schedule.class));
        });

        // 그래프 클릭 -> grape 클래스 이동
        btnGraph.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, GrapeActivity.class));
        });

        // 리포트 클릭 -> report 클래스 이동
        btnReport.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, report.class));
        });

        // 정책 클릭 -> policy 클래스 이동
        btnPolicy.setOnClickListener(v -> {
            startActivity(new Intent(Menuactivity.this, policy.class));
        });
    }
}