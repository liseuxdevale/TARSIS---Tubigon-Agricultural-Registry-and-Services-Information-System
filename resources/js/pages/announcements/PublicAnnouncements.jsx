import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import Footer from '../../components/landing/Footer';
import Header from '../../components/landing/Header';
import { api } from '../../services/api';
import { normalizeAnnouncements } from '../../utils/announcements';

export default function PublicAnnouncements() {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        api.get('/announcements?per_page=50')
            .then((response) => setAnnouncements(normalizeAnnouncements(response.data.data || [])))
            .catch(() => setAnnouncements([]));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main id="main-content">
                <section className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a4731]">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to landing
                        </Link>
                        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-[#c8952a]">Public information</p>
                        <h1 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">Announcements</h1>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">Official program notices, schedules, deadlines, and agriculture announcements for Tubigon beneficiaries.</p>
                    </div>
                </section>
                <section className="py-12">
                    <div className="mx-auto grid max-w-screen-xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
                        {announcements.map((announcement) => (
                            <Link key={announcement.id} to={announcement.href} className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#c8952a]/60 hover:shadow-md">
                                <div className="aspect-[16/9] bg-slate-200">
                                    <img src={announcement.img} alt="" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="rounded bg-[#e8f1ec] px-2 py-1 font-bold text-[#1a4731]">{announcement.tag}</span>
                                        <span className="inline-flex items-center gap-1 text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{announcement.date}</span>
                                    </div>
                                    <h2 className="mt-4 text-base font-bold leading-6 text-slate-950">{announcement.title}</h2>
                                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{announcement.excerpt}</p>
                                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1a4731]">Read announcement <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                                </div>
                            </Link>
                        ))}
                        {!announcements.length && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 sm:col-span-2 lg:col-span-3">
                                No public announcements yet.
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
