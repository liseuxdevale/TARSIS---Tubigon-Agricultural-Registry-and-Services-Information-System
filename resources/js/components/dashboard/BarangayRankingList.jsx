import React from 'react';
import { Card } from '../common';

export default function BarangayRankingList({ barangays = [] }) {
    return (
        <Card title="Barangay Ranking - Most to Least Registrants">
            <div className="max-h-80 space-y-2 overflow-auto pr-2">
                {barangays.map((barangay, index) => (
                    <div key={barangay.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                        <span className="min-w-0 font-medium text-slate-700">
                            <span className="mr-2 text-xs font-bold text-slate-400">#{barangay.ranking_number || index + 1}</span>
                            {barangay.name}
                        </span>
                        <span className={barangay.is_underserved ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
                            {barangay.registrants_count}
                        </span>
                    </div>
                ))}
                {!barangays.length && <p className="text-sm text-slate-500">No barangay data yet.</p>}
            </div>
        </Card>
    );
}
