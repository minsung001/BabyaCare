package com.example.myapplication1;

import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DeviceAdapter extends RecyclerView.Adapter<DeviceAdapter.DeviceViewHolder> {

    private static final String TAG = "DeviceAdapter";

    private final List<AuthModels.Device> devices;
    private final ApiService apiService;
    private final String accessToken;

    // 기기별 현재 온도/습도 저장
    private final double[] temps;
    private final double[] humids;

    public DeviceAdapter(List<AuthModels.Device> devices, ApiService apiService, String accessToken) {
        this.devices = devices;
        this.apiService = apiService;
        this.accessToken = accessToken;
        this.temps = new double[devices.size()];
        this.humids = new double[devices.size()];
    }

    @NonNull
    @Override
    public DeviceViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_device, parent, false);
        return new DeviceViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull DeviceViewHolder holder, int position) {
        AuthModels.Device device = devices.get(position);

        holder.tvDeviceName.setText(
                device.label != null && !device.label.isEmpty() ? device.label : device.name
        );

        // 상태 로드
        loadDeviceStatus(holder, device.deviceId, position);

        // 온도 올리기
        holder.btnTempUp.setOnClickListener(v ->
                controlDevice(holder, device.deviceId, position,
                        "temperatureMeasurement", "up", temps[position]));

        // 온도 내리기
        holder.btnTempDown.setOnClickListener(v ->
                controlDevice(holder, device.deviceId, position,
                        "temperatureMeasurement", "down", temps[position]));

        // 습도 올리기
        holder.btnHumidUp.setOnClickListener(v ->
                controlDevice(holder, device.deviceId, position,
                        "relativeHumidityMeasurement", "up", humids[position]));

        // 습도 내리기
        holder.btnHumidDown.setOnClickListener(v ->
                controlDevice(holder, device.deviceId, position,
                        "relativeHumidityMeasurement", "down", humids[position]));
    }

    private void loadDeviceStatus(DeviceViewHolder holder, String deviceId, int position) {
        apiService.getDeviceStatus("Bearer " + accessToken, deviceId)
                .enqueue(new Callback<AuthModels.DeviceStatusResponse>() {
                    @Override
                    public void onResponse(@NonNull Call<AuthModels.DeviceStatusResponse> call,
                                           @NonNull Response<AuthModels.DeviceStatusResponse> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().ok) {
                            temps[position] = response.body().temperature;
                            humids[position] = response.body().humidity;
                            updateUI(holder, position);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<AuthModels.DeviceStatusResponse> call, @NonNull Throwable t) {
                        Log.e(TAG, "상태 조회 실패: " + t.getMessage());
                    }
                });
    }

    private void controlDevice(DeviceViewHolder holder, String deviceId, int position,
                               String capability, String command, double value) {
        AuthModels.ControlRequest request = new AuthModels.ControlRequest(
                deviceId, capability, command, value
        );

        apiService.controlDevice("Bearer " + accessToken, request)
                .enqueue(new Callback<AuthModels.ControlResponse>() {
                    @Override
                    public void onResponse(@NonNull Call<AuthModels.ControlResponse> call,
                                           @NonNull Response<AuthModels.ControlResponse> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().ok) {
                            temps[position] = response.body().temperature;
                            humids[position] = response.body().humidity;
                            updateUI(holder, position);
                        } else {
                            Toast.makeText(holder.itemView.getContext(),
                                    "제어 실패", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<AuthModels.ControlResponse> call, @NonNull Throwable t) {
                        Log.e(TAG, "제어 실패: " + t.getMessage());
                        Toast.makeText(holder.itemView.getContext(),
                                "서버 연결 실패", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void updateUI(DeviceViewHolder holder, int position) {
        holder.itemView.post(() -> {
            holder.tvTempValue.setText(String.format("%.1f°C", temps[position]));
            holder.tvHumidValue.setText(String.format("%.1f%%", humids[position]));
        });
    }

    @Override
    public int getItemCount() {
        return devices.size();
    }

    static class DeviceViewHolder extends RecyclerView.ViewHolder {
        TextView tvDeviceName, tvTempValue, tvHumidValue;
        ImageButton btnTempUp, btnTempDown, btnHumidUp, btnHumidDown;

        DeviceViewHolder(@NonNull View itemView) {
            super(itemView);
            tvDeviceName = itemView.findViewById(R.id.tvDeviceName);
            tvTempValue  = itemView.findViewById(R.id.tvTempValue);
            tvHumidValue = itemView.findViewById(R.id.tvHumidValue);
            btnTempUp    = itemView.findViewById(R.id.btnTempUp);
            btnTempDown  = itemView.findViewById(R.id.btnTempDown);
            btnHumidUp   = itemView.findViewById(R.id.btnHumidUp);
            btnHumidDown = itemView.findViewById(R.id.btnHumidDown);
        }
    }
}