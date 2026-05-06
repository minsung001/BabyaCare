package com.example.myapplication1;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class Schedule extends AppCompatActivity {
    private static final String CHANNEL_ID = "vaccine_channel";
    private List<AuthModels.VaccineResponse> vaccineList = new ArrayList<>();
    private List<AuthModels.VaccineResponse> filteredList = new ArrayList<>(); // 90일 필터링용 리스트
    private ApiService apiService;

<<<<<<< HEAD
    // 리사이클러뷰 컴포넌트
    private RecyclerView recyclerView;
    private VaccineAdapter adapter;
=======
    private RecyclerView recyclerView;
    private VaccineAdapter adapter;
    private TextView tvNextVaccineName, tvNextVaccineDate;
    private CardView cardUpcomingSummary;
>>>>>>> kgj

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_schedule);

<<<<<<< HEAD
        // 1. 리사이클러뷰 초기화 (기존 카드뷰 연결 코드 삭제됨)
        recyclerView = findViewById(R.id.rv_vaccine_list);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        // 2. 어댑터 연결 (필터링된 리스트를 사용)
        adapter = new VaccineAdapter(filteredList);
=======
        tvNextVaccineName = findViewById(R.id.tvNextVaccineName);
        tvNextVaccineDate = findViewById(R.id.tvNextVaccineDate);
        cardUpcomingSummary = findViewById(R.id.cardUpcomingSummary);
        recyclerView = findViewById(R.id.rv_vaccine_list);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new VaccineAdapter(vaccineList);
>>>>>>> kgj
        recyclerView.setAdapter(adapter);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        createNotificationChannel();
        checkNotificationPermission();

        // Retrofit 설정
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:3001")
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        apiService = retrofit.create(ApiService.class);

        loadData();
    }

    private void loadData() {
        SharedPreferences sharedPref = getSharedPreferences("UserPrefs", MODE_PRIVATE);
        String realUserId = sharedPref.getString("userEmail", "");

        if (realUserId.isEmpty()) {
            Toast.makeText(this, "로그인 정보가 없습니다.", Toast.LENGTH_SHORT).show();
            return;
        }

        apiService.getVaccineSchedule(realUserId).enqueue(new Callback<List<AuthModels.VaccineResponse>>() {
            @Override
            public void onResponse(@NonNull Call<List<AuthModels.VaccineResponse>> call, @NonNull Response<List<AuthModels.VaccineResponse>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    vaccineList.clear();
                    vaccineList.addAll(response.body());
<<<<<<< HEAD
                    updateUI(); // 필터링 로직 실행
=======
                    adapter.notifyDataSetChanged();

                    if (!vaccineList.isEmpty()) {
                        AuthModels.VaccineResponse next = vaccineList.get(0);
                        tvNextVaccineName.setText("D-" + next.dDay + " " + next.name);
                        tvNextVaccineDate.setText(next.dueDate + " 예정");

                        cardUpcomingSummary.setOnClickListener(v -> showEditDialog(next));
                        sendNotification("접종 알림", next.name + " 접종일이 얼마 남지 않았습니다!");
                    } else {
                        tvNextVaccineName.setText("예정된 접종이 없습니다.");
                        tvNextVaccineDate.setText("");
                    }
>>>>>>> kgj
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<AuthModels.VaccineResponse>> call, @NonNull Throwable t) {
                Log.e("Schedule", "에러: " + t.getMessage());
            }
        });
    }

    private void updateUI() {
        // 기존 필터링 리스트 비우기
        filteredList.clear();

        for (AuthModels.VaccineResponse v : vaccineList) {
            // 아기 생일 기준 오늘(0)부터 3달(90일) 이내인 모든 일정 추가
            if (v.dDay >= 0 && v.dDay <= 90) {
                filteredList.add(v);
            }
        }

        // 3. 어댑터에 데이터 변경 알림 (이제 리스트 개수만큼 화면에 다 뜹니다)
        adapter.notifyDataSetChanged();

        if (!filteredList.isEmpty()) {
            AuthModels.VaccineResponse first = filteredList.get(0);
            sendNotification("접종 알림", "조만간 맞아야 할 접종이 " + filteredList.size() + "건 있습니다.");
        }
    }

    // 수정 다이얼로그 (수정 기능 유지)
    private void showEditDialog(AuthModels.VaccineResponse item) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("접종 일정 수정");
        final EditText input = new EditText(this);
        input.setHint("YYYY-MM-DD 형식");
        input.setText(item.dueDate);
        builder.setView(input);

        builder.setPositiveButton("수정", (dialog, id) -> {
            updateVaccineOnServer(item.id, input.getText().toString());
        });
        builder.setNegativeButton("취소", null);
        builder.show();
    }

    private void updateVaccineOnServer(String vaccineId, String newDate) {
        apiService.updateVaccine(vaccineId, new AuthModels.VaccineUpdate(newDate)).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(Schedule.this, "수정 완료", Toast.LENGTH_SHORT).show();
                    loadData();
                }
            }
            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                Toast.makeText(Schedule.this, "실패", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // 알림 및 권한 관련 메서드들
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "백신 알림", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @SuppressLint("MissingPermission")
    private void sendNotification(String title, String content) {
<<<<<<< HEAD
        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
=======
        // 1. 알림 매니저 준비
        NotificationManagerCompat manager = NotificationManagerCompat.from(this);

        // 2. 권한 체크 (안드로이드 13 이상)
>>>>>>> kgj
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
        }
<<<<<<< HEAD
=======

        // 3. 알림 빌더 생성
>>>>>>> kgj
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(content)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

<<<<<<< HEAD
=======
        // 4. 알림 발송
>>>>>>> kgj
        manager.notify(1, builder.build());
    }
}