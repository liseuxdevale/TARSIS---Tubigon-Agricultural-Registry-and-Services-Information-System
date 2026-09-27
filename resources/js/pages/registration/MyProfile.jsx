import React, { useEffect, useState } from 'react';
import { EmptyState, PageLoader } from '../../components/common';
import { api } from '../../services/api';
import Profile from './Profile';

export default function MyProfile() {
    const [profile, setProfile] = useState(null);
    const [digitalId, setDigitalId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function load() {
            setLoading(true);
            setError('');

            try {
                const response = await api.get('/tracking/me');
                const registrant = response.data.registrant;

                if (!active) return;

                if (!registrant) {
                    setProfile(null);
                    setDigitalId(null);
                    return;
                }

                setProfile(registrant);
                const idResponse = await api.get(`/registrants/${registrant.id}/digital-id`);

                if (active) {
                    setDigitalId(idResponse.data);
                }
            } catch (exception) {
                if (active) {
                    setError(exception.response?.data?.message || 'Unable to load your profile right now.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    if (loading) return <PageLoader />;
    if (error) return <EmptyState title="Profile unavailable" detail={error} />;
    if (!profile) {
        return (
            <EmptyState
                title="No linked profile yet"
                detail="Use the same email address on your RSBSA registration so TARSIS can show your profile and digital ID here."
            />
        );
    }

    return <Profile profile={profile} digitalId={digitalId} />;
}
