export const RSBSA_TEMPLATE_VERSION = '03-2021-revised-01';
export const RSBSA_CALIBRATION_STORAGE_KEY = `tarsis-rsbsa-calibration-${RSBSA_TEMPLATE_VERSION}`;

export const RSBSA_TEMPLATE = {
    version: RSBSA_TEMPLATE_VERSION,
    pages: [
        { id: 1, image: '/images/rsbsa/official-page-1.jpg', label: 'Personal information and farm profile' },
        { id: 2, image: '/images/rsbsa/official-page-2.jpg', label: 'Farm parcels and certification' },
    ],
    marks: {
        education: {
            'Pre-school': [53.7, 33.80],
            Elementary: [53.7, 35.05],
            'High School (non K-12)': [53.7, 36.4],
            'Junior High School (K-12)': [68.45, 33.85],
            'Senior High School (K-12)': [68.45, 35.10],
            College: [68.45, 36.40],
            Vocational: [84.5, 33.85],
            'Post-graduate': [84.5, 35.10],
            None: [84.5, 36.40],
        },
        civilStatus: {
            Single: [16.35, 42.60],
            Married: [23.95, 42.65],
            Widowed: [32.05, 42.75],
            Separated: [41.25, 42.75],
        },
        livelihood: {
            Farmer: [20.97, 62.10],
            'Farmworker/Laborer': [35.8, 62.10],
            Fisherfolk: [60.90, 62.10],
            'Agri Youth': [81.2, 62.10],
        },
        activities: {
            farmer_activities: {
                Rice: [6.15, 67.55],
                Corn: [6.15, 69.45],
                'Other crops': [6.15, 71.45],
                Livestock: [6.15, 74.20],
                Poultry: [6.15, 76.85],
            },
            farmworker_activities: {
                'Land Preparation': [36.65, 67.60],
                'Planting/Transplanting':  [36.65, 69.50],
                Cultivation:  [36.65, 71.35],
                Harvesting:  [36.65, 73.35],
                Others:  [36.65, 75.25],
            },
            fishing_activities: {
                'Fish Capture': [56.25, 72.60],
                Aquaculture: [56.25, 74.00],
                Gleaning: [56.25, 75.20],
                Others: [56.25, 76.50],
                'Fish Processing': [67.25, 72.55],
                'Fish Vending': [67.25, 73.95],
            },
            youth_activities: {
                'Part of a farming household': [79.95, 70.60],
                'Attending/attended formal agri-fishery related course': [79.95, 71.75],
                'Attending/attended non-formal agri-fishery related course': [79.95, 73.6],
                'Participated in any agricultural activity/program': [79.95, 75.5],
                Others: [79.95, 77.55],
            },
        },
    },
    parcels: {
        tops: [12.25, 26.95, 41.05],
        commodityRowHeight: 2.78,
    },
};

export const DEFAULT_RSBSA_CALIBRATION = {
    version: RSBSA_TEMPLATE_VERSION,
    pages: {
        1: { x: 0, y: 0, textScale: 1 },
        2: { x: 0, y: 0, textScale: 1 },
    },
};

export function normalizeRsbsaCalibration(value) {
    if (! value || value.version !== RSBSA_TEMPLATE_VERSION) {
        return structuredClone(DEFAULT_RSBSA_CALIBRATION);
    }

    return {
        version: RSBSA_TEMPLATE_VERSION,
        pages: {
            1: normalizePageCalibration(value.pages?.[1] || value.pages?.['1']),
            2: normalizePageCalibration(value.pages?.[2] || value.pages?.['2']),
        },
    };
}

function normalizePageCalibration(page = {}) {
    return {
        x: clampNumber(page.x, -2, 2, 0),
        y: clampNumber(page.y, -2, 2, 0),
        textScale: clampNumber(page.textScale, 0.8, 1.25, 1),
    };
}

function clampNumber(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (! Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
}
