export function ownershipFieldLabel(sector) {
    return sector === 'fisherfolk' ? 'Type of Fishing Gear' : 'Ownership';
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
 