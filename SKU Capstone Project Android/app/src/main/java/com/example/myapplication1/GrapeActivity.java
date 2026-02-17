package com.example.myapplication1;

import android.graphics.Color;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class GrapeActivity extends AppCompatActivity {

    private LineChart sleepChart;
    private TextView tvSleepScore, tvStatusMsg, tvCurrentTemp;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_grape);

        // UI 요소 연결
        sleepChart = findViewById(R.id.sleep_chart);
        tvSleepScore = findViewById(R.id.tv_sleep_score);
        tvStatusMsg = findViewById(R.id.tv_status_msg);
        tvCurrentTemp = findViewById(R.id.tv_current_temp);

        // 서버 데이터 로드
        loadSleepData();
    }

    private void loadSleepData() {
        ApiService apiService = RetrofitClient.getApiService();
        apiService.getSleepData().enqueue(new Callback<List<AuthModels.SleepResponse>>() {
            @Override
            public void onResponse(Call<List<AuthModels.SleepResponse>> call, Response<List<AuthModels.SleepResponse>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    updateUI(response.body());
                } else {
                    tvStatusMsg.setText("데이터 분석 결과를 가져오지 못했습니다.");
                }
            }

            @Override
            public void onFailure(Call<List<AuthModels.SleepResponse>> call, Throwable t) {
                tvStatusMsg.setText("서버 연결 실패: " + t.getMessage());
            }
        });
    }

    private void updateUI(List<AuthModels.SleepResponse> dataList) {
        if (dataList.isEmpty()) return;

        ArrayList<Entry> entries = new ArrayList<>();
        ArrayList<String> labels = new ArrayList<>();
        boolean isEmergencyDetected = false;

        for (int i = 0; i < dataList.size(); i++) {
            AuthModels.SleepResponse data = dataList.get(i);

            // 서버에서 미리 계산된 점수 사용
            entries.add(new Entry(i, data.score));
            labels.add(data.time);

            // 마지막 데이터로 상단 요약 정보 표시
            if (i == dataList.size() - 1) {
                tvSleepScore.setText((int) data.score + "점");
                tvCurrentTemp.setText(String.format("%.1f°C", data.temp));
                tvStatusMsg.setText(data.status);

                isEmergencyDetected = data.isEmergency;
                tvStatusMsg.setTextColor(isEmergencyDetected ? Color.RED : Color.parseColor("#666666"));
            }
        }

        // 차트 그리기
        LineDataSet dataSet = new LineDataSet(entries, "수면 점수");
        // 위급 상황이 포함되어 있다면 그래프 색상을 빨간색으로 변경
        int themeColor = isEmergencyDetected ? Color.RED : Color.parseColor("#4A90E2");

        dataSet.setColor(themeColor);
        dataSet.setCircleColor(themeColor);
        dataSet.setLineWidth(3f);
        dataSet.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        dataSet.setDrawValues(false);
        sleepChart.setData(new LineData(dataSet));
        sleepChart.getXAxis().setValueFormatter(new IndexAxisValueFormatter(labels));
        sleepChart.invalidate(); // 차트 새로고침
    }
}