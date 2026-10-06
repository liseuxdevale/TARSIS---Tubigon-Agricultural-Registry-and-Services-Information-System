import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const tagTones = {
    Distribution: 'bg-green-100 text-green-800',
    Insurance: 'bg-violet-100 text-violet-800',
    Advisory: 'bg-red-100 text-red-800',
    Program: 'bg-yellow-100 text-yellow-800',
    Event: 'bg-blue-100 text-blue-800',
};

export default function AnnouncementsFeed({ announcements = [] }) {
    const visible = 3;
    const maxStart = Math.max(0, announcements.length - visible);
    const [slideStart, setSlideStart] = useState(0);
    const touchStartRef = useRef(null);
    const suppressClickRef = useRef(false);
    const currentCards = useMemo(() => announcements.slice(slideStart, slideStart + visible), [announcements, slideStart]);

    useEffect(() => {
        if (announcements.length <= visible) return undefined;

        const timer = window.setInterval(() => {
            setSlideStart((start) => (start >= maxStart ? 0 : start + 1));
        }, 5000);

        return () => window.clearInterval(timer);
    }, [announcements.length, maxStart]);

    useEffect(() => {
        setSlideStart(0);
    }, [announcements]);

    const previous = () => setSlideStart((start) => Math.max(0, start - 1));
    const next = () => setSlideStart((start) => Math.min(maxStart, start + 1));
    const handleTouchStart = (event) => {
        touchStartRef.current = event.touches[0]?.clientX ?? null;
    };
    const handleTouchEnd = (event) => {
        if (touchStartRef.current === null || announcements.length <= 1) return;

        const distance = touchStartRef.current - (event.changedTouches[0]?.clientX ?? touchStartRef.current);
        touchStartRef.current = null;

        if (Math.abs(distance) < 45) return;

        suppressClickRef.current = true;
        if (distance > 0) next();
        else previous();
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 0);
    };
    const handleCardClick = (event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        suppressClickRef.current = false;
    };

    return (
        <section id="announcements" className="bg-gray-50 py-16 sm:py-20">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">Latest Updates</p>
                        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">MAO Announcements and Programs</h2>
                    </div>
                    <Link className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#1a4731] transition hover:opacity-75" to="/announcements">
                        View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>

                <div className="hidden grid-cols-3 gap-6 lg:grid">
                    {currentCards.map((announcement) => (
                        <AnnouncementCard key={announcement.id} announcement={announcement} />
                    ))}
                </div>

                <div className="lg:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    {announcements[slideStart] && <AnnouncementCard announcement={announcements[slideStart]} onClick={handleCardClick} />}
                </div>

                {announcements.length > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={previous}
                            disabled={slideStart === 0}
                            aria-label="Previous announcements"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white disabled:opacity-30"
                        >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div className="flex gap-2">
                            {Array.from({ length: maxStart + 1 }).map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setSlideStart(index)}
                                    aria-label={`Go to announcement group ${index + 1}`}
                                    aria-current={index === slideStart}
                                    className={`h-2 rounded-full transition-all ${index === slideStart ? 'w-6 bg-[#1a4731]' : 'w-2 bg-slate-300'}`}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={next}
                            disabled={slideStart >= maxStart}
                            aria-label="Next announcements"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white disabled:opacity-30"
                        >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

function AnnouncementCard({ announcement, onClick }) {
    const href = announcement.href || '/announcements';

    return (
        <Link
            to={href}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-[#c8952a]/60 hover:shadow-md hover:shadow-slate-950/10 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25"
            aria-label={`Open announcements for ${announcement.title}`}
            onClick={onClick}
        >
            <div className="h-44 bg-slate-200">
                <img src={announcement.img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tagTones[announcement.tag] || 'bg-slate-100 text-slate-700'}`}>
                        {announcement.tag}
                    </span>
                    <span className="text-xs text-slate-400">{announcement.date}</span>
                </div>
                <h3 className="text-sm font-semibold leading-snug text-slate-950">{announcement.title}</h3>
                <p className="flex-1 text-xs leading-relaxed text-slate-500">{announcement.excerpt}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1a4731] transition group-hover:opacity-75">
                    Read more <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
            </div>
        </Link>
    );
}
