package com.example.myapplication1;

import com.google.gson.annotations.SerializedName;
import java.util.List;
import java.io.Serializable;

public class AuthModels {

    // === 1. 인증 및 계정 관련 모델 ===
    public static class VerifyRequest {
        String email;
        public VerifyRequest(String email) { this.email = email; }
    }

    public static class CodeCheckRequest {
        String email;
        String code;
        public CodeCheckRequest(String email, String code) {
            this.email = email;
            this.code = code;
        }
    }

    public static class SignupRequest {
        String email;
        String username;
        String password;
        boolean consent;
        String babyBirth;

        public SignupRequest(String email, String username, String password, boolean consent, String babyBirth) {
            this.email = email;
            this.username = username;
            this.password = password;
            this.consent = consent;
            this.babyBirth = babyBirth;
        }
    }

    public static class LoginRequest {
        String username;
        String password;
        public LoginRequest(String username, String password) {
            this.username = username;
            this.password = password;
        }
    }

    public static class UserResponse {
        @SerializedName("ok") public boolean ok;
        @SerializedName("message") public String message;
        @SerializedName("accessToken") public String accessToken;
        @SerializedName("refreshToken") public String refreshToken;
        @SerializedName("userId") public String userId;
    }

    public static class ResetPasswordRequest {
        String email;
        String newPassword;
        public ResetPasswordRequest(String email, String newPassword) {
            this.email = email;
            this.newPassword = newPassword;
        }
    }

    public static class UpdateProfileRequest {
        public String username;
        public String name;
        public String babyBirth;
        public String currentPassword;
        public String newPassword;

        public UpdateProfileRequest(String username, String name, String babyBirth,
                                    String currentPassword, String newPassword) {
            this.username = username;
            this.name = name;
            this.babyBirth = babyBirth;
            this.currentPassword = currentPassword;
            this.newPassword = newPassword;
        }
    }

    // === 2. 복지 및 일정 관련 모델 ===
    public static class PolicyResponse implements Serializable {
        @SerializedName("서비스명") public String title;
        @SerializedName("서비스요약") public String summary;
        @SerializedName("소관부처명") public String department;
        @SerializedName("소관조직명") public String subDepartment;
        @SerializedName("서비스URL") public String url;
    }

    public static class VaccineResponse implements Serializable {
        @SerializedName("_id") public String id;
        @SerializedName("name") public String name;
        @SerializedName("degree") public int degree;
        @SerializedName("dueDate") public String dueDate;
        @SerializedName("dDay") public int dDay;
        @SerializedName("description") public String description;
    }

    public static class VaccineUpdate {
        @SerializedName("dueDate") public String dueDate;
        public VaccineUpdate(String dueDate) { this.dueDate = dueDate; }
    }

    // === 3. 환경 데이터 모델 ===
    public static class SleepResponse implements Serializable {
        @SerializedName("time") public String time;
        @SerializedName("temp") public float temp;
        @SerializedName("humidity") public float humidity;
        @SerializedName("noise") public float noise;
        @SerializedName("score") public float score;
        @SerializedName("status") public String status;
        @SerializedName("isEmergency") public boolean isEmergency;
    }

    // === 4. SmartThings 연동 모델 ===
    public static class STTokenRequest {
        @SerializedName("email") public String email;
        @SerializedName("token") public String token;
        public STTokenRequest(String email, String token) {
            this.email = email;
            this.token = token;
        }
    }

    public static class DeviceResponse {
        @SerializedName("ok") public boolean ok;
        @SerializedName("message") public String message;
        @SerializedName("devices") public List<Device> devices;
    }

    public static class Device {
        @SerializedName("deviceId") public String deviceId;
        @SerializedName("name") public String name;
        @SerializedName("label") public String label;
    }

    // === 5. 🍼 비디오 분석 결과 모델 (WebSocket 수신용) ===
    // Node.js가 Flask 결과를 받아 "analysisResult" 타입으로 쏴줄 때 사용함
    public static class AnalysisResponse implements Serializable {
        @SerializedName("timestamp") public long timestamp;
        @SerializedName("result") public AnalysisData result;

        public static class AnalysisData {
            // Node.js의 response.data 부분
            @SerializedName("data") public InnerData data;
        }

        public static class InnerData {
            // Node.js의 response.data.data.result 부분
            @SerializedName("result") public DetectionResult detectionResult;
        }

        public static class DetectionResult {
            @SerializedName("infant_detected") public boolean infantDetected;
            @SerializedName("confidence") public float confidence;
        }
    }
}