import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { Card, Modal, PageHeader, PageLoader } from '../../components/common';
import { api } from '../../services/api';
import { useResource } from '../../hooks/useResource';
import { useAuth } from '../../contexts/AuthContext';

export default function DownloadableFiles() {
    const { user } = useAuth();
    const [revision, setRevision] = useState(0);
    const { data, loading, error } = useResource(() => api.get('/downloadable-files').then((response) => response.data), [revision]);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteFile, setDeleteFile] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    async function confirmDelete() {
        if (deleteBusy || !deleteFile) return;
        setDeleteBusy(true);
        setDeleteError('');
        try {
            await api.delete(`/downloadable-files/${deleteFile.id}`, { data: { confirm: true } });
            setDeleteFile(null);
            setSuccess('File deleted successfully.');
            setRevision((value) => value + 1);
        } catch (failure) { setDeleteError(failure.message || 'Unable to delete file.'); }
        finally { setDeleteBusy(false); }
    }
    async function upload(event) {
        event.preventDefault();
        if (uploadBusy) return;
        const payload = new FormData(event.currentTarget);
        const pdf = payload.get('pdf');
        if (!(pdf instanceof File) || !pdf.size) {
            setUploadError('Please choose a PDF file.');
            return;
        }
        if (pdf.size > 10 * 1024 * 1024) {
            setUploadError('The PDF must be 10 MB or smaller.');
            return;
        }
        setUploadBusy(true);
        setUploadError('');
        try {
            await api.post('/downloadable-files', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploadOpen(false);
            setSuccess('PDF added successfully.');
            setRevision((value) => value + 1);
        } catch (failure) { setUploadError(failure.message || 'Unable to upload PDF.'); }
        finally { setUploadBusy(false); }
    }
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState({});
    const pendingActions = useRef(new Set());
    const [fileError, setFileError] = useState('');
    const [preview, setPreview] = useState(null);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

    async function open(file, download) {
        const key = `${file.id}:${download ? 'download' : 'view'}`;
        if (pendingActions.current.has(key)) return;
        pendingActions.current.add(key);
        setBusy((current) => ({ ...current, [key]: true }));
        setFileError('');
        try {
            const response = await api.get(`/downloadable-files/${file.id}${download ? '?download=1' : ''}`, { responseType: 'blob', headers: { Accept: 'application/pdf' } });
            const url = URL.createObjectURL(response.data);
            if (download) {
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = file.filename;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } else {
                setPreview({ title: file.title, url });
            }
        } catch (failure) { setFileError(failure.message || 'Unable to access file.'); }
        finally {
            pendingActions.current.delete(key);
            setBusy((current) => { const next = { ...current }; delete next[key]; return next; });
        }
    }

    if (loading) return <PageLoader />;
    const files = (data || []).filter((file) => `${file.title} ${file.category} ${file.description}`.toLowerCase().includes(search.toLowerCase()));
    return <section className="space-y-4">
        <PageHeader title="Downloadable Files" description="Access and download BoatR, FishR, and PCIC forms." />
        {user?.role === 'super_admin' && <button className="btn-primary" type="button" onClick={() => { setUploadError(''); setUploadOpen(true); }}>Add PDF</button>}
        {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
        {(error || fileError) && <p role="alert" className="text-sm text-red-700">{error || fileError}</p>}
        <input className="field" aria-label="Search downloadable files" placeholder="Search forms by name or category" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
            {files.map((file) => <div key={file.id} className="relative min-w-0"><Card title={<span className="block pr-12">{file.title}</span>} actions={user?.role === 'super_admin' ? <button className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 md:right-4 md:top-4" type="button" aria-label={`Delete ${file.title}`} title="Delete file" onClick={() => { setDeleteError(''); setDeleteFile(file); }}><Trash2 className="h-5 w-5" aria-hidden="true" /></button> : null}>
                <p className="text-sm text-slate-500">{file.category} · PDF</p>
                <p className="my-3">{file.description}</p>
                <div className="flex flex-wrap gap-3">
                    <button className="btn-secondary cursor-pointer" type="button" disabled={Boolean(busy[`${file.id}:view`])} aria-busy={Boolean(busy[`${file.id}:view`])} onClick={() => open(file, false)}><FileText className="mr-2 h-4 w-4" />{busy[`${file.id}:view`] ? 'Loading…' : 'View PDF'}</button>
                    <button className="btn-primary cursor-pointer" type="button" disabled={Boolean(busy[`${file.id}:download`])} aria-busy={Boolean(busy[`${file.id}:download`])} onClick={() => open(file, true)}><Download className="mr-2 h-4 w-4" />{busy[`${file.id}:download`] ? 'Loading…' : 'Download PDF'}</button>
                </div>
            </Card></div>)}
        </div>
        {!files.length && !error && <p>No matching files.</p>}
        <Modal open={Boolean(preview)} title={preview?.title || 'PDF Preview'} size="xl" onClose={() => setPreview(null)}>
            {preview && <iframe title={preview.title} src={preview.url} className="h-[calc(90dvh-8rem)] w-full rounded border" />}
        </Modal>
        <Modal open={uploadOpen} title="Add PDF" onClose={() => { if (!uploadBusy) setUploadOpen(false); }}>
            <form onSubmit={upload} className="space-y-4">
                <label className="block">Title <span className="text-red-600">*</span><input name="title" className="field mt-1" required maxLength={180} disabled={uploadBusy} /></label>
                <label className="block">Category <span className="text-red-600">*</span><select name="category" className="field mt-1" required defaultValue="" disabled={uploadBusy}><option value="" disabled>Select category</option>{['Crop', 'Fisheries', 'Livestock', 'Poultry', 'Others'].map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="block">Description<textarea name="description" className="field mt-1" maxLength={2000} disabled={uploadBusy} /></label>
                <label className="block">PDF File <span className="text-red-600">*</span><input name="pdf" type="file" className="field mt-1" accept=".pdf,application/pdf" required disabled={uploadBusy} /></label>
                <p className="text-sm text-slate-500">PDF only, up to 10 MB. Available to all accounts with access to Downloadable Files.</p>
                {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
                <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={uploadBusy} onClick={() => setUploadOpen(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={uploadBusy}>{uploadBusy ? 'Uploading...' : 'Add PDF'}</button></div>
            </form>
        </Modal>
        <Modal open={Boolean(deleteFile)} title="Delete File" onClose={() => { if (!deleteBusy) setDeleteFile(null); }}>
            <p className="text-lg font-semibold">Are you sure you want to delete this file?</p>
            <p className="mt-3">{deleteFile?.title}</p>
            <p className="mt-2 text-sm text-slate-500">This file will no longer be available in Downloadable Files for any account.</p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-700">{deleteError}</p>}
            <div className="mt-4 flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={deleteBusy} onClick={() => setDeleteFile(null)}>Cancel</button><button type="button" className="btn-primary" disabled={deleteBusy} onClick={confirmDelete}>{deleteBusy ? 'Deleting...' : 'Delete'}</button></div>
        </Modal>
    </section>;
}
