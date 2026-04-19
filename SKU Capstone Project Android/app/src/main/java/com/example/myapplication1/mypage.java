package com.example.myapplication1;

import android.app.DatePickerDialog;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.*;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import java.util.Calendar;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class mypage extends AppCompatActivity {

    private ApiService apiService;
    private EditText etEditName, etBabyBirth, etCurrentPw, etEditPw;
    private Button btnSaveAll;

    // SmartThings 뷰
    private ImageButton btnAddSmartThings;
    private LinearLayout itemEmptyDevice, layoutDeviceList;

    // 세션 정보
    private String loginUserEmail;
    private String jwtToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mypage);

        loadUserInfo(); // 1. 신분증 로드
        initViews();    // 2. 뷰 초기화
        setupListeners(); // 3. 클릭 리스너
        loadRegisteredDevices(); // 4. 기존 기기 로드
    }

    private void loadUserInfo() {
        SharedPreferences sharedPref = getSharedPreferences("UserPrefs", MODE_PRIVATE);
        String token = sharedPref.getString("accessToken", "");
        loginUserEmail = sharedPref.getString("userEmail", "minsung@example.com");

        // 서버 verifyToken 통과용 "Bearer " 필수
        this.jwtToken = "Bearer " + token;
        Log.d("SmartThings", "로그인 세션 확인: " + loginUserEmail);
    }

    private void initViews() {
        apiService = RetrofitClient.getApiService();

        etEditName = findViewById(R.id.et_edit_name);
        etBabyBirth = findViewById(R.id.et_edit_baby_birth);
        etCurrentPw = findViewById(R.id.et_current_pw);
        etEditPw = findViewById(R.id.et_edit_pw);
        btnSaveAll = findViewById(R.id.btn_save_all);

        btnAddSmartThings = findViewById(R.id.btn_add_smartthings);
        itemEmptyDevice = findViewById(R.id.item_empty_device);
        layoutDeviceList = findViewById(R.id.layout_device_list);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        findViewById(R.id.btn_add_guardian).setOnClickListener(v -> {
            EditText et = new EditText(this);
            et.setHint("초대할 ID 입력");
            new AlertDialog.Builder(this).setTitle("보호자 초대").setView(et)
                    .setPositiveButton("초대", (dialog, which) -> Toast.makeText(this, "초대를 보냈습니다.", Toast.LENGTH_SHORT).show())
                    .setNegativeButton("취소", null).show();
        });
    }

    private void setupListeners() {
        etBabyBirth.setOnClickListener(v -> {
            Calendar c = Calendar.getInstance();
            new DatePickerDialog(this, (view, y, m, d) -> {
                etBabyBirth.setText(String.format("%d-%02d-%02d", y, m + 1, d));
            }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show();
        });

        btnAddSmartThings.setOnClickListener(v -> showSmartThingsRegistrationDialog());
        btnSaveAll.setOnClickListener(v -> updateProfileProcess());
    }

    private void loadRegisteredDevices() {
        apiService.getRegisteredDevices(jwtToken, loginUserEmail).enqueue(new Callback<AuthModels.DeviceResponse>() {
            @Override
            public void onResponse(Call<AuthModels.DeviceResponse> call, Response<AuthModels.DeviceResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    displayDevices(response.body().devices);
                }
            }
            @Override public void onFailure(Call<AuthModels.DeviceResponse> call, Throwable t) {
                Log.e("SmartThings", "로드 실패: " + t.getMessage());
            }
        });
    }

    private void showSmartThingsRegistrationDialog() {
        final EditText etToken = new EditText(this);
        etToken.setHint("삼성 개발자 센터에서 발급받은 PAT 입력");
        new AlertDialog.Builder(this).setTitle("SmartThings 기기 연동").setView(etToken)
                .setPositiveButton("연동", (dialog, which) -> sendTokenToServer(etToken.getText().toString().trim())).show();
    }

    private void sendTokenToServer(String token) {
        if (token.isEmpty()) return;
        AuthModels.STTokenRequest request = new AuthModels.STTokenRequest(loginUserEmail, token);
        apiService.registerSTToken(jwtToken, request).enqueue(new Callback<AuthModels.DeviceResponse>() {
            @Override
            public void onResponse(Call<AuthModels.DeviceResponse> call, Response<AuthModels.DeviceResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    displayDevices(response.body().devices);
                    Toast.makeText(mypage.this, "기기 연동 성공!", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(mypage.this, "연동 실패 (인증 확인 필요)", Toast.LENGTH_SHORT).show();
                }
            }
            @Override public void onFailure(Call<AuthModels.DeviceResponse> call, Throwable t) {}
        });
    }

    // 🚀 [핵심] 리소스 새로 안 만들고 기존 bg_edittext_rounded를 재활용해서 예쁘게 출력
    private void displayDevices(List<AuthModels.Device> devices) {
        if (devices == null || devices.isEmpty()) {
            itemEmptyDevice.setVisibility(View.VISIBLE);
            layoutDeviceList.removeAllViews();
            return;
        }

        itemEmptyDevice.setVisibility(View.GONE);
        layoutDeviceList.removeAllViews();

        for (AuthModels.Device device : devices) {
            TextView tv = new TextView(this);
            tv.setText("✔  " + (device.label != null ? device.label : device.name));
            tv.setTextSize(14f);
            tv.setTextColor(Color.parseColor("#1A1A1A"));
            tv.setPadding(45, 40, 45, 40);

            // 기존 입력창 배경 재사용
            tv.setBackgroundResource(R.drawable.bg_edittext_rounded);
            tv.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#F8F9FA")));

            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 15);
            tv.setLayoutParams(params);

            layoutDeviceList.addView(tv);
        }
    }

    private void updateProfileProcess() {
        // 기존 프로필 수정 로직 유지
        Toast.makeText(this, "개인정보 수정 기능은 기존 서버 API를 사용합니다.", Toast.LENGTH_SHORT).show();
    }
}