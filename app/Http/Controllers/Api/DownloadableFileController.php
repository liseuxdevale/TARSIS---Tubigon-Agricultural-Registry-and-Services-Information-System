<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DownloadableFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DownloadableFileController extends Controller
{
    private const FILES = [
        'boatr-registration' => ['BoatR Standard Registration Form', 'Fisherfolk', 'Boat registration form (Annex A).'],
        'fishr-registration' => ['FishR Form 1', 'Fisherfolk', 'Fisherfolk registration form.'],
        'pcic-claim' => ['PCIC Claim Form', 'Insurance', 'Form for filing an insurance claim.'],
        'pcic-application' => ['PCIC Application Form', 'Insurance', 'Form for applying for insurance coverage.'],
    ];

    public function index()
    {
        $deleted = DownloadableFile::onlyTrashed()->whereNotNull('builtin_key')->pluck('builtin_key')->all();
        return response()->json(collect(self::FILES)->except($deleted)->map(fn ($file, $id) => [
            'id' => $id, 'title' => $file[0], 'category' => $file[1], 'description' => $file[2],
            'filename' => $id.'.pdf',
        ])->values()->concat(DownloadableFile::latest()->get()->map(fn ($file) => $this->metadata($file))));
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->hasRole('super_admin'), 403);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', \Illuminate\Validation\Rule::in(['Crop', 'Fisheries', 'Livestock', 'Poultry', 'Others'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'pdf' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240'],
        ]);
        $path = $request->file('pdf')->store('downloadable-files', 'local');
        try {
            $file = DownloadableFile::create([
                'title' => $data['title'], 'category' => $data['category'],
                'description' => $data['description'] ?? null,
                'path' => $path, 'uploaded_by' => $request->user()->id,
            ]);
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
        return response()->json(['message' => 'PDF added successfully.', 'file' => $this->metadata($file)], 201);
    }

    private function metadata(DownloadableFile $file): array
    {
        return ['id' => 'uploaded-'.$file->id, 'title' => $file->title,
            'category' => $file->category, 'description' => $file->description ?? '',
            'filename' => (Str::slug($file->title) ?: 'document').'.pdf'];
    }

    public function destroy(Request $request, string $file)
    {
        abort_unless($request->user()?->hasRole('super_admin'), 403);
        $request->validate(['confirm' => ['required', 'accepted']]);
        if (preg_match('/^uploaded-([1-9][0-9]*)$/', $file, $matches)) {
            DownloadableFile::findOrFail($matches[1])->delete();
        } else {
            abort_unless(isset(self::FILES[$file]), 404);
            $record = DownloadableFile::withTrashed()->firstOrCreate(['builtin_key' => $file], [
                'title' => self::FILES[$file][0], 'category' => self::FILES[$file][1],
                'path' => 'forms/'.$file.'.pdf', 'uploaded_by' => $request->user()->id,
            ]);
            abort_if($record->trashed(), 404);
            $record->delete();
        }
        return response()->json(['message' => 'File deleted successfully.']);
    }

    public function show(Request $request, string $file)
    {
        if (preg_match('/^uploaded-([1-9][0-9]*)$/', $file, $matches)) {
            $uploaded = DownloadableFile::findOrFail($matches[1]);
            $disk = Storage::disk('local');
            abort_unless($disk->exists($uploaded->path), 404, 'File is currently unavailable.');
            $path = $disk->path($uploaded->path);
            $filename = $this->metadata($uploaded)['filename'];
            return $request->boolean('download')
                ? response()->download($path, $filename, ['Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff'])
                : response()->file($path, ['Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff']);
        }
        abort_unless(isset(self::FILES[$file]), 404);
        abort_if(DownloadableFile::onlyTrashed()->where('builtin_key', $file)->exists(), 404);
        $path = resource_path('forms/'.$file.'.pdf');
        abort_unless(is_file($path), 404, 'File is currently unavailable.');
        return $request->boolean('download')
            ? response()->download($path, $file.'.pdf', ['Content-Type' => 'application/pdf'])
            : response()->file($path, ['Content-Type' => 'application/pdf']);
    }
}
