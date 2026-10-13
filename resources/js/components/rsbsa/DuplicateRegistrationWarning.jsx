import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common';
import { formatDate, formatRegistryNumber } from '../../utils/format';

export default function DuplicateRegistrationWarning({ warning, busy = false, onClose, onContinue }) {
    if (!warning) return null;
    const possible = warning.code === 'possible_duplicate';
    const matches = warning.matches || (warning.existing_record ? [warning.existing_record] : []);
    return <Modal open title={possible ? 'Possible Duplicate Registration' : 'RSBSA Number Already Registered'} onClose={onClose} size="lg">
        <div role="alert" className="space-y-4">
            <p className="text-sm leading-6 text-slate-700">{warning.message}</p>
            {matches.map((match) => <div key={match.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-bold">{formatRegistryNumber(match.registry_number)} - {match.full_name}</p>
                <p className="mt-1">Date of birth: {formatDate(match.birthday)}</p>
                <p>Barangay: {match.barangay?.name || 'Not set'}</p>
                <p className="break-words">Address: {match.address || 'Not set'}</p>
                <p className="capitalize">{match.sector} / {match.status}</p>
                {match.status !== 'archived' && <Link className="mini-btn mt-2 inline-flex" to={`/admin/registrations?record=${match.id}`}>View existing record</Link>}
            </div>)}
            {possible && <p className="text-xs leading-5 text-slate-500">Matching names and birth dates do not prove that these are the same person. Verify the information before continuing. Existing records will not be merged, deleted, or overwritten.</p>}
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Return to form</button>
                {possible && <button type="button" className="btn-primary" disabled={busy} onClick={() => onContinue(warning.duplicate_review_token)}>{busy ? 'Saving...' : 'Reviewed — continue submission'}</button>}
            </div>
        </div>
    </Modal>;
}
