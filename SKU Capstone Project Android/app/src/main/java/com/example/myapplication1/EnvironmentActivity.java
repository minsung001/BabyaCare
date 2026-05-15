package com.example.myapplication1;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class EnvironmentActivity extends AppCompatActivity {

    private static final String TAG = "EnvironmentActivity";

    private RecyclerView rvDevices;
    private TextView tvNoDevice;

    private String accessToken = "";
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_environment);

        rvDevices = findViewById(R.id.rvDevices);
        tvNoDevice = findViewById(R.id.tvNoDevice);

        ImageButton btnBack = findViewById(R.id.btnBack);

        SharedPreferences pref = getSharedPreferences("UserPrefs", MODE_PRIVATE);
        accessToken = pref.getString("accessToken", "");

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:3001/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);

        rvDevices.setLayoutManager(new LinearLayoutManager(this));

        btnBack.setOnClickListener(v -> {
            startActivity(new Intent(this, Menuactivity.class));
            finish();
        });

        loadDevices();
    }

    private void loadDevices() {
        apiService.getDevices("Bearer " + accessToken)
                .enqueue(new Callback<AuthModels.DeviceResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.DeviceResponse> call,
                                           Response<AuthModels.DeviceResponse> response) {

                        Log.d(TAG, "디바이스 목록 응답: " + response.code());

                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().ok
                                && response.body().devices != null
                                && !response.body().devices.isEmpty()) {

                            // ✅ 전체 기기 목록을 RecyclerView에 표시
                            DeviceAdapter adapter = new DeviceAdapter(
                                    response.body().devices,
                                    apiService,
                                    accessToken
                            );

                            rvDevices.setAdapter(adapter);
                            tvNoDevice.setVisibility(View.GONE);

                        } else {
                            tvNoDevice.setVisibility(View.VISIBLE);

                            Toast.makeText(EnvironmentActivity.this,
                                    "연동된 기기가 없습니다.",
                                    Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.DeviceResponse> call, Throwable t) {
                        Log.e(TAG, "디바이스 목록 실패: " + t.getMessage());

                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패",
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }
}