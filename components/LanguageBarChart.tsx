"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export type ChartData = {
    name: string;
    value: number;
    color?: string;
};

const DEFAULT_COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

export function LanguageBarChart({ data, title = "Language Distribution" }: { data: ChartData[], title?: string }) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-sm">No chart data available.</span>
            </div>
        );
    }

    // Assign colors if not provided
    const processedData = data.map((entry, index) => ({
        ...entry,
        fill: entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));

    return (
        <div className="w-full bg-zinc-900/80 rounded-xl border border-zinc-800 p-6 shadow-2xl backdrop-blur-md">
            <h3 className="text-sm font-semibold text-zinc-300 mb-6 tracking-wide uppercase">{title}</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={processedData}
                        margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                        layout="vertical"
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#3f3f46" opacity={0.4} />
                        <XAxis type="number" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        
                        <Tooltip 
                            cursor={{ fill: '#3f3f46', opacity: 0.2 }}
                            contentStyle={{ 
                                backgroundColor: '#18181b', 
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#e4e4e7', fontSize: '13px' }}
                        />
                        
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {processedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
