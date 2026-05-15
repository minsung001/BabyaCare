package com.example.myapplication1;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class EnvironmentActivity extends AppCompatActivity {

    private static final String TAG = "EnvironmentActivity";

    private TextView tvTempValue;
    private TextView tvHumidityValue;

    private double currentTemp = 0;
    private double currentHumid = 0;
    private String deviceId = "";
    private String accessToken = "";

    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_environment); // ✅ XML 파일명 맞춰야 함

        tvTempValue = findViewById(R.id.tvTempValue);
        tvHumidityValue = findViewById(R.id.tvHumidityValue);

        ImageButton btnBack = findViewById(R.id.btnBack);
        ImageButton btnTempUp = findViewById(R.id.btnTempUp);
        ImageButton btnTempDown = findViewById(R.id.btnTempDown);
        ImageButton btnHumidUp = findViewById(R.id.btnHumidUp);
        ImageButton btnHumidDown = findViewById(R.id.btnHumidDown);

        SharedPreferences pref = getSharedPreferences("UserPrefs", MODE_PRIVATE);
        accessToken = pref.getString("accessToken", "");

        Log.d(TAG, "accessToken: " + accessToken);

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:3001/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);

        btnBack.setOnClickListener(v -> {
            startActivity(new Intent(this, Menuactivity.class));
            finish();
        });

        btnTempUp.setOnClickListener(v ->
                controlDevice("temperatureMeasurement", "up", currentTemp));

        btnTempDown.setOnClickListener(v ->
                controlDevice("temperatureMeasurement", "down", currentTemp));

        btnHumidUp.setOnClickListener(v ->
                controlDevice("relativeHumidityMeasurement", "up", currentHumid));

        btnHumidDown.setOnClickListener(v ->
                controlDevice("relativeHumidityMeasurement", "down", currentHumid));

        loadDevices();
    }

    // ✅ DeviceResponse 단일로 수정
    private void loadDevices() {
        apiService.getDevices("Bearer " + accessToken)
                .enqueue(new Callback<AuthModels.DeviceResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.DeviceResponse> call,
                                           Response<AuthModels.DeviceResponse> response) {

                        Log.d(TAG, "디바이스 목록 응답: " + response.code());

                        if (response.isSuccessful() && response.body() != null
                                && response.body().ok
                                && response.body().devices != null
                                && !response.body().devices.isEmpty()) {

                            deviceId = response.body().devices.get(0).deviceId;
                            Log.d(TAG, "deviceId: " + deviceId);
                            loadDeviceStatus();

                        } else {
                            Toast.makeText(EnvironmentActivity.this,
                                    "연동된 기기가 없습니다.", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.DeviceResponse> call, Throwable t) {
                        Log.e(TAG, "디바이스 목록 실패: " + t.getMessage());
                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void loadDeviceStatus() {
        apiService.getDeviceStatus("Bearer " + accessToken, deviceId)
                .enqueue(new Callback<AuthModels.DeviceStatusResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.DeviceStatusResponse> call,
                                           Response<AuthModels.DeviceStatusResponse> response) {

                        Log.d(TAG, "상태 응답: " + response.code());

                        if (response.isSuccessful() && response.body() != null
                                && response.body().ok) {

                            currentTemp = response.body().temperature;
                            currentHumid = response.body().humidity;
                            updateUI();

                        } else {
                            Toast.makeText(EnvironmentActivity.this,
                                    "상태 조회 실패", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.DeviceStatusResponse> call, Throwable t) {
                        Log.e(TAG, "상태 조회 실패: " + t.getMessage());
                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void controlDevice(String capability, String command, double value) {
        if (deviceId.isEmpty()) {
            Toast.makeText(this, "기기를 먼저 연동해주세요.", Toast.LENGTH_SHORT).show();
            return;
        }

        AuthModels.ControlRequest request = new AuthModels.ControlRequest(
                deviceId, capability, command, value
        );

        apiService.controlDevice("Bearer " + accessToken, request)
                .enqueue(new Callback<AuthModels.ControlResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.ControlResponse> call,
                                           Response<AuthModels.ControlResponse> response) {

                        Log.d(TAG, "제어 응답: " + response.code());

                        if (response.isSuccessful() && response.body() != null
                                && response.body().ok) {

                            currentTemp = response.body().temperature;
                            currentHumid = response.body().humidity;
                            updateUI();

                        } else {
                            Toast.makeText(EnvironmentActivity.this,
                                    "제어 실패", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.ControlResponse> call, Throwable t) {
                        Log.e(TAG, "제어 실패: " + t.getMessage());
                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void updateUI() {
        runOnUiThread(() -> {
            tvTempValue.setText(String.format("%.1f°C", currentTemp));
            tvHumidityValue.setText(String.format("%.1f%%", currentHumid));
            Log.d(TAG, "UI 업데이트 - 온도: " + currentTemp + ", 습도: " + currentHumid);
        });
    }
}