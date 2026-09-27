import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Field, PageHeader, PageLoader, SearchBar } from '../../components/common';
import { useResource } from '../../hooks/useResource';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';

const categoryColors = {
    Crops: 'bg-green-100 text-green-700',
    Fisheries: 'bg-blue-100 text-blue-700',
    Livestock: 'bg-amber-100 text-amber-700',
    Poultry: 'bg-red-100 text-red-700',
    General: 'bg-gray-100 text-gray-600',
};

export default function Advisory() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [publication, setPublication] = useState('');
    const { data, loading } = useResource(
        () => api.get('/announcements/visible?per_page=50').then((response) => response.data.data || []),
        []
    );

    const rows = (data || []).map(toAnnouncementCard);
    const filteredRows = useMemo(() => rows.filter((announcement) => {
        const searchable = `${announcement.title} ${announcement.category} ${announcement.date} ${announcement.content} ${announcement.publication || 'Published'}`.toLowerCase();
        return searchable.includes(search.trim().toLowerCase())
            && (!category || announcement.category === category)
            && (!publication || (announcement.publication || 'Published') === publication);
    }), [category, publication, rows, search]);

    if (loading) return <PageLoader />;

    return (
        <section className="space-y-4">
            <PageHeader title="Announcements & Bulletins" description="Official announcements from Tubigon MAO" />

            <Card>
                <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Search announcements">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search title, category, date, or content" />
                    </Field>
                    <AdvisoryFilter label="Category" value={category} options={['Crops', 'Fisheries', 'Livestock', 'Poultry', 'General']} onChange={setCategory} />
                    <AdvisoryFilter label="Publication" value={publication} options={['Published', 'Scheduled', 'Unscheduled']} onChange={setPublication} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-500">{filteredRows.length} of {rows.length} announcements</p>
                    <button className="mini-btn" onClick={() => { setSearch(''); setCategory(''); setPublication(''); }}>Clear filters</button>
                </div>
            </Card>

            {filteredRows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredRows.map((announcement) => {
                    const content = (
                        <article className="flex h-full min-h-60 flex-col rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="text-base font-bold leading-6 text-gray-900">{announcement.title}</h2>
                                <span className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${categoryColors[announcement.category] ?? categoryColors.General}`}>
                                    {announcement.category}
                                </span>
                            </div>
                            <div className="my-4 flex items-center justify-between border-y border-gray-100 py-3 text-xs">
                                <span className="font-medium text-gray-500">{announcement.date}</span>
                                <span className="rounded-md bg-emerald-100 px-2 py-1 font-bold text-emerald-800">{announcement.publication || 'Published'}</span>
                            </div>
                            <p className="line-clamp-5 text-sm leading-6 text-gray-600">{announcement.content}</p>
                            <span className="mt-auto pt-5 text-sm font-bold text-emerald-700">Read announcement</span>
                        </article>
                    );

                    return (
                    <Link key={announcement.id} to={`/advisories/${announcement.id}`} className="block h-full">
                        {content}
                    </Link>
                    );
                })}
            </div> : (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-10 text-center text-sm font-medium text-gray-500 shadow-sm">
                    No announcements found.
                </div>
            )}
        </section>
    );
}

function toAnnouncementCard(row) {
    const publishTime = row.publish_at ? new Date(row.publish_at).getTime() : null;
    return {
        id: row.id,
        title: row.title,
        category: categoryFromAnnouncement(row),
        date: formatDate(row.publish_at),
        content: row.body,
        publication: publishTime === null || Number.isNaN(publishTime) ? 'Unscheduled' : publishTime > Date.now() ? 'Scheduled' : 'Published',
    };
}

function AdvisoryFilter({ label, value, options, onChange }) {
    return (
        <Field label={label}>
            <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">All</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </Field>
    );
}

function categoryFromAnnouncement(row) {
    const sectors = row.target_sectors || [];
    if (sectors.length === 1) {
        return {
            farmer: 'Crops',
            fisherfolk: 'Fisheries',
            livestock: 'Livestock',
            poultry: 'Poultry',
        }[sectors[0]] || 'General';
    }

    const type = row.type;
    const map = {
        distribution_schedule: 'Crops',
        pest: 'Crops',
        disease: 'Livestock',
        calamity: 'General',
        advisory: 'General',
        bulletin: 'General',
    };

    return map[type] || 'General';
}
