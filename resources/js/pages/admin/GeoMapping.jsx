import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, DataTable, Field, PageHeader, PageLoader, SearchBar, Select } from '../../components/common';
import LeafletMap from '../../components/maps/LeafletMap';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { assignedBarangayIds, isBarangayScoped } from '../../utils/rbac';
import { formatDate, formatRegistryNumber } from '../../utils/format';

export default function GeoMapping() {
    const { user } = useAuth();
    const searchInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [registrants, setRegistrants] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [locations, setLocations] = useState([]);
    const [query, setQuery] = useState('');
    const [registrantId, setRegistrantId] = useState('');
    const [showRegistrantMatches, setShowRegistrantMatches] = useState(false);
    const [activeRegistrantMatch, setActiveRegistrantMatch] = useState(0);
    const [pointType, setPointType] = useState('track_point');
    const [commodityType, setCommodityType] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapLoading, setMapLoading] = useState(false);
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
    const commodityOptions = useMemo(() => {
        const parcels = selectedRegistrant?.rsbsa_payload?.parcels || [];
        const registered = parcels.flatMap((parcel) => parcel.commodities || []).map((item) => item.commodity);
        const sectorTypes = [selectedRegistrant?.livestock_type, selectedRegistrant?.poultry_type];
        return [...new Set([...registered, ...sectorTypes].map((item) => String(item || '').trim()).filter(Boolean))];
    }, [selectedRegistrant]);

    async function loadRegistrantLocations(id) {
        setMapLoading(true);
        setLoadWarning('');
        try {
            const geoResult = await api.get(`/geo-locations?all=1&farmer_id=${encodeURIComponent(id)}`);
            setLocations(Array.isArray(geoResult.data) ? geoResult.data : geoResult.data.data || []);
        } catch (geoError) {
            setLocations([]);
            setLoadWarning('Unable to load this registrant\'s GPS plot. Make sure the geo-location migration has been run.');
        } finally {
            setMapLoading(false);
        }
    }

    function selectRegistrant(registrant) {
        setRegistrantId(String(registrant.id));
        setQuery(`${formatRegistryNumber(registrant.registry_number)} - ${registrant.full_name}`);
        setCommodityType('');
        setShowRegistrantMatches(false);
        setActiveRegistrantMatch(0);
        setPreview(null);
        loadRegistrantLocations(registrant.id);
    }

    function resetRegistrant() {
        setRegistrantId('');
        setQuery('');
        setCommodityType('');
        setLocations([]);
        setPreview(null);
        setMessage('');
        setError('');
    }

    function handleRegistrantSearchKeyDown(event) {
        if (event.key === 'ArrowDown' && registrantMatches.length) {
            event.preventDefault();
            setShowRegistrantMatches(true);
            setActiveRegistrantMatch((current) => Math.min(current + 1, registrantMatches.length - 1));
        } else if (event.key === 'ArrowUp' && registrantMatches.length) {
            event.preventDefault();
            setShowRegistrantMatches(true);
            setActiveRegistrantMatch((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Home' && registrantMatches.length) {
            event.preventDefault();
            setActiveRegistrantMatch(0);
        } else if (event.key === 'End' && registrantMatches.length) {
            event.preventDefault();
            setActiveRegistrantMatch(registrantMatches.length - 1);
        } else if (event.key === 'Enter' && showRegistrantMatches && registrantMatches[activeRegistrantMatch]) {
            event.preventDefault();
            selectRegistrant(registrantMatches[activeRegistrantMatch]);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setShowRegistrantMatches(false);
        }
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
                commodity_type: commodityType.trim(),
                points,
            });
            setMessage(response.data.message || 'GPS data imported.');
            setFile(null);
            setPreview(null);
            await loadRegistrantLocations(registrantId);
        } catch (saveError) {
            setError(saveError.message || 'Unable to import GPS data.');
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        function handleShortcut(event) {
            const modifier = event.ctrlKey || event.metaKey;
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if ((modifier && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTyping)) {
                event.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                setShowRegistrantMatches(true);
                return;
            }
            if (event.altKey && event.key.toLowerCase() === 'u') {
                event.preventDefault();
                fileInputRef.current?.click();
                return;
            }
            if (event.key === 'Escape') {
                setShowRegistrantMatches(false);
                document.activeElement?.blur();
                return;
            }
            if (modifier && event.key === 'Enter' && !busy) {
                if (preview && registrantId && commodityType.trim()) {
                    event.preventDefault();
                    confirmSave();
                } else if (file && commodityType.trim()) {
                    event.preventDefault();
                    previewFile(event);
                }
            }
        }

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [busy, commodityType, file, preview, registrantId]);

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
                                        ref={searchInputRef}
                                        required
                                        className="field"
                                        value={query}
                                        placeholder="Search name or registry number"
                                        autoComplete="off"
                                        role="combobox"
                                        aria-autocomplete="list"
                                        aria-expanded={showRegistrantMatches}
                                        aria-controls="registrant-search-options"
                                        aria-activedescendant={showRegistrantMatches && registrantMatches[activeRegistrantMatch] ? `registrant-option-${registrantMatches[activeRegistrantMatch].id}` : undefined}
                                        onFocus={() => {
                                            setShowRegistrantMatches(true);
                                            setActiveRegistrantMatch(0);
                                        }}
                                        onBlur={() => window.setTimeout(() => setShowRegistrantMatches(false), 120)}
                                        onKeyDown={handleRegistrantSearchKeyDown}
                                        onChange={(event) => {
                                            setQuery(event.target.value);
                                            setRegistrantId('');
                                            setPreview(null);
                                            setShowRegistrantMatches(true);
                                            setActiveRegistrantMatch(0);
                                        }}
                                    />
                                    {showRegistrantMatches && query.trim() && (
                                        <div id="registrant-search-options" role="listbox" className="absolute z-[2200] mt-1 max-h-64 w-full overflow-auto rounded-md border border-emerald-100 bg-white shadow-xl">
                                            {registrantMatches.map((registrant, index) => (
                                                <button
                                                    key={registrant.id}
                                                    id={`registrant-option-${registrant.id}`}
                                                    role="option"
                                                    aria-selected={index === activeRegistrantMatch}
                                                    type="button"
                                                    className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm transition hover:bg-emerald-50 ${index === activeRegistrantMatch ? 'bg-emerald-50' : ''}`}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => selectRegistrant(registrant)}
                                                >
                                                    <span className="block font-semibold text-slate-950">{formatRegistryNumber(registrant.registry_number)}</span>
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
                            <Field label="Commodity Type">
                                <input
                                    required
                                    className="field"
                                    list="geo-commodity-options"
                                    value={commodityType}
                                    placeholder="e.g. Rice, Corn, Cattle, Tilapia"
                                    onChange={(event) => setCommodityType(event.target.value)}
                                />
                                <datalist id="geo-commodity-options">
                                    {commodityOptions.map((commodity) => <option key={commodity} value={commodity} />)}
                                </datalist>
                            </Field>
                            <Field label="GPX or CSV File">
                                <input ref={fileInputRef} required key={message} type="file" className="field" accept=".gpx,.csv,.xml" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                            </Field>
                            {selectedRegistrant && (
                                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
                                    <p className="font-semibold">{selectedRegistrant.full_name}</p>
                                    <p>{selectedRegistrant.barangay?.name || 'No barangay'} - {selectedRegistrant.farm_location || 'Farm location not set'}</p>
                                </div>
                            )}
                            {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
                            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                            <button className="btn-primary w-full" disabled={busy || !file || !commodityType.trim()}>{busy ? 'Parsing...' : 'Preview GPS File'}</button>
                        </form>
                    </Card>
                    {preview && (
                        <Card title="Confirm Import">
                            <div className="space-y-3 text-sm text-slate-600">
                                <p><span className="font-semibold text-slate-900">{preview.source_file}</span> contains {preview.count} point(s) inside Tubigon bounds for <span className="font-semibold text-slate-900">{commodityType}</span>.</p>
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
                                <button type="button" className="btn-primary w-full" disabled={busy || !registrantId || !commodityType.trim()} onClick={confirmSave}>
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
                <Card title="Street Map with Plot">
                    {mapLoading && <p className="mb-3 text-sm font-semibold text-emerald-700">Loading saved plot...</p>}
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
                    columns={['Registrant', 'Plot', 'Barangay', 'Commodity', 'Point Type', 'Seq.', 'Latitude', 'Longitude', 'Recorded']}
                    rows={visibleLocations.slice(0, 100).map((point) => [
                        point.farmer?.full_name || point.plot_name || 'GPS point',
                        point.plot_name || point.source_file || 'GPS point',
                        point.farmer?.barangay?.name || point.barangay || 'Not set',
                        point.commodity_type || 'Not set',
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
