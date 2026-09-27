<?php

namespace App\Services;

class QrCodeService
{
    public function svg(string $payload, int $size = 156): string
    {
        $cells = 29;
        $cell = $size / $cells;
        $hash = hash('sha256', $payload);
        $bits = '';

        foreach (str_split($hash) as $char) {
            $bits .= str_pad(base_convert($char, 16, 2), 4, '0', STR_PAD_LEFT);
        }

        $rects = '';
        for ($row = 0; $row < $cells; $row++) {
            for ($col = 0; $col < $cells; $col++) {
                $finder = $this->finder($row, $col, 0, 0) || $this->finder($row, $col, 0, 22) || $this->finder($row, $col, 22, 0);
                $bit = $bits[($row * $cells + $col) % strlen($bits)] === '1';
                if ($finder || (($row + $col) % 3 === 0 && $bit)) {
                    $x = round($col * $cell, 2);
                    $y = round($row * $cell, 2);
                    $rects .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$cell}\" height=\"{$cell}\"/>";
                }
            }
        }

        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {$size} {$size}\" role=\"img\" aria-label=\"TARSIS QR code\"><rect width=\"{$size}\" height=\"{$size}\" fill=\"#fff\"/><g fill=\"#111827\">{$rects}</g></svg>";
    }

    private function finder(int $row, int $col, int $top, int $left): bool
    {
        $inside = $row >= $top && $row < $top + 7 && $col >= $left && $col < $left + 7;
        if (! $inside) {
            return false;
        }

        $r = $row - $top;
        $c = $col - $left;

        return $r === 0 || $r === 6 || $c === 0 || $c === 6 || ($r >= 2 && $r <= 4 && $c >= 2 && $c <= 4);
    }
}
