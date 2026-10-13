import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { announcementStatusLabel, announcementStatusLink } from '../../utils/announcements';

export default function Hero({ announcements = [] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [parallaxOffset, setParallaxOffset] = useState(0);
    const touchStartRef = useRef(null);
    const suppressClickRef = useRef(false);
    const heroRef = useRef(null);
    const active = announcements[activeIndex] || announcements[0] || {
        title: 'Welcome to TARSIS',
        tag: 'Tubigon Agriculture and Fisheries',
        excerpt: 'Registration and services for farmers and fisherfolk in Tubigon, Bohol.',
        date: '',
    };
    const announcementHref = active?.href || '/announcements';
    const isAnnouncementSlide = ['Advisory', 'Announcement'].includes(active?.tag);
    const statusHref = announcementStatusLink(active?.type);
    const statusLabel = announcementStatusLabel(active?.type);

    useEffect(() => {
        if (announcements.length < 2) return undefined;

        const timer = window.setInterval(() => {
            setActiveIndex((index) => (index + 1) % announcements.length);
        }, 6000);

        return () => window.clearInterval(timer);
    }, [announcements.length]);

    useEffect(() => {
        setActiveIndex(0);
    }, [announcements]);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return undefined;

        let animationFrame = 0;

        const updateParallax = () => {
            animationFrame = 0;
            const rect = heroRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            if (rect.bottom < 0 || rect.top > viewportHeight) return;

            setParallaxOffset(Math.round(rect.top * -0.34));
        };

        const requestParallaxUpdate = () => {
            if (animationFrame) return;
            animationFrame = window.requestAnimationFrame(updateParallax);
        };

        updateParallax();
        window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
        window.addEventListener('resize', requestParallaxUpdate);

        return () => {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            window.removeEventListener('scroll', requestParallaxUpdate);
            window.removeEventListener('resize', requestParallaxUpdate);
        };
    }, []);

    const goToPrevious = () => setActiveIndex((index) => (index === 0 ? announcements.length - 1 : index - 1));
    const goToNext = () => setActiveIndex((index) => (index + 1) % announcements.length);

    const handleTouchStart = (event) => {
        touchStartRef.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event) => {
        if (touchStartRef.current === null || announcements.length < 2) return;

        const distance = touchStartRef.current - (event.changedTouches[0]?.clientX ?? touchStartRef.current);
        touchStartRef.current = null;

        if (Math.abs(distance) < 45) return;

        suppressClickRef.current = true;
        if (distance > 0) goToNext();
        else goToPrevious();
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 0);
    };

    const handleAnnouncementClick = (event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        suppressClickRef.current = false;
    };

    return (
        <section
            ref={heroRef}
            id="home"
            className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-[#1a4731] text-white"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {active.img && <img
                src={active.img}
                alt=""
                className="absolute inset-x-0 -top-20 h-[calc(100%+10rem)] w-full object-cover opacity-30 transition-opacity duration-500 will-change-transform"
                style={{ transform: `translate3d(0, ${parallaxOffset}px, 0) scale(1.08)` }}
                aria-hidden="true"
            />}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(26,71,49,0.94)_0%,rgba(26,71,49,0.76)_58%,rgba(26,71,49,0.44)_100%)]" />
            <Link
                to={announcementHref}
                className="absolute inset-0 z-10 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#c8952a]/50"
                aria-label={`Open announcements for ${active.title}`}
                onClick={handleAnnouncementClick}
            />

            <div className="pointer-events-none relative z-20 mx-auto w-full max-w-screen-xl px-4 py-24 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">
                        Official Digital Platform - Tubigon, Bohol
                    </p>
                    <h1 className="mb-5 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                        {active.title}
                    </h1>
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
                        {active.tag}{active.date ? ` / ${active.date}` : ''}
                    </p>
                    <p className="mb-8 text-base leading-relaxed text-white/80 sm:text-lg">
                        {active.excerpt}
                    </p>
                    {isAnnouncementSlide ? (
                        <Link
                            to={announcementHref}
                            className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8952a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b68425] focus:outline-none focus:ring-2 focus:ring-[#c8952a]/40"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <Megaphone className="h-4 w-4" aria-hidden="true" />
                            Check Announcement
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/signup"
                                state={{ from: { pathname: '/registration' } }}
                                className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8952a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b68425] focus:outline-none focus:ring-2 focus:ring-[#c8952a]/40"
                                onClick={(event) => event.stopPropagation()}
                            >
                                Register as Beneficiary <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Link
                                to={statusHref}
                                className="pointer-events-auto inline-flex min-h-12 items-center rounded-lg border border-white/55 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                                onClick={(event) => event.stopPropagation()}
                            >
                                {statusLabel}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4">
                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Previous announcement"
                    onClick={goToPrevious}
                >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                    {announcements.map((announcement, index) => (
                        <button
                            key={announcement.id}
                            type="button"
                            className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-[#c8952a]' : 'w-2 bg-white/50'}`}
                            aria-label={`Show announcement ${index + 1}`}
                            aria-current={index === activeIndex}
                            onClick={() => setActiveIndex(index)}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Next announcement"
                    onClick={goToNext}
                >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
        </section>
    );
}
