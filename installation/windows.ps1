# Inscrit le Google Chrome de ce PC à la console Chrome Enterprise Core de la Liste :
# Pariteem s'y installe, puis se met à jour toute seule. À lancer une fois dans PowerShell :
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/lraclo/Pariteem/main/installation/windows.ps1))) JETON
# Voir docs/distribution.md.
param([string]$Jeton)

$ErrorActionPreference = 'Stop'
$Url = 'https://raw.githubusercontent.com/lraclo/Pariteem/main/installation/windows.ps1'

if (-not $Jeton) {
  Write-Host "Il manque le jeton d'inscription à la fin de la commande. Recopiez la commande reçue en entier." -ForegroundColor Red
  return
}

$Principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$Admin = $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $Admin) {
  # Écrire la règle demande les droits administrateur : Windows demande l'autorisation, puis on reprend ici.
  Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"& ([scriptblock]::Create((irm $Url))) '$Jeton'`""
  $Chrome = Get-Process chrome -ErrorAction SilentlyContinue
  if ($Chrome) {
    Read-Host "Chrome va se fermer puis se rouvrir. Terminez ce que vous faites dans Chrome, puis appuyez sur Entrée"
    $Chrome | ForEach-Object { $_.CloseMainWindow() | Out-Null }
    $Chrome | Wait-Process -Timeout 30 -ErrorAction SilentlyContinue
  }
  Start-Process chrome
  Write-Host ""
  Write-Host "C'est fait. Pariteem apparaît dans Chrome d'ici une à deux minutes (menu Extensions, l'icône en forme de pièce de puzzle)." -ForegroundColor Green
  Write-Host "Chrome affiche désormais « Géré par votre organisation » : c'est ce qui lui permet d'installer et de mettre à jour Pariteem."
  return
}

# Chrome lit ce jeton au démarrage et s'inscrit à la console.
$Cle = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
if (-not (Test-Path $Cle)) { New-Item -Path $Cle -Force | Out-Null }
New-ItemProperty -Path $Cle -Name CloudManagementEnrollmentToken -Value $Jeton -PropertyType String -Force | Out-Null
Write-Host "Jeton enregistré. Si Chrome est ouvert, quittez-le puis rouvrez-le." -ForegroundColor Green
