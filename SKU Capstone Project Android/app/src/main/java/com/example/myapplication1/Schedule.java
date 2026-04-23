package com.example.myapplication1;

import android.Manifest;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

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
    private ApiService apiService;

    private TextView tvNextVaccineName, tvNextVaccineDate;
    private CardView cardUpcomingSummary;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ⚠️ [중요] 여기 파일명이 실제 res/layout 폴더의 파일명과 100% 일치해야 합니다!
        setContentView(R.layout.activity_schedule);

        tvNextVaccineName = findViewById(R.id.tvNextVaccineName);
        tvNextVaccineDate = findViewById(R.id.tvNextVaccineDate);
        cardUpcomingSummary = findViewById(R.id.cardUpcomingSummary);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        createNotificationChannel();
        checkNotificationPermission();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:3001")
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        apiService = retrofit.create(ApiService.class);

        loadData();
    }

    private void loadData() {
        apiService.getVaccineSchedule("testUserId123").enqueue(new Callback<List<AuthModels.VaccineResponse>>() {
            @Override
            public void onResponse(Call<List<AuthModels.VaccineResponse>> call, Response<List<AuthModels.VaccineResponse>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    vaccineList.clear();
                    vaccineList.addAll(response.body());

                    if (!vaccineList.isEmpty()) {
                        AuthModels.VaccineResponse next = vaccineList.get(0);
                        tvNextVaccineName.setText("D-" + next.dDay + " " + next.name);
                        tvNextVaccineDate.setText(next.dueDate + " 예정");

                        cardUpcomingSummary.setOnClickListener(v -> showEditDialog(next));

                        sendNotification("접종 알림", next.name + " 접종일이 얼마 남지 않았습니다!");
                    }
                }
            }
            @Override
            public void onFailure(Call<List<AuthModels.VaccineResponse>> call, Throwable t) {
                Log.e("Schedule", "에러: " + t.getMessage());
            }
        });
    }

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
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(Schedule.this, "수정 완료", Toast.LENGTH_SHORT).show();
                    loadData();
                }
            }
            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(Schedule.this, "실패", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "백신 알림", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void sendNotification(String title, String content) {
        // ⚠️ 안드로이드 13 이상 권한 체크
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(content)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
        manager.notify(1, builder.build());
    }

    private void checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }
}