import React from 'react';
import OfficialRsbsaFillableForm from './OfficialRsbsaFillableForm';

export default function RsbsaTemplateFirstRenderer({ registrant, calibration, showGrid }) {
    return <OfficialRsbsaFillableForm registrant={registrant} calibration={calibration} showGrid={showGrid} />;
}
