import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';

const guides = {
    assistance: {
        eyebrow: 'Assistance services',
        title: 'Assistance Application Tracker',
        copy: 'Follow an agricultural assistance request from submission and validation through approval and release.',
        steps: [
            'Create a beneficiary account and complete your RSBSA registration.',
            'Open this tracker using the same signed-in account as your registration.',
            'Click the status button to load the applications linked to your account.',
            'Review each assistance record and contact the MAO when a requirement or remark needs action.',
        ],
        stages: ['Submitted', 'Under validation', 'Approved', 'Released'],
        recordsKey: 'assistance_applications',
    },
    insurance: {
        eyebrow: 'Insurance and calamity services',
        title: 'Insurance and Calamity Tracker',
        copy: 'Check PCIC endorsement, claim processing, approval, and release updates connected to your registry record.',
        steps: [
            'Complete your beneficiary registration and report the affected crop, livestock, fishery, or property to the MAO.',
            'Submit the required incident, loss, policy, and supporting documents to the assigned office personnel.',
            'Open this tracker using the account email attached to your registration.',
            'Monitor endorsement, approval, and release updates; follow any MAO remarks requesting additional documents.',
        ],
        stages: ['Claim submitted', 'Documents verified', 'PCIC processing', 'Approved or released'],
        recordsKey: 'insurance_claims',
    },
};

export default function TrackerGuide({ kind }) {
    const guide = guides[kind];
    const [record, setRecord] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [accountChecked, setAccountChecked] = useState(false);
    const [statusVisible, setStatusVisible] = useState(false);

    function loadTrackingProfile({ reveal = false } = {}) {
        let active = true;
        setBusy(true);
        setError('');
        if (reveal) setStatusVisible(true);

        api.get('/tracking/me')
            .then((response) => {
                if (!active) return;
                const registrant = response.data.registrant;
                setRecord(registrant);
            })
            .catch((requestError) => {
                if (active) setError(requestError.message || 'Unable to load your registration.');
            })
            .finally(() => {
                if (active) {
                    setBusy(false);
                    setAccountChecked(true);
                }
            });

        return () => { active = false; };
    }

    useEffect(() => {
        return loadTrackingProfile();
    }, [kind]);

    function checkStatus() {
        loadTrackingProfile({ reveal: true });
    }

    const records = record?.[guide.recordsKey] || [];

    return (
        <div className="space-y-5 text-slate-900">
                <section className="overflow-hidden rounded-lg bg-[#153a2a] text-white">
                    <div className="px-5 py-8 sm:px-7">
                        <div className="max-w-4xl">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2b957]">{guide.eyebrow}</p>
                            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{guide.title}</h1>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 sm:text-base">{guide.copy}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-lg bg-white p-5 shadow-sm sm:p-7">
                    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8952a]">Step by step</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950">How the tracker works</h2>
                            <div className="mt-6 space-y-4">
                                {guide.steps.map((step, index) => (
                                    <div key={step} className="flex gap-4">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f1eb] text-sm font-bold text-[#1a4731]">{index + 1}</span>
                                        <p className="pt-1 text-sm leading-6 text-slate-600">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8952a]">Status flow</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950">What each update means</h2>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                {guide.stages.map((stage, index) => (
                                    <div key={stage} className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1a4731]" aria-hidden="true" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">Stage {index + 1}</p>
                                            <p className="mt-1 text-sm font-bold text-slate-800">{stage}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-lg bg-[#f2f6f4] p-5 sm:p-7">
                    <div className="mx-auto max-w-screen-lg">
                        {statusVisible && accountChecked && !record && !error && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
                                <h2 className="font-bold text-amber-900">No registration found</h2>
                                <p className="mt-1 text-sm text-amber-800">You have not completed a beneficiary registration with this account yet.</p>
                            </div>
                        )}
                        <div className="rounded-lg border border-[#d4e5db] bg-white p-5 shadow-sm sm:p-7">
                            <div className="flex items-start gap-3">
                                <FileCheck2 className="mt-0.5 h-6 w-6 shrink-0 text-[#1a4731]" aria-hidden="true" />
                                <div>
                                    <h2 className="text-xl font-bold text-slate-950">Check your status</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">Your registration is loaded automatically from your signed-in account.</p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-center">
                                <button type="button" className="btn-primary min-h-11 px-6" disabled={busy} onClick={checkStatus}>
                                    {busy ? 'Checking...' : 'Check status'}
                                </button>
                            </div>
                            {statusVisible && error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
                        </div>

                        {statusVisible && record && (
                            <div className="mt-6">
                                <div className="mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-950">{record.full_name}</p>
                                        <p className="text-xs text-slate-500">{record.registry_number} / {record.barangay?.name || 'Tubigon'}</p>
                                    </div>
                                </div>
                                {records.length ? (
                                    <div className="grid gap-4">
                                        {records.map((item) => kind === 'assistance'
                                            ? <AssistanceRecord key={item.id} item={item} />
                                            : <InsuranceRecord key={item.id} item={item} />)}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                                        You have not applied for {kind === 'assistance' ? 'agricultural assistance' : 'insurance or calamity assistance'} yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
        </div>
    );
}

function AssistanceRecord({ item }) {
    return (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="font-bold text-slate-950">{item.program_name || item.assistance_type}</h3>
                    <p className="mt-1 text-xs text-slate-500">Applied {formatDate(item.applied_at)}</p>
                </div>
                <StatusBadge status={item.status} />
            </div>
            {item.remarks && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{item.remarks}</p>}
        </article>
    );
}

function InsuranceRecord({ item }) {
    return (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="font-bold capitalize text-slate-950">{item.claim_type} claim</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.calamity_event || 'Insurance application'} / {formatDate(item.incident_date)}</p>
                </div>
                <StatusBadge status={item.approval_status} />
            </div>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                <StatusField label="Endorsement" value={item.endorsement_status} />
                <StatusField label="Approval" value={item.approval_status} />
                <StatusField label="Release" value={item.release_status} />
            </div>
            {item.remarks && <p className="mt-4 text-sm leading-6 text-slate-600">{item.remarks}</p>}
        </article>
    );
}

function StatusField({ label, value }) {
    return <div><p className="text-xs font-semibold text-slate-400">{label}</p><div className="mt-1"><StatusBadge status={value} /></div></div>;
}
