import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, FileText, LogIn, SearchCheck, UserPlus } from 'lucide-react';
import Footer from '../../components/landing/Footer';
import Header from '../../components/landing/Header';

const instructionGuides = {
    assistance: {
        eyebrow: 'Assistance services',
        title: 'Assistance Application Tracker',
        intro: 'A step-by-step guide for checking the status of agricultural assistance requests submitted through TARSIS.',
        trackerPath: '/track/assistance',
        steps: [
            {
                title: 'Create or sign in to your account',
                copy: 'Use the account connected to your beneficiary registration so TARSIS can protect your records.',
                icon: UserPlus,
            },
            {
                title: 'Complete beneficiary registration',
                copy: 'Submit your RSBSA-aligned profile and keep the registry number shown after registration.',
                icon: FileText,
            },
            {
                title: 'Open the tracker',
                copy: 'Enter your registry number in the Assistance Application Tracker after signing in.',
                icon: SearchCheck,
            },
            {
                title: 'Review the latest status',
                copy: 'Check whether your request is submitted, under validation, approved, released, or needs action.',
                icon: CheckCircle2,
            },
        ],
        workflow: [
            'Submitted - your assistance request has been recorded.',
            'Under validation - MAO personnel are reviewing your details and requirements.',
            'Approved - the request passed validation and is ready for processing or scheduling.',
            'Released - the assistance has been distributed or marked complete.',
        ],
        notes: [
            'Use the same email account used in your beneficiary registration.',
            'If a remark asks for missing requirements, prepare the documents before visiting the office.',
            'Contact the Municipal Agriculture Office when the status is unclear or urgent.',
        ],
    },
    insurance: {
        eyebrow: 'Insurance and calamity services',
        title: 'Insurance and Calamity Tracker',
        intro: 'A step-by-step guide for following insurance, calamity, endorsement, approval, and release updates.',
        trackerPath: '/track/insurance',
        steps: [
            {
                title: 'Report the calamity or claim',
                copy: 'Inform the MAO about affected crops, livestock, fishery, or agricultural property.',
                icon: FileText,
            },
            {
                title: 'Submit supporting documents',
                copy: 'Provide incident details, policy information, photos, and other requirements requested by office staff.',
                icon: ClipboardCheck,
            },
            {
                title: 'Sign in and enter registry number',
                copy: 'Use your TARSIS account and registry number to view the records linked to your profile.',
                icon: LogIn,
            },
            {
                title: 'Track endorsement and release',
                copy: 'Monitor document verification, PCIC processing, approval, and release updates.',
                icon: SearchCheck,
            },
        ],
        workflow: [
            'Claim submitted - your insurance or calamity report has been received.',
            'Documents verified - the office checked the submitted requirements.',
            'PCIC processing - the claim has moved to insurance processing or endorsement.',
            'Approved or released - the claim has been approved, paid, or marked complete.',
        ],
        notes: [
            'Keep photos, policy details, and incident dates accurate.',
            'Only records connected to your registered account email can be viewed.',
            'Follow MAO remarks if additional proof or correction is requested.',
        ],
    },
};

export default function PublicTrackerInstructions({ kind }) {
    const guide = instructionGuides[kind] || instructionGuides.assistance;

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Header />
            <main id="main-content">
                <section className="bg-[#153a2a] text-white">
                    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
                        <Link to="/#services" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to landing
                        </Link>
                        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2b957]">{guide.eyebrow}</p>
                                <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{guide.title}</h1>
                            </div>
                            <div>
                                <p className="text-base leading-8 text-white/78">{guide.intro}</p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Link
                                        to={guide.trackerPath}
                                        className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8952a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b68425] focus:outline-none focus:ring-2 focus:ring-[#e2b957]/40"
                                    >
                                        Open Tracker
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                    <Link
                                        to="/signup"
                                        state={{ from: { pathname: '/registration' } }}
                                        className="inline-flex min-h-12 items-center rounded-lg border border-white/45 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                                    >
                                        Register First
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white py-14 sm:py-16">
                    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8952a]">Step by step procedure</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">How to use this feature</h2>
                        </div>
                        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {guide.steps.map((step, index) => {
                                const StepIcon = step.icon;

                                return (
                                    <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e7f1eb] text-[#1a4731]">
                                                <StepIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Step {index + 1}</span>
                                        </div>
                                        <h3 className="mt-5 text-base font-extrabold text-slate-950">{step.title}</h3>
                                        <p className="mt-3 text-sm leading-6 text-slate-600">{step.copy}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="bg-[#f2f6f4] py-14 sm:py-16">
                    <div className="mx-auto grid max-w-screen-xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8952a]">Status meaning</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950">How updates move through the tracker</h2>
                            <div className="mt-6 space-y-3">
                                {guide.workflow.map((item) => (
                                    <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1a4731]" aria-hidden="true" />
                                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8952a]">Important reminders</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950">Before checking your record</h2>
                            <div className="mt-6 rounded-lg border border-[#d4e5db] bg-white p-5 shadow-sm">
                                {guide.notes.map((note) => (
                                    <div key={note} className="flex gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0">
                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c8952a]" />
                                        <p className="text-sm leading-6 text-slate-600">{note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
