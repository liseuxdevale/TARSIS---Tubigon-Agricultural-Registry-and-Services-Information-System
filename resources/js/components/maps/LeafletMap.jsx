import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LeafletMap({ barangays = [], geoLocations = [], selected, onSelect, onGeoSelect, showBarangays = true, showOffice = true, className = '' }) {
    const mapRef = useRef(null);
    const holderRef = useRef(null);
    const markerRefs = useRef(new Map());
    const geoMarkerRefs = useRef([]);
    const geoShapeRefs = useRef([]);

    useEffect(() => {
        if (!holderRef.current || mapRef.current) return undefined;
        mapRef.current = L.map(holderRef.current).setView([9.9515, 123.9618], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        if (showOffice) {
            L.circleMarker([9.9435546, 123.9608058], { radius: 9, color: '#047857', fillColor: '#facc15', fillOpacity: 1, weight: 3 })
                .addTo(mapRef.current)
                .bindPopup('<strong>Municipal Agriculture Office</strong><br>Tubigon Municipal Hall Annex');
        }

        const refreshSize = () => mapRef.current?.invalidateSize();
        const frame = window.requestAnimationFrame(refreshSize);
        const timer = window.setTimeout(refreshSize, 250);
        const observer = new ResizeObserver(refreshSize);
        observer.observe(holderRef.current);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            observer.disconnect();
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [showOffice]);

    useEffect(() => {
        if (!mapRef.current) return undefined;
        const markers = [];
        markerRefs.current.clear();
        if (!showBarangays) return undefined;
        barangays.forEach((barangay) => {
            const latitude = Number(barangay.latitude);
            const longitude = Number(barangay.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            const marker = L.circleMarker([Number(barangay.latitude), Number(barangay.longitude)], {
                radius: selected?.id === barangay.id ? 10 : 7,
                color: barangay.enrollment_status === 'open' ? '#047857' : '#64748b',
                fillColor: barangay.enrollment_status === 'open' ? '#10b981' : '#cbd5e1',
                fillOpacity: 0.9,
                weight: selected?.id === barangay.id ? 3 : 2,
            })
                .addTo(mapRef.current)
                .bindPopup(`<strong>${barangay.name}</strong><br>${barangay.enrollment_status}<br>${barangay.assigned_technical_personnel || ''}`)
                .on('click', () => onSelect?.(barangay));
            markers.push(marker);
            markerRefs.current.set(barangay.id, marker);
        });
        if (markers.length) {
            mapRef.current.fitBounds(L.featureGroup(markers).getBounds().pad(0.12), { maxZoom: 14 });
        }
        return () => markers.forEach((marker) => marker.remove());
    }, [barangays, showBarangays]);

    useEffect(() => {
        if (!mapRef.current) return undefined;
        geoMarkerRefs.current.forEach((marker) => marker.remove());
        geoShapeRefs.current.forEach((shape) => shape.remove());
        geoMarkerRefs.current = [];
        geoShapeRefs.current = [];

        const markers = [];
        const shapes = [];
        const trackPoints = geoLocations
            .filter((point) => point.point_type === 'track_point')
            .sort((left, right) => Number(left.sequence_order || 0) - Number(right.sequence_order || 0))
            .map((point) => [Number(point.latitude), Number(point.longitude)])
            .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

        if (trackPoints.length >= 2) {
            const line = L.polyline(trackPoints, { color: '#0f766e', weight: 3, opacity: 0.85 }).addTo(mapRef.current);
            shapes.push(line);
        }
        if (trackPoints.length >= 4 && sameCoordinate(trackPoints[0], trackPoints[trackPoints.length - 1])) {
            const polygon = L.polygon(trackPoints, { color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.14, weight: 2 }).addTo(mapRef.current);
            shapes.push(polygon);
        }

        geoLocations.forEach((point) => {
            const latitude = Number(point.latitude);
            const longitude = Number(point.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            const marker = L.circleMarker([latitude, longitude], {
                radius: 6,
                color: '#0f766e',
                fillColor: point.point_type === 'plot_boundary' ? '#f59e0b' : '#14b8a6',
                fillOpacity: 0.9,
                weight: 2,
            })
                .addTo(mapRef.current)
                .bindPopup(`<strong>${point.farmer?.full_name || point.plot_name || 'GPS point'}</strong><br>${point.point_type || 'waypoint'}<br>Lat: ${latitude.toFixed(7)}<br>Lng: ${longitude.toFixed(7)}`)
                .bindTooltip(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, {
                    direction: 'top',
                    offset: [0, -8],
                    opacity: 0.92,
                })
                .on('click', () => onGeoSelect?.(point));
            markers.push(marker);
        });

        geoMarkerRefs.current = markers;
        geoShapeRefs.current = shapes;
        const boundsLayers = [...markers, ...shapes];
        if (boundsLayers.length) {
            mapRef.current.fitBounds(L.featureGroup(boundsLayers).getBounds().pad(0.18), { maxZoom: 17 });
        }

        return () => {
            markers.forEach((marker) => marker.remove());
            shapes.forEach((shape) => shape.remove());
            geoMarkerRefs.current = [];
            geoShapeRefs.current = [];
        };
    }, [geoLocations]);

    useEffect(() => {
        if (!selected || !mapRef.current) return;
        const marker = markerRefs.current.get(selected.id);
        if (!marker) return;
        mapRef.current.flyTo(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 15), { duration: 0.5 });
        marker.openPopup();
    }, [selected]);

    return <div ref={holderRef} className={`h-[70vh] min-h-[560px] w-full overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm ${className}`} />;
}

function sameCoordinate(first, second) {
    return Math.abs(first[0] - second[0]) < 0.0000001 && Math.abs(first[1] - second[1]) < 0.0000001;
}
