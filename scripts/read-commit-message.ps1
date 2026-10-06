# Timed commit message prompt for commit.bat.
# Waits up to -Timeout seconds for the first key press; once typing starts,
# waits for Enter without a time limit. The message is written to -OutFile (UTF-8, no BOM).
# Exit codes: 0 - message entered, 2 - timeout / empty input (default message used).
# NOTE: keep this file ASCII-only: Windows PowerShell 5 reads BOM-less files as ANSI.
param(
    [Parameter(Mandatory = $true)][string]$OutFile,
    [int]$Timeout = 10,
    [string]$Default = 'comment'
)

$started = $false
try {
    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        if ([Console]::KeyAvailable) {
            $started = $true
            break
        }
        Start-Sleep -Milliseconds 100
    }
} catch {
    # No interactive console (stdin redirected) - fall back to a plain prompt
    $started = $true
}

$message = ''
if ($started) {
    # The pressed key stays in the input buffer and becomes part of Read-Host input
    $message = [string](Read-Host '>')
}

$message = $message.Trim()
$code = 0
if ($message -eq '') {
    $message = $Default
    $code = 2
}

[System.IO.File]::WriteAllText($OutFile, $message, (New-Object System.Text.UTF8Encoding $false))
exit $code
