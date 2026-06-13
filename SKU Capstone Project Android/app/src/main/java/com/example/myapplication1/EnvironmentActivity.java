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
    private String accessToken = "";
    private String userId = "";

    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_environment);

        tvTempValue = findViewById(R.id.tvTempValue);
        tvHumidityValue = findViewById(R.id.tvHumidityValue);

        ImageButton btnBack = findViewById(R.id.btnBack);
        ImageButton btnTempUp = findViewById(R.id.btnTempUp);
        ImageButton btnTempDown = findViewById(R.id.btnTempDown);
        ImageButton btnHumidUp = findViewById(R.id.btnHumidUp);
        ImageButton btnHumidDown = findViewById(R.id.btnHumidDown);

        SharedPreferences pref = getSharedPreferences("UserPrefs", MODE_PRIVATE);
        accessToken = pref.getString("accessToken", "");
        userId = pref.getString("userEmail", "");

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("http://10.0.2.2:3001/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);

        btnBack.setOnClickListener(v -> {
            startActivity(new Intent(this, Menuactivity.class));
            finish();
        });

        btnTempUp.setOnClickListener(v -> controlDevice("cooling_on"));
        btnTempDown.setOnClickListener(v -> controlDevice("cooling_off"));
        btnHumidUp.setOnClickListener(v -> controlDevice("humidifier_on"));
        btnHumidDown.setOnClickListener(v -> controlDevice("humidifier_off"));

        loadSensorStatus();
        checkSmartThingsRegistration();
    }

    private void loadSensorStatus() {
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "사용자 정보를 찾을 수 없습니다.", Toast.LENGTH_SHORT).show();
            return;
        }

        apiService.getTemhuLatest(userId)
                .enqueue(new Callback<AuthModels.TemperHumilityResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.TemperHumilityResponse> call,
                                           Response<AuthModels.TemperHumilityResponse> response) {
                        Log.d(TAG, "sensor status response: " + response.code());

                        if (response.isSuccessful() && response.body() != null) {
                            currentTemp = response.body().temperature;
                            currentHumid = response.body().humidity;
                            updateUI();
                        } else {
                            Toast.makeText(EnvironmentActivity.this,
                                    "센서 데이터를 불러오지 못했습니다.", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.TemperHumilityResponse> call, Throwable t) {
                        Log.e(TAG, "sensor status failed: " + t.getMessage());
                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void checkSmartThingsRegistration() {
        apiService.getDevices("Bearer " + accessToken)
                .enqueue(new Callback<AuthModels.DeviceResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.DeviceResponse> call,
                                           Response<AuthModels.DeviceResponse> response) {
                        if (!response.isSuccessful()
                                || response.body() == null
                                || !response.body().ok
                                || response.body().devices == null
                                || response.body().devices.isEmpty()) {
                            Toast.makeText(EnvironmentActivity.this,
                                    "SmartThings 기기를 먼저 연동해주세요.", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.DeviceResponse> call, Throwable t) {
                        Log.e(TAG, "device list failed: " + t.getMessage());
                    }
                });
    }

    private void controlDevice(String action) {
        AuthModels.ControlRequest request = new AuthModels.ControlRequest(action);

        apiService.controlDevice("Bearer " + accessToken, request)
                .enqueue(new Callback<AuthModels.ControlResponse>() {
                    @Override
                    public void onResponse(Call<AuthModels.ControlResponse> call,
                                           Response<AuthModels.ControlResponse> response) {
                        Log.d(TAG, "control response: " + response.code());

                        if (response.isSuccessful() && response.body() != null && response.body().ok) {
                            Toast.makeText(EnvironmentActivity.this,
                                    "SmartThings 명령을 전송했습니다.", Toast.LENGTH_SHORT).show();
                            loadSensorStatus();
                        } else {
                            Toast.makeText(EnvironmentActivity.this,
                                    "SmartThings 제어 실패", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AuthModels.ControlResponse> call, Throwable t) {
                        Log.e(TAG, "control failed: " + t.getMessage());
                        Toast.makeText(EnvironmentActivity.this,
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void updateUI() {
        runOnUiThread(() -> {
            tvTempValue.setText(String.format("%.1f°C", currentTemp));
            tvHumidityValue.setText(String.format("%.1f%%", currentHumid));
            Log.d(TAG, "UI updated - temp: " + currentTemp + ", humidity: " + currentHumid);
        });
    }
}
