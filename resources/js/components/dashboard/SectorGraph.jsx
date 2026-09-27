import React from 'react';
import { Card } from '../common';
import ChartBox from '../common/ChartBox';

const sectorLabels = {
    farmer: 'Crop',
    fisherfolk: 'Fisheries/Fish',
    livestock: 'Livestock',
    poultry: 'Poultry',
};

const sectorColors = {
    farmer: '#16a34a',
    fisherfolk: '#0284c7',
    livestock: '#d97706',
    poultry: '#ca8a04',
};

export default function SectorGraph({ sectors = [] }) {
    return (
        <Card title="Registrants per Sector">
            <ChartBox
                type="bar"
                labels={sectors.map((item) => sectorLabels[item.sector] || item.sector)}
                values={sectors.map((item) => item.total)}
                colors={sectors.map((item) => sectorColors[item.sector] || '#0f766e')}
            />
        </Card>
    );
}
