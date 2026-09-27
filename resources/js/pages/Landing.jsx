import React, { useEffect, useState } from 'react';
import AboutSection from '../components/landing/AboutSection';
import AnnouncementsFeed from '../components/landing/AnnouncementsFeed';
import CtaBand from '../components/landing/CtaBand';
import DigitalIdSection from '../components/landing/DigitalIdSection';
import Footer from '../components/landing/Footer';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import ServiceTiles from '../components/landing/ServiceTiles';
import TeamSection from '../components/landing/TeamSection';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { normalizeAnnouncements } from '../utils/announcements';

export default function Landing() {
    const { signedIn, loading } = useAuth();
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        if (loading) return undefined;

        const endpoint = signedIn ? '/announcements/visible?per_page=6' : '/announcements?per_page=6';

        api.get(endpoint)
            .catch(() => api.get('/announcements?per_page=6'))
            .then((response) => setAnnouncements(normalizeAnnouncements(response.data.data || [])))
            .catch(() => setAnnouncements([]));
    }, [loading, signedIn]);

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Header />
            <main id="main-content">
                <Hero announcements={announcements} />
                <AboutSection />
                <TeamSection />
                <AnnouncementsFeed announcements={announcements} />
                <ServiceTiles />
                <DigitalIdSection />
                <CtaBand />
            </main>
            <Footer />
        </div>
    );
}
