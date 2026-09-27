import React, { useEffect, useRef } from 'react';
import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    PieController,
    Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, PieController, ArcElement, Tooltip, Legend);

export default function ChartBox({ type, labels, values, colors }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return undefined;
        const styles = getComputedStyle(canvasRef.current.closest('[data-role]') || document.documentElement);
        const muted = styles.getPropertyValue('--role-muted').trim() || '#64748b';
        const border = styles.getPropertyValue('--role-border').trim() || '#e2e8f0';
        const chart = new Chart(canvasRef.current, {
            type,
            data: {
                labels,
                datasets: [{
                    label: 'Total',
                    data: values,
                    backgroundColor: type === 'pie'
                        ? (colors || ['#047857', '#0284c7', '#d97706', '#475569', '#65a30d', '#0f766e'])
                        : (colors || '#0f766e'),
                    borderColor: type === 'pie' ? '#ffffff' : (Array.isArray(colors) ? colors.map(() => '#ffffff') : '#115e59'),
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: type === 'pie', labels: { boxWidth: 12, color: muted, font: { family: 'Instrument Sans' } } },
                },
                scales: type === 'bar' ? {
                    x: { grid: { display: false }, ticks: { color: muted } },
                    y: { beginAtZero: true, grid: { color: border }, ticks: { color: muted } },
                } : {},
            },
        });

        return () => chart.destroy();
    }, [type, labels.join('|'), values.join('|'), Array.isArray(colors) ? colors.join('|') : colors]);

    return <div className="h-80 rounded-md" style={{ background: 'var(--role-surface)' }}><canvas ref={canvasRef} /></div>;
}
