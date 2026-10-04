param([Parameter(Mandatory=$true)][string]$InputFile, [Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
$wordApp = $null
$wordDocument = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordApp.AutomationSecurity = 3
    $wordApp.Options.UpdateLinksAtOpen = $false
    $confirmConversions = $false
    $readOnly = $true
    $addToRecent = $false
    $wordDocument = $wordApp.Documents.Open([ref]$InputFile, [ref]$confirmConversions, [ref]$readOnly, [ref]$addToRecent)
    $wordDocument.ExportAsFixedFormat($OutputFile, 17)
} finally {
    $discardChanges = 0
    if ($null -ne $wordDocument) { $wordDocument.Close([ref]$discardChanges); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordDocument) }
    if ($null -ne $wordApp) { $wordApp.Quit([ref]$discardChanges); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordApp) }
}
