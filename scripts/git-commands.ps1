param(
    [string]$RemoteUrl = "https://github.com/yossmgaming/SSD_Constructions_by_SSM_Systems.git"
)

Set-StrictMode -Version Latest

function Exec([string]$cmd) {
    Write-Host "==> $cmd"
    $r = & cmd /c $cmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Command failed with exit code $LASTEXITCODE`n$r"
        exit $LASTEXITCODE
    }
    else {
        Write-Host $r
    }
}

# Ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not installed or not in PATH. Install git and try again."
    exit 1
}

# Initialize repo if needed
if (-not (Test-Path .git)) {
    Exec "git init"
    Exec "git branch -M main"
} else {
    Write-Host "Repository already initialized."
    # Ensure branch main exists and is current
    try {
        Exec "git rev-parse --verify main"
        Exec "git checkout main"
    } catch {
        Exec "git branch -M main"
    }
}

# Add or update remote
$existing = $null
try { $existing = git remote get-url origin 2>$null } catch {}
if (-not $existing) {
    Exec "git remote add origin $RemoteUrl"
} elseif ($existing -ne $RemoteUrl) {
    Write-Host "Remote 'origin' exists with URL: $existing"
    Exec "git remote set-url origin $RemoteUrl"
} else {
    Write-Host "Remote 'origin' already set to $RemoteUrl"
}

# Stage changes
Exec "git add ."

# Commit if there is something to commit
$hasCommit = $true
try {
    git rev-parse --verify HEAD > $null 2>&1
} catch {
    $hasCommit = $false
}

$status = git status --porcelain
if (-not $hasCommit) {
    if ($status) {
        Exec "git commit -m \"chore: initial commit\""
    } else {
        Write-Host "No files to commit. Skipping commit."
    }
} else {
    if ($status) {
        Exec "git commit -m \"chore: update commit\""
    } else {
        Write-Host "No changes to commit."
    }
}

# Push
Exec "git push -u origin main"
Write-Host "Done. Repository should be pushed to origin."