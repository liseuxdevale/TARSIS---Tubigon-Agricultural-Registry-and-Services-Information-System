export function ownershipFieldLabel(sector) {
    return sector === 'fisherfolk' ? 'Type of Fishing Gear' : 'Ownership';
}

export function digitalIdLivelihoodDetails(registrant) {
    const payload = registrant.rsbsa_payload || {};
    const raw = payload.main_livelihood;
    const livelihoods = [...new Set((Array.isArray(raw) ? raw : raw ? [raw] : [])
        .filter((value) => ['Farmer', 'Farmworker/Laborer', 'Fisherfolk', 'Agri Youth'].includes(value)))];
    if (!livelihoods.length) {
        if (registrant.sector === 'fisherfolk') livelihoods.push('Fisherfolk');
        else return { label: 'Type of Ownership', value: registrant.ownership_type || 'Not set' };
    }
    const values = livelihoods.flatMap((livelihood) => {
        if (livelihood !== 'Farmer') return [livelihood];
        const ownership = (Array.isArray(payload.parcels) ? payload.parcels : [])
            .map((parcel) => parcel.ownership_type === 'Others'
                ? parcel.ownership_other || 'Others' : parcel.ownership_type)
            .filter(Boolean);
        return ownership.length ? ownership.map((value) => `Farmer - ${value}`) : ['Farmer'];
    });
    const onlyFarmer = livelihoods.length === 1 && livelihoods[0] === 'Farmer';
    return {
        label: onlyFarmer ? 'Type of Ownership' : livelihoods.includes('Farmer') ? 'Livelihood / Ownership' : 'Main Livelihood',
        value: [...new Set(values)].map((value) => onlyFarmer ? value.replace(/^Farmer - /, '') : value).join(' / '),
    };
}

export function ownershipIdLabel(sector) {
    return sector === 'fisherfolk' ? 'Type of Fishing Gear' : 'Type of Owner';
}

export function registrantSectorLabel(sector) {
    return {
        farmer: 'crop',
        fisherfolk: 'fisheries',
        poultry: 'poultry',
        livestock: 'livestock',
    }[sector] || String(sector || '').replaceAll('_', ' ');
}
 
