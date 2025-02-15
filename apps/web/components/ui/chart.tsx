"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

interface ChartProps {
    data: Array<{ name: string; total: number }>;
    categories: string[];
    index: string;
    colors: string[];
    valueFormatter: (value: number) => string;
    className?: string;
}

export function LineChart({
    data,
    categories,
    index,
    colors,
    valueFormatter,
    className,
}: ChartProps) {
    const chartData: ChartData<"line"> = {
        labels: data.map((item) => item.name),
        datasets: [
            {
                label: categories[0],
                data: data.map((item) => item.total),
                borderColor: colors[0],
                backgroundColor: colors[0],
                tension: 0.4,
            },
        ],
    };

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: valueFormatter,
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return (
        <div className={className}>
            <Line data={chartData} options={options} />
        </div>
    );
}

export function BarChart({
    data,
    categories,
    index,
    colors,
    valueFormatter,
    className,
}: ChartProps) {
    const chartData: ChartData<"bar"> = {
        labels: data.map((item) => item.name),
        datasets: [
            {
                label: categories[0],
                data: data.map((item) => item.total),
                backgroundColor: colors[0],
            },
        ],
    };

    const options: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: valueFormatter,
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return (
        <div className={className}>
            <Bar data={chartData} options={options} />
        </div>
    );
}
