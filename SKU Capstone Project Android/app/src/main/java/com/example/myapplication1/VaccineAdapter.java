package com.example.myapplication1;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class VaccineAdapter extends RecyclerView.Adapter<VaccineAdapter.ViewHolder> {

    private List<AuthModels.VaccineResponse> vaccineList;

    public VaccineAdapter(List<AuthModels.VaccineResponse> vaccineList) {
        this.vaccineList = vaccineList;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        // 안드로이드 기본 레이아웃 대신, 우리가 만든 item_vaccine을 인플레이트합니다.
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_vaccine, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AuthModels.VaccineResponse item = vaccineList.get(position);

        // 1. 백신 이름과 회차 (예: B형간염 2차)
        holder.tvVaccineName.setText(item.name + " (" + item.degree + "차)");

        // 2. 날짜 및 D-Day 텍스트 구성
        String dDayText = (item.dDay >= 0) ? " (D-" + item.dDay + ")" : " (기간 지남)";
        holder.tvVaccineDate.setText(item.dueDate + dDayText);
    }

    @Override
    public int getItemCount() {
        return vaccineList.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TextView tvVaccineName;
        public TextView tvVaccineDate;

        public ViewHolder(View itemView) {
            super(itemView);
            // item_vaccine.xml에서 설정한 ID로 연결합니다.
            tvVaccineName = itemView.findViewById(R.id.tvVaccineName);
            tvVaccineDate = itemView.findViewById(R.id.tvVaccineDate);
        }
    }
}