$ErrorActionPreference = 'Stop'

$TaskName = 'AutoShutdown'
$TaskCommand = 'shutdown /s /f /t 0'

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

function Write-Header {
    Clear-Host
    Write-Host '=============================================' -ForegroundColor Cyan
    Write-Host '  AUTO SHUTDOWN TASK MANAGER (Windows)' -ForegroundColor Cyan
    Write-Host '=============================================' -ForegroundColor Cyan
    Write-Host "Task Name : $TaskName"
    Write-Host "Command   : $TaskCommand"
    if (-not (Test-IsAdmin)) {
        Write-Host 'Status    : Jalankan sebagai Administrator agar Add/Edit/Delete berhasil.' -ForegroundColor Yellow
    }
    Write-Host ''
}

function Get-TaskRaw {
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & schtasks /Query /TN $TaskName /V /FO LIST 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
    }

    return @{
        Output = @($output)
        ExitCode = $exitCode
    }
}

function Test-TaskExists {
    $result = Get-TaskRaw
    return ($result.ExitCode -eq 0), $result.Output
}

function Show-TaskStatus {
    $exists, $output = Test-TaskExists
    if ($exists) {
        Write-Host '[STATUS] Task ditemukan:' -ForegroundColor Green
        $output | ForEach-Object {
            if ($_ -match '^(TaskName|Status|Schedule|Start Time|Next Run Time|Last Run Time|Last Result):') {
                Write-Host "  $_"
            }
        }
    } else {
        Write-Host '[STATUS] Task belum ada.' -ForegroundColor Yellow
    }
    Write-Host ''
}

function Read-Time([string]$label, [string]$defaultValue) {
    while ($true) {
        $inputTime = Read-Host "$label (format HH:mm, default $defaultValue)"
        if ([string]::IsNullOrWhiteSpace($inputTime)) { $inputTime = $defaultValue }
        if ($inputTime -match '^([01]\d|2[0-3]):([0-5]\d)$') {
            return $inputTime
        }
        Write-Host 'Format jam tidak valid. Contoh: 19:00' -ForegroundColor Red
    }
}

function Add-Task {
    $shutdownTime = Read-Time 'Masukkan jam shutdown harian' '19:00'
    & schtasks /Create /TN $TaskName /TR $TaskCommand /SC DAILY /ST $shutdownTime /RL HIGHEST /F | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Task berhasil dibuat pada jam $shutdownTime" -ForegroundColor Green
    } else {
        Write-Host 'Gagal membuat task. Pastikan dijalankan sebagai Administrator.' -ForegroundColor Red
    }
}

function Edit-Task {
    $exists, $_output = Test-TaskExists
    if (-not $exists) {
        Write-Host 'Task belum ada. Silakan Add dulu.' -ForegroundColor Yellow
        return
    }
    $shutdownTime = Read-Time 'Masukkan jam shutdown baru' '19:00'
    & schtasks /Create /TN $TaskName /TR $TaskCommand /SC DAILY /ST $shutdownTime /RL HIGHEST /F | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Task berhasil diupdate ke jam $shutdownTime" -ForegroundColor Green
    } else {
        Write-Host 'Gagal mengubah task. Pastikan dijalankan sebagai Administrator.' -ForegroundColor Red
    }
}

function Delete-Task {
    $exists, $_output = Test-TaskExists
    if (-not $exists) {
        Write-Host 'Task tidak ditemukan, tidak ada yang dihapus.' -ForegroundColor Yellow
        return
    }
    $confirm = Read-Host 'Yakin hapus task? (Y/N)'
    if ($confirm -notin @('Y', 'y')) {
        Write-Host 'Hapus dibatalkan.' -ForegroundColor DarkYellow
        return
    }
    & schtasks /Delete /TN $TaskName /F | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Task berhasil dihapus.' -ForegroundColor Green
    } else {
        Write-Host 'Gagal menghapus task. Pastikan dijalankan sebagai Administrator.' -ForegroundColor Red
    }
}

while ($true) {
    Write-Header
    Show-TaskStatus

    Write-Host 'Pilih aksi:'
    Write-Host '  1. Add    (buat task baru)'
    Write-Host '  2. Edit   (ubah jam task)'
    Write-Host '  3. Delete (hapus task)'
    Write-Host '  4. Refresh status'
    Write-Host '  0. Exit'

    $choice = Read-Host 'Masukkan pilihan (0-4)'
    Write-Host ''

    switch ($choice) {
        '1' { Add-Task }
        '2' { Edit-Task }
        '3' { Delete-Task }
        '4' { Write-Host 'Status diperbarui.' -ForegroundColor Cyan }
        '0' { break }
        default { Write-Host 'Pilihan tidak valid.' -ForegroundColor Red }
    }

    if ($choice -ne '0') {
        Write-Host ''
        Read-Host 'Tekan Enter untuk kembali ke menu'
    }
}
