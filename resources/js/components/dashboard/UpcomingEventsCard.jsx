import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common';
import { formatDate } from '../../utils/format';

export default function UpcomingEventsCard({ announcements = [], barangays = [] }) {
    const barangayNames = Object.fromEntries(barangays.map((barangay) => [barangay.id, barangay.name]));
    const upcoming = announcements.filter(isWithinNextWeek);

    return (
        <Card title="Upcoming Events / Barangay Distributions">
            <div className="space-y-3">
                {upcoming.length ? upcoming.map((announcement) => {
                    const targets = Array.isArray(announcement.target_barangays) && announcement.target_barangays.length
                        ? announcement.target_barangays.map((id) => barangayNames[id]).filter(Boolean).join(', ')
                        : 'General';
                    return (
                        <Link
                            key={announcement.id}
                            to={`/advisories/${announcement.id}`}
                            className="block rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-slate-950">{announcement.title}</p>
                                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold capitalize text-emerald-800">{String(announcement.type).replaceAll('_', ' ')}</span>
                            </div>
                            <p className="mt-1 text-slate-600">{eventDateText(announcement)}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">Target: {targets}</p>
                        </Link>
                    );
                }) : <p className="text-sm text-slate-500">No upcoming events or barangay distributions scheduled.</p>}
            </div>
        </Card>
    );
}

function isWithinNextWeek(announcement) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    weekFromNow.setHours(23, 59, 59, 999);

    const publishAt = announcement.publish_at ? new Date(announcement.publish_at) : null;
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null;

    if (publishAt && publishAt >= now && publishAt <= weekFromNow) return true;
    if (expiresAt && expiresAt >= now && expiresAt <= weekFromNow) return true;
    return Boolean(publishAt && expiresAt && publishAt <= weekFromNow && expiresAt >= now);
}

function eventDateText(announcement) {
    if (announcement.publish_at && announcement.expires_at) {
        return `${formatDate(announcement.publish_at)} - ${formatDate(announcement.expires_at)}`;
    }

    return formatDate(announcement.publish_at || announcement.expires_at);
}
