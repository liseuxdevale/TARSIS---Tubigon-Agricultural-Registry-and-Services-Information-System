import React, { useEffect, useMemo, useState } from 'react';
import { Card, DataTable, Field, PageHeader, PageLoader, SearchBar, Select } from '../../components/common';
import LeafletMap from '../../components/maps/LeafletMap';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { assignedBarangayIds, isBarangayScoped } from '../../utils/rbac';
import { formatDate } from '../../utils/format';

export default function GeoMapping() {
    const { user } = useAuth();
    const [registrants, setRegistrants] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [locations, setLocations] = useState([]);
    const [query, setQuery] = useState('');
    const [registrantId, setRegistrantId] = useState('');
    const [showRegistrantMatches, setShowRegistrantMatches] = useState(false);
    const [pointType, setPointType] = useState('track_point');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loadWarning, setLoadWarning] = useState('');

    async function load() {
        setLoading(true);
        setLoadWarning('');
        try {
            const [registrantResult, barangayResult] = await Promise.all([
                api.get(`/registrants?search=${encodeURIComponent(query)}&per_page=100`),
                api.get('/barangays?all=1'),
            ]);
            setRegistrants(registrantResult.data.data || []);
            const allBarangays = Array.isArray(barangayResult.data) ? barangayResult.data : barangayResult.data.data || [];
            const scopedIds = assignedBarangayIds(user);
            setBarangays(isBarangayScoped(user) ? allBarangays.filter((barangay) => scopedIds.includes(Number(barangay.id))) : allBarangays);

            try {
                const geoResult = await api.get('/geo-locations?all=1');
                setLocations(Array.isArray(geoResult.data) ? geoResult.data : geoResult.data.data || []);
            } catch (geoError) {
                setLocations([]);
                setLoadWarning('GPS storage is not ready yet. Run php artisan migrate to create the geo_locations table.');
            }
        } catch (loadError) {
            setError(loadError.message || 'Unable to load Geo Mapping data.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const selectedRegistrant = useMemo(
        () => registrants.find((registrant) => String(registrant.id) === String(registrantId)),
        [registrants, registrantId]
    );
    const visibleLocations = useMemo(
        () => registrantId ? locations.filter((point) => String(point.farmer_id) === String(registrantId)) : [],
        [locations, registrantId]
    );
    const visibleCoordinateCount = useMemo(
        () => new Set(visibleLocations.map((point) => `${point.latitude},${point.longitude}`)).size,
        [visibleLocations]
    );
    const registrantMatches = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return [];

        return registrants
            .filter((registrant) => {
                const haystack = `${registrant.registry_number || ''} ${registrant.full_name || ''}`.toLowerCase();
                return haystack.includes(needle);
            })
            .slice(0, 8);
    }, [registrants, query]);

    function selectRegistrant(registrant) {
        setRegistrantId(String(registrant.id));
        setQuery(`${registrant.registry_number} - ${registrant.full_name}`);
        setShowRegistrantMatches(false);
    }

    function resetRegistrant() {
        setRegistrantId('');
        setQuery('');
        setPreview(null);
        setMessage('');
        setError('');
    }

    async function previewFile(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        setPreview(null);
        if (!file) return;
        setBusy(true);
        try {
            const payload = new FormData();
            payload.append('file', file);
            const response = await api.post('/geo-locations/preview', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPreview(response.data);
            setMessage(`Parsed ${response.data.count} GPS point(s). Confirm the farmer before saving.`);
        } catch (uploadError) {
            setError(uploadError.message || 'Unable to parse GPS data.');
        } finally {
            setBusy(false);
        }
    }

    async function confirmSave() {
        setError('');
        setMessage('');
        if (!preview || !registrantId) return;
        setBusy(true);
        try {
            const points = preview.points.map((point, index) => ({
                ...point,
                point_type: point.point_type === 'waypoint' ? 'waypoint' : 'track_point',
                sequence_order: point.sequence_order || index + 1,
            }));
            const response = await api.post('/geo-locations/upload', {
                farmer_id: registrantId,
                source_file: preview.source_file,
                points,
            });
            setMessage(response.data.message || 'GPS data imported.');
            setFile(null);
            setPreview(null);
            await load();
        } catch (saveError) {
            setError(saveError.message || 'Unable to import GPS data.');
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <PageLoader />;

    return (
        <section className="space-y-5">
            <PageHeader title="GPS Geo Mapping" description="Import Garmin GPSMAP GPX files or CSV coordinates and attach them to registered farmer and plot records." />
            {loadWarning && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    {loadWarning}
                </div>
            )}
            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="space-y-4">
                    <Card title="Import GPS File">
                        <form onSubmit={previewFile} className="space-y-3">
                            <Field label="Find Registrant">
                                <div className="relative">
                                    <input
                                        required
                                        className="field"
                                        value={query}
                                        placeholder="Search name or registry number"
                                        autoComplete="off"
                                        onFocus={() => setShowRegistrantMatches(true)}
                                        onBlur={() => window.setTimeout(() => setShowRegistrantMatches(false), 120)}
                                        onChange={(event) => {
                                            setQuery(event.target.value);
                                            setRegistrantId('');
                                            setPreview(null);
                                            setShowRegistrantMatches(true);
                                        }}
                                    />
                                    {showRegistrantMatches && query.trim() && (
                                        <div className="absolute z-[2200] mt-1 max-h-64 w-full overflow-auto rounded-md border border-emerald-100 bg-white shadow-xl">
                                            {registrantMatches.map((registrant) => (
                                                <button
                                                    key={registrant.id}
                                                    type="button"
                                                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-emerald-50"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => selectRegistrant(registrant)}
                                                >
                                                    <span className="block font-semibold text-slate-950">{registrant.registry_number}</span>
                                                    <span className="block text-slate-600">{registrant.full_name}</span>
                                                </button>
                                            ))}
                                            {!registrantMatches.length && (
                                                <p className="px-3 py-2 text-sm text-slate-500">No matching registrants found.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <button type="button" className="btn-secondary" onClick={load}>Search</button>
                                    {(query || registrantId) && (
                                        <button type="button" className="btn-secondary" onClick={resetRegistrant}>Clear</button>
                                    )}
                                </div>
                            </Field>
                            <Field label="Point Type">
                                <Select
                                    value={pointType}
                                    options={['track_point', 'waypoint']}
                                    labels={{ track_point: 'Track Point / Boundary Trace', waypoint: 'Waypoint / Farm Marker' }}
                                    onChange={setPointType}
                                />
                            </Field>
                            <Field label="GPX or CSV File">
                                <input required key={message} type="file" className="field" accept=".gpx,.csv,.xml" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                            </Field>
                            {selectedRegistrant && (
                                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
                                    <p className="font-semibold">{selectedRegistrant.full_name}</p>
                                    <p>{selectedRegistrant.barangay?.name || 'No barangay'} - {selectedRegistrant.farm_location || 'Farm location not set'}</p>
                                </div>
                            )}
                            {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
                            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                            <button className="btn-primary w-full" disabled={busy || !file}>{busy ? 'Parsing...' : 'Preview GPS File'}</button>
                        </form>
                    </Card>
                    {preview && (
                        <Card title="Confirm Import">
                            <div className="space-y-3 text-sm text-slate-600">
                                <p><span className="font-semibold text-slate-900">{preview.source_file}</span> contains {preview.count} point(s) inside Tubigon bounds.</p>
                                <div className="max-h-44 overflow-auto rounded-md border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                        <tbody>
                                            {preview.points.slice(0, 8).map((point, index) => (
                                                <tr key={`${point.latitude}-${point.longitude}-${index}`} className="border-b border-slate-100">
                                                    <td className="px-2 py-1">{point.plot_name || `Point ${index + 1}`}</td>
                                                    <td className="px-2 py-1">{point.point_type === 'waypoint' ? 'waypoint' : pointType}</td>
                                                    <td className="px-2 py-1">{point.latitude}</td>
                                                    <td className="px-2 py-1">{point.longitude}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" className="btn-primary w-full" disabled={busy || !registrantId} onClick={confirmSave}>
                                    {busy ? 'Saving...' : 'Save to Selected Farmer'}
                                </button>
                            </div>
                        </Card>
                    )}
                    <Card title="Field Workflow">
                        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                            <li>Copy files from the Garmin microSD or USB-mounted Garmin/GPX folder.</li>
                            <li>Select the matching registrant or plot owner in TARSIS.</li>
                            <li>Upload the GPX file and review the points on the map.</li>
                        </ol>
                    </Card>
                </div>
                <Card title="Mapped GPS Points">
                    <LeafletMap barangays={barangays} geoLocations={visibleLocations} showBarangays={false} showOffice={false} className="h-[62vh] min-h-[500px]" />
                </Card>
            </div>
            <Card title="Imported Coordinates">
                {visibleLocations.length > 0 && (
                    <p className="mb-3 text-sm text-slate-600">
                        Showing {visibleLocations.length} saved GPS point(s) across {visibleCoordinateCount} unique map position(s).
                    </p>
                )}
                <DataTable
                    columns={['Registrant', 'Plot', 'Barangay', 'Type', 'Seq.', 'Latitude', 'Longitude', 'Recorded']}
                    rows={visibleLocations.slice(0, 100).map((point) => [
                        point.farmer?.full_name || point.plot_name || 'GPS point',
                        point.plot_name || point.source_file || 'GPS point',
                        point.farmer?.barangay?.name || point.barangay || 'Not set',
                        point.point_type,
                        point.sequence_order,
                        point.latitude,
                        point.longitude,
                        formatDate(point.date_recorded),
                    ])}
                />
            </Card>
        </section>
    );
}
