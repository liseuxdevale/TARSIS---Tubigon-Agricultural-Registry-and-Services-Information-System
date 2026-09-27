import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, EmptyState, PageHeader, PageLoader } from '../../components/common';
import RsbsaTemplateFirstRenderer from '../../components/rsbsa/RsbsaTemplateFirstRenderer';
import {
    DEFAULT_RSBSA_CALIBRATION,
    RSBSA_CALIBRATION_STORAGE_KEY,
    normalizeRsbsaCalibration,
} from '../../components/rsbsa/officialRsbsaTemplate';
import { useResource } from '../../hooks/useResource';
import { api } from '../../services/api';
import DigitalID from './DigitalID';

export default function RsbsaPreview({ view = 'full' }) {
    const { id } = useParams();
    const [calibration] = useState(loadCalibration);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);
    const { data, loading, error } = useResource(
        () => api.get(`/public/registrants/${encodeURIComponent(id)}/rsbsa-preview`).then((response) => response.data),
        [id]
    );

    useEffect(() => () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    }, [pdfPreviewUrl]);

    async function buildPdf() {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        // Wait for web fonts to finish loading/swapping so text metrics match
        // exactly what's shown in the live preview before we capture anything.
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const sheets = [...document.querySelectorAll('.rsbsa-page-wrapper')];

        // Wait for every image inside the pages (template scans + registrant photo)
        // to finish loading/decoding, so container sizing can't shift mid-capture.
        await Promise.all(
            sheets.flatMap((sheet) => [...sheet.querySelectorAll('img')]).map((img) => {
                if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
                return new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                });
            })
        );

        const printPage = { width: 215.9, height: 330.2 };
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [printPage.width, printPage.height], compress: true });
        const pdfCapture = await createRsbsaPdfCaptureSheets(sheets);

        try {
            for (let index = 0; index < pdfCapture.sheets.length; index += 1) {
                const sheet = pdfCapture.sheets[index];
                const canvas = await captureVisibleRsbsaSheet(sheet, html2canvas);
                if (index > 0) pdf.addPage([printPage.width, printPage.height], 'portrait');
                const image = canvas.toDataURL('image/jpeg', 0.95);
                const placement = fitImageToPage(canvas.width, canvas.height, printPage.width, printPage.height);
                pdf.addImage(image, 'JPEG', placement.x, placement.y, placement.width, placement.height, undefined, 'FAST');
            }
        } finally {
            pdfCapture.destroy();
        }
        return pdf;
    }

    async function previewPdf() {
        setPdfBusy(true);
        try {
            const pdf = await buildPdf();
            const blob = pdf.output('blob');
            setPdfPreviewUrl((current) => {
                if (current) URL.revokeObjectURL(current);
                return URL.createObjectURL(blob);
            });
        } finally {
            setPdfBusy(false);
        }
    }

    async function downloadPdf() {
        setPdfBusy(true);
        try {
            const pdf = await buildPdf();
            pdf.save(`RSBSA_Enrollment_Form_${registrantFileName(data)}.pdf`);
        } finally {
            setPdfBusy(false);
        }
    }

    if (loading) return <PageLoader />;
    if (error) return <EmptyState title="RSBSA preview unavailable" detail={error} />;
    if (data?.found === false) {
        return (
            <EmptyState
                title="Registration record not found"
                detail={data.message || `No registration record was found for ${id}.`}
            />
        );
    }
    if (view === 'mao-id') {
        return (
            <section className="space-y-4">
                <PageHeader
                    title="MAO ID Review"
                    description="Read-only preview of the MAO ID generated from this registration record."
                    actions={<button className="btn-secondary" onClick={() => window.print()}>Print ID</button>}
                />
                <ReviewLinks registryNumber={data.registry_number} activeView="mao-id" />
                <Card title="TARSIS Registry ID">
                    <DigitalID registrant={data} printable />
                </Card>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <PageHeader
                title="RSBSA Enrollment Form Preview"
                description="Read-only printable preview generated from the saved registration record."
                actions={(
                    <>
                        <button className="btn-secondary" onClick={() => window.print()}>Print File</button>
                        <button className="btn-secondary" onClick={previewPdf} disabled={pdfBusy}>{pdfBusy ? 'Generating...' : 'Preview PDF'}</button>
                        <button className="btn-primary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? 'Generating...' : 'Download PDF'}</button>
                    </>
                )}
            />
            <ReviewLinks registryNumber={data.registry_number} activeView="form" />
            <Card>
                <RsbsaTemplateFirstRenderer registrant={data} calibration={calibration} showGrid={false} />
            </Card>
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-[2000] flex flex-col bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-t-lg bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-slate-950">Downloaded PDF Preview</p>
                            <p className="text-xs text-slate-500">This is the same file generated by Download PDF.</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn-secondary" type="button" onClick={downloadPdf} disabled={pdfBusy}>Download</button>
                            <button className="mini-btn" type="button" onClick={() => setPdfPreviewUrl((current) => {
                                if (current) URL.revokeObjectURL(current);
                                return '';
                            })}>X</button>
                        </div>
                    </div>
                    <iframe
                        title="RSBSA downloaded PDF preview"
                        src={pdfPreviewUrl}
                        className="mx-auto min-h-0 w-full max-w-6xl flex-1 rounded-b-lg border-0 bg-white"
                    />
                </div>
            )}
        </section>
    );
}

async function createRsbsaPdfCaptureSheets(sheets) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = `${Math.max(...sheets.map((sheet) => sheet.offsetWidth || 0), 1)}px`;
    host.style.maxWidth = 'none';
    host.style.pointerEvents = 'none';
    host.style.background = '#ffffff';
    host.style.zIndex = '-1';

    const clonedSheets = sheets.map((sheet) => {
        const clone = sheet.cloneNode(true);
        clone.style.width = `${sheet.offsetWidth}px`;
        clone.style.height = `${sheet.offsetHeight}px`;
        clone.style.maxWidth = 'none';
        clone.style.marginLeft = '0';
        clone.style.marginRight = '0';
        host.appendChild(clone);
        return clone;
    });

    document.body.appendChild(host);
    await waitForImages(host);

    return {
        sheets: clonedSheets,
        destroy: () => host.remove(),
    };
}

function waitForImages(root) {
    return Promise.all([...root.querySelectorAll('img')].map((img) => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    }));
}

function fitImageToPage(imageWidth, imageHeight, pageWidth, pageHeight) {
    const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;

    return {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
    };
}

async function captureVisibleRsbsaSheet(sheet, html2canvas) {
    const restorers = freezeRsbsaComputedStyles(sheet);

    try {
        return await html2canvas(sheet, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            width: sheet.offsetWidth,
            height: sheet.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        });
    } finally {
        restorers.reverse().forEach((restore) => restore());
    }
}


function freezeRsbsaComputedStyles(sheet) {
    const elements = [
        sheet,
        ...sheet.querySelectorAll('.rsbsa-exact-page, .rsbsa-overlay, .rsbsa-cover, .rsbsa-filled-photo, .rsbsa-filled-value, .rsbsa-segmented-value, .rsbsa-filled-mark'),
    ];

    return elements.map((element) => {
        const previousStyle = element.getAttribute('style');
        const styles = window.getComputedStyle(element);

        element.style.width = styles.width;
        element.style.height = styles.height;

        if (element.classList.contains('rsbsa-filled-value') || element.classList.contains('rsbsa-segmented-value')) {
            element.style.fontSize = styles.fontSize;
            element.style.lineHeight = styles.lineHeight;
            element.style.fontWeight = styles.fontWeight;
            element.style.paddingLeft = styles.paddingLeft;
            element.style.paddingRight = styles.paddingRight;
            element.style.overflow = 'visible';

            // PDF-only vertical nudge: html2canvas renders flex-centered text
            // slightly lower than the live browser does, so shift it up here —
            // this never touches the live preview since it only runs on the
            // offscreen clone used for capture.
            const currentTop = parseFloat(element.style.top);
            if (! Number.isNaN(currentTop)) {
                element.style.top = `${currentTop - 0.35}%`;
            }
        }

        if (element.classList.contains('rsbsa-filled-mark')) {
            element.style.borderRightWidth = styles.borderRightWidth;
            element.style.borderBottomWidth = styles.borderBottomWidth;
        }

        return () => {
            if (previousStyle === null) {
                element.removeAttribute('style');
            } else {
                element.setAttribute('style', previousStyle);
            }
        };
    });
}

function loadCalibration() {
    try {
        const saved = localStorage.getItem(RSBSA_CALIBRATION_STORAGE_KEY);
        return normalizeRsbsaCalibration(saved ? JSON.parse(saved) : DEFAULT_RSBSA_CALIBRATION);
    } catch {
        return normalizeRsbsaCalibration(DEFAULT_RSBSA_CALIBRATION);
    }
}

function registrantFileName(registrant) {
    const name = registrant?.full_name || [registrant?.first_name, registrant?.middle_name, registrant?.last_name, registrant?.suffix].filter(Boolean).join(' ');
    const fallback = registrant?.registry_number || '03-2021';
    return safeFileName(name || fallback);
}

function safeFileName(value) {
    return String(value || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 120) || 'registrant';
}

function ReviewLinks({ registryNumber, activeView }) {
    const encodedRegistryNumber = encodeURIComponent(registryNumber || '');
    const formClassName = activeView === 'form'
        ? 'rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm transition hover:bg-emerald-50'
        : 'rounded-lg border border-emerald-200 bg-white p-4 shadow-sm transition hover:bg-emerald-50';
    const maoIdClassName = activeView === 'mao-id'
        ? 'rounded-lg border border-blue-300 bg-blue-50 p-4 shadow-sm transition hover:bg-blue-50'
        : 'rounded-lg border border-blue-200 bg-white p-4 shadow-sm transition hover:bg-blue-50';

    return (
        <div className="grid gap-3 md:grid-cols-2">
            <Link
                className={formClassName}
                to={`/rsbsa-preview/${encodedRegistryNumber}`}
                state={{ registryNumber }}
            >
                <span className="font-bold text-gray-900">Form Review</span>
                <span className="mt-1 block text-sm text-gray-500">Review the enrollment form linked to this registration.</span>
            </Link>
            <Link
                className={maoIdClassName}
                to={`/rsbsa-preview/${encodedRegistryNumber}/mao-id`}
                state={{ registryNumber }}
            >
                <span className="font-bold text-gray-900">MAO ID Review</span>
                <span className="mt-1 block text-sm text-gray-500">Review the MAO ID linked to this registration.</span>
            </Link>
        </div>
    );
}
