import { formatDate } from './format';

const fallbackImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=720&fit=crop&auto=format';

const typeLabels = {
    bulletin: 'Announcement',
    advisory: 'Advisory',
    distribution_schedule: 'Distribution',
    compliance_requirements: 'Compliance',
    insurance_update: 'Insurance',
    assistance_update: 'Assistance',
    pest: 'Pest Advisory',
    disease: 'Disease Advisory',
    calamity: 'Calamity Advisory',
    other_purpose: 'Announcement',
};

export function normalizeAnnouncement(row) {
    return {
        ...row,
        img: row.image_url || fallbackImage,
        date: formatDate(row.publish_at || row.created_at),
        tag: typeLabels[row.type] || 'Announcement',
        excerpt: row.body,
        href: `/announcements/${row.id}`,
    };
}

export function normalizeAnnouncements(rows = []) {
    return rows.map(normalizeAnnouncement);
}

export function announcementStatusLink(type) {
    if (type === 'assistance_update') return '/track/assistance';
    if (type === 'insurance_update') return '/track/insurance';
    return '/login';
}

export function announcementStatusLabel(type) {
    if (type === 'assistance_update') return 'Check Assistance Application';
    if (type === 'insurance_update') return 'Check Insurance Application';
    return 'Check Application Status';
}
