<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <script>
            // Do not restore a previous section before React renders the home hero.
            if (location.pathname === '/' && (!location.hash || location.hash === '#home')) {
                history.scrollRestoration = 'manual';
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }
        </script>
        <title>{{ isset($sharedAnnouncement) ? $sharedAnnouncement->title.' | TARSIS' : 'TARSIS' }}</title>
        @isset($sharedAnnouncement)
            <meta property="og:type" content="article">
            <meta property="og:site_name" content="TARSIS">
            <meta property="og:title" content="{{ $sharedAnnouncement->title }}">
            <meta property="og:description" content="{{ \Illuminate\Support\Str::limit(strip_tags($sharedAnnouncement->body), 300) }}">
            <meta property="og:url" content="{{ url('/announcements/'.$sharedAnnouncement->id) }}">
            @if($sharedAnnouncement->image_url)
                <meta property="og:image" content="{{ $sharedAnnouncement->image_url }}">
                <meta property="og:image:alt" content="{{ $sharedAnnouncement->title }}">
            @endif
        @endisset
        <link rel="icon" type="image/png" sizes="512x512" href="{{ asset('assets/tarsis-favicon.png') }}">
        <link rel="apple-touch-icon" href="{{ asset('assets/tarsis-favicon.png') }}">
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body>
        <div id="root"></div>
    </body>
</html>
