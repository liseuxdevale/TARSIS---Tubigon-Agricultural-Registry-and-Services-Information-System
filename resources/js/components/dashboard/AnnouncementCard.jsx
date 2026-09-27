import React from 'react';
import { Card, StatusBadge } from '../common';
import { formatDate } from '../../utils/format';

export default function AnnouncementCard({ announcements = [] }) {
    return (
        <Card title="Recent Announcements">
            <div className="space-y-3">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-950">{announcement.title}</p>
                            <StatusBadge status={announcement.type} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(announcement.publish_at)}</p>
                    </div>
                ))}
                {!announcements.length && <p className="text-sm text-slate-500">No announcements yet.</p>}
            </div>
        </Card>
    );
}
