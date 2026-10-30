!ifndef BB_INSTALLER_REMOVE_REGISTRY_NSH
!define BB_INSTALLER_REMOVE_REGISTRY_NSH

!macro BB_CLEAR_INSTALL_REGISTRY _REASON
  DeleteRegKey SHCTX "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey SHCTX "${INSTALL_REGISTRY_KEY}"
  !insertmacro BB_LOG_EVENT "event=registry-clear reason=${_REASON} uninstallKey=${UNINSTALL_REGISTRY_KEY} installKey=${INSTALL_REGISTRY_KEY}"
!macroend

!macro BB_LOG_ATOMIC_REMOVE_FAILURE
  Push $9
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$failed = '$BBUIAtomicFailedPath'; \
    $$instDir = '$INSTDIR'; \
    $$oldInstallDir = '$BBUIAtomicStagingDir'; \
    $$relative = $$failed; \
    if ($$failed.StartsWith($$instDir, [System.StringComparison]::CurrentCultureIgnoreCase)) { $$relative = $$failed.Substring($$instDir.Length).TrimStart('\') }; \
    $$tempCandidate = if ($$relative -and $$relative -ne $$failed) { Join-Path $$oldInstallDir $$relative } else { '' }; \
    $$kind = if ($$tempCandidate.Length -ge 260) { 'likely-long-path' } else { 'unknown' }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = '$BBUISessionId'; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = 'remove-atomic-failed'; kind = $$kind; pathLength = $$failed.Length; tempCandidateLength = $$tempCandidate.Length; atomicFailedPath = $$failed; tempCandidate = $$tempCandidate }; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value ($$payload | ConvertTo-Json -Compress -Depth 8) \
  }"`
  Pop $9
  Pop $9
!macroend

!macro BB_LOG_REMOVE_FAILURE_JSON _PHASE _FATAL _FAILED_PATH _EXTRA_FIELDS
  !insertmacro BB_LOG_JSON_EVENT "failure" "$$lockerText = '$BBUILockerList'; $$processes = @(); if ($$lockerText -and $$lockerText -notlike 'Windows did not identify*' -and $$lockerText -ne 'unknown process') { $$processes = @($$lockerText -split ',\s*' | Where-Object { $$_ } | ForEach-Object { if ($$_ -match '^(.*)\(([0-9]+)\)$$') { [ordered]@{ name = $$Matches[1]; pid = [int]$$Matches[2] } } else { [ordered]@{ name = $$_; pid = $$null } } }) }; $$payload.code = '${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED}'; $$payload.phase = '${_PHASE}'; $$payload.failedPath = '${_FAILED_PATH}'; $$payload.blockingProcesses = @($$processes); if ($$lockerText -like 'BBUI installer(*)') { $$payload.fallbackReason = 'installer-self-lock'; $$payload.message = 'The installer process is using the install directory as its current output directory.' } elseif ($$processes.Count -eq 0) { $$payload.fallbackReason = 'restart-manager-no-process'; $$payload.message = 'Windows did not identify a specific locking process. Close terminals, editors, and file managers opened in the install folder.' } else { $$payload.fallbackReason = ''; $$payload.message = '' }; $$payload.fatal = ('${_FATAL}' -eq '1'); ${_EXTRA_FIELDS}"
!macroend

!macro BB_REMOVE_INSTALL_DIR
  StrCpy $BBUIRemoveResidueCount "0"
  ${If} $BBUIRemoveResidueRoot == ""
    StrCpy $BBUIRemoveResidueRoot "$INSTDIR"
  ${EndIf}
  StrCpy $BBUIRemoveFirstFailedPath ""
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'Continue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$path = [System.IO.Path]::GetFullPath('$BBUIRemoveResidueRoot'); \
    $$firstFailedFile = '$PLUGINSDIR\bb-remove-first-failed.txt'; \
    Set-Content -LiteralPath $$firstFailedFile -Encoding UTF8 -NoNewline -Value ''; \
    function Write-InstallerLog($$message) { $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = '$BBUISessionId'; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = 'remove-log'; message = $$message }; if ($$message -match '(^|\s)event=([^\s]+)') { $$payload.event = $$Matches[2] }; Add-Content -LiteralPath $$log -Encoding UTF8 -Value ($$payload | ConvertTo-Json -Compress -Depth 8) } \
    function Convert-LongPath($$itemPath) { if ($$itemPath.StartsWith('\\')) { return '\\?\UNC\' + $$itemPath.TrimStart('\') } return '\\?\' + $$itemPath } \
    function Remove-WithRetries($$item, $$isDir) { \
      $$delays = @(200,500,1000); \
      for ($$i = 0; $$i -lt $$delays.Count; $$i++) { \
        try { \
          if ($$isDir) { [System.IO.Directory]::Delete((Convert-LongPath $$item), $$false) } else { [System.IO.File]::Delete((Convert-LongPath $$item)) } \
          return $$true \
        } catch { \
          if ($$i -lt $$delays.Count - 1) { Start-Sleep -Milliseconds $$delays[$$i] } else { Write-InstallerLog ('event=remove-resilient-leftover path=' + $$item + ' attempts=3 error=' + $$_.Exception.GetType().FullName + ': ' + $$_.Exception.Message); return $$false } \
        } \
      } \
      return $$false \
    } \
    try { \
      if (-not (Test-Path -LiteralPath $$path)) { Write-InstallerLog ('remove-longpath result=0 instDir=' + $$path); exit 0 } \
      $$failed = New-Object System.Collections.Generic.List[string]; \
      foreach ($$file in @(Get-ChildItem -LiteralPath $$path -Force -Recurse -File -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)) { if (-not (Remove-WithRetries $$file.FullName $$false)) { $$failed.Add($$file.FullName) } } \
      foreach ($$dir in @(Get-ChildItem -LiteralPath $$path -Force -Recurse -Directory -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)) { if (-not (Remove-WithRetries $$dir.FullName $$true)) { $$failed.Add($$dir.FullName) } } \
      if (-not (Remove-WithRetries $$path $$true)) { $$failed.Add($$path) } \
      Write-InstallerLog ('event=remove-resilient-summary failedCount=' + $$failed.Count + ' root=' + $$path); \
      if ($$failed.Count -gt 0) { Set-Content -LiteralPath $$firstFailedFile -Encoding UTF8 -NoNewline -Value $$failed[0]; exit $$failed.Count } \
      Write-InstallerLog ('remove-longpath result=0 instDir=' + $$path); \
      exit 0 \
    } catch { \
      Write-InstallerLog ('remove-longpath result=1 instDir=' + $$path + ' error=' + $$_.Exception.GetType().FullName + ': ' + $$_.Exception.Message); \
      exit 1 \
    } \
  }"`
  Pop $BBUIRemoveDirResult

  ClearErrors
  SetDetailsPrint none
  FileOpen $BBUIRemoveFirstFailedFile "$PLUGINSDIR\bb-remove-first-failed.txt" r
  ${IfNot} ${Errors}
    FileRead $BBUIRemoveFirstFailedFile $BBUIRemoveFirstFailedPath
    FileClose $BBUIRemoveFirstFailedFile
  ${EndIf}
  SetDetailsPrint lastused

  ${If} $BBUIRemoveDirResult == "error"
    !insertmacro BB_LOG_EVENT "event=remove-longpath fallback=RMDir reason=no-powershell root=$INSTDIR"
    RMDir /r "$BBUIRemoveResidueRoot"
    ${If} ${FileExists} "$BBUIRemoveResidueRoot\*.*"
      StrCpy $BBUIRemoveDirResult "1"
    ${Else}
      StrCpy $BBUIRemoveDirResult "0"
    ${EndIf}
  ${EndIf}

  ${If} $BBUIRemoveDirResult != 0
    StrCpy $BBUIRemoveResidueCount $BBUIRemoveDirResult
  ${EndIf}
!macroend

!macro customRemoveFiles
  !insertmacro BB_LOG_EVENT "remove-start instDir=$INSTDIR"
  Var /GLOBAL BBUIRemoveDirResult
  Var /GLOBAL BBUIAtomicFailedPath
  Var /GLOBAL BBUIAtomicRemoveSucceeded
  Var /GLOBAL BBUIAtomicStagingDir
  Var /GLOBAL BBUIRemoveResidueCount
  Var /GLOBAL BBUIRemoveResidueRoot
  Var /GLOBAL BBUIRemoveFirstFailedPath
  Var /GLOBAL BBUIRemoveFirstFailedFile
  StrCpy $BBUIAtomicFailedPath ""
  StrCpy $BBUIAtomicRemoveSucceeded "0"
  StrCpy $BBUIAtomicStagingDir ""
  StrCpy $BBUIRemoveResidueCount "0"
  StrCpy $BBUIRemoveResidueRoot "$INSTDIR"
  StrCpy $BBUIRemoveFirstFailedPath ""

  SetOutPath $TEMP
  StrCpy $BBUICurrentOutDir "$TEMP"

  ${if} ${isUpdated}
    StrCpy $BBUIAtomicStagingDir "$INSTDIR.__old"
    ${If} ${FileExists} "$BBUIAtomicStagingDir\*.*"
      StrCpy $BBUIRemoveResidueRoot "$BBUIAtomicStagingDir"
      !insertmacro BB_LOG_EVENT "remove-stale-staging start root=$BBUIRemoveResidueRoot"
      !insertmacro BB_REMOVE_INSTALL_DIR
      StrCpy $BBUIRemoveResidueRoot "$INSTDIR"
    ${EndIf}

    bb_retry_atomic_rename:
      ClearErrors
      Rename "$INSTDIR" "$BBUIAtomicStagingDir"
    ${if} ${Errors}
      DetailPrint "Atomic update cleanup failed before replacing previous installation: $INSTDIR"
      StrCpy $BBUIAtomicFailedPath "$INSTDIR"
      !insertmacro BB_LOG_ATOMIC_REMOVE_FAILURE
      !insertmacro BB_CAPTURE_FAILED_PATH_LOCKERS "$BBUIAtomicFailedPath"
      ${IfNot} ${Silent}
        !insertmacro BB_PROMPT_FAILED_PATH_LOCKERS "$BBUIAtomicFailedPath" "atomic-failed" bb_retry_atomic_rename bb_cancel_atomic_rename bb_continue_atomic_failed
        bb_cancel_atomic_rename:
      ${EndIf}
      bb_continue_atomic_failed:
      !insertmacro BB_LOG_REMOVE_FAILURE_JSON "atomic-failed" "1" "$BBUIAtomicFailedPath" "$$payload.atomicFailedPath = '$BBUIAtomicFailedPath'"
      !insertmacro BB_LOG_EVENT "code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=atomic-failed fatal=1 degraded=none firstFailed=$BBUIAtomicFailedPath atomicFailedPath=$BBUIAtomicFailedPath"
      !insertmacro BB_CLEAR_INSTALL_REGISTRY "remove-failed-before-quit"
      !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} "event=session-end result=fail code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=atomic-failed fatal=1 firstFailed=$BBUIAtomicFailedPath lockers=$BBUILockerList" "${BB_MSG_REPLACE_LOCKED_EN}" "${BB_MSG_REPLACE_LOCKED_ZH}" "${BB_MSG_CLOSE_SHOWN_FILE_ACTION_EN}" "${BB_MSG_CLOSE_SHOWN_FILE_ACTION_ZH}"
    ${else}
      !insertmacro BB_LOG_EVENT "remove-atomic result=0 staging=$BBUIAtomicStagingDir"
      StrCpy $BBUIAtomicRemoveSucceeded "1"
      StrCpy $BBUIRemoveResidueRoot "$BBUIAtomicStagingDir"
    ${endif}
  ${endif}

  bb_retry_remove_install_dir:
    !insertmacro BB_REMOVE_INSTALL_DIR
  ${if} $BBUIRemoveDirResult != 0
    !insertmacro BB_CAPTURE_FAILED_PATH_LOCKERS "$BBUIRemoveFirstFailedPath"
    ${if} $BBUIAtomicRemoveSucceeded == "1"
      ${IfNot} ${Silent}
        !insertmacro BB_PROMPT_FAILED_PATH_LOCKERS "$BBUIRemoveFirstFailedPath" "residual-delete-failed" bb_retry_remove_install_dir bb_cancel_remove_after_rm bb_continue_after_rm
        bb_cancel_remove_after_rm:
          !insertmacro BB_LOG_REMOVE_FAILURE_JSON "residual-delete-failed" "1" "$BBUIRemoveFirstFailedPath" "$$payload.residueRoot = '$BBUIRemoveResidueRoot'; $$payload.failedCount = '$BBUIRemoveResidueCount'; $$payload.removeDirResult = '$BBUIRemoveDirResult'; $$payload.atomicSucceeded = ('$BBUIAtomicRemoveSucceeded' -eq '1')"
          !insertmacro BB_LOG_EVENT "code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=residual-delete-failed userAction=cancel fatal=1 residueRoot=$BBUIRemoveResidueRoot failedCount=$BBUIRemoveResidueCount firstFailed=$BBUIRemoveFirstFailedPath removeDirResult=$BBUIRemoveDirResult removeResidueCount=$BBUIRemoveResidueCount atomicFailedPath=$BBUIAtomicFailedPath atomicSucceeded=$BBUIAtomicRemoveSucceeded"
          !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} "event=session-end result=fail code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=residual-delete-failed userAction=cancel fatal=1 firstFailed=$BBUIRemoveFirstFailedPath lockers=$BBUILockerList" "${BB_MSG_PREVIOUS_FILE_OPEN_EN}" "${BB_MSG_PREVIOUS_FILE_OPEN_ZH}" "${BB_MSG_CLOSE_SHOWN_FILE_ACTION_EN}" "${BB_MSG_CLOSE_SHOWN_FILE_ACTION_ZH}"
      ${EndIf}
      bb_continue_after_rm:
      DetailPrint `BBUI previous installation had locked residual files; continuing after atomic cleanup succeeded: $INSTDIR`
      !insertmacro BB_LOG_EVENT "code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=residual-delete-failed degraded=continue fatal=0 residueRoot=$BBUIRemoveResidueRoot failedCount=$BBUIRemoveResidueCount firstFailed=$BBUIRemoveFirstFailedPath removeDirResult=$BBUIRemoveDirResult removeResidueCount=$BBUIRemoveResidueCount atomicFailedPath=$BBUIAtomicFailedPath atomicSucceeded=$BBUIAtomicRemoveSucceeded"
    ${else}
      DetailPrint `Can't safely remove previous installation without atomic cleanup proof: $INSTDIR`
      ${IfNot} ${Silent}
        !insertmacro BB_PROMPT_FAILED_PATH_LOCKERS "$BBUIRemoveFirstFailedPath" "residual-delete-failed-no-atomic-proof" bb_retry_remove_install_dir bb_cancel_remove_no_atomic bb_continue_remove_no_atomic
        bb_cancel_remove_no_atomic:
      ${EndIf}
      bb_continue_remove_no_atomic:
      !insertmacro BB_LOG_REMOVE_FAILURE_JSON "residual-delete-failed-no-atomic-proof" "1" "$BBUIRemoveFirstFailedPath" "$$payload.residueRoot = '$BBUIRemoveResidueRoot'; $$payload.failedCount = '$BBUIRemoveResidueCount'; $$payload.removeDirResult = '$BBUIRemoveDirResult'; $$payload.atomicSucceeded = ('$BBUIAtomicRemoveSucceeded' -eq '1')"
      !insertmacro BB_LOG_EVENT "code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=residual-delete-failed-no-atomic-proof degraded=none fatal=1 residueRoot=$BBUIRemoveResidueRoot failedCount=$BBUIRemoveResidueCount firstFailed=$BBUIRemoveFirstFailedPath removeDirResult=$BBUIRemoveDirResult removeResidueCount=$BBUIRemoveResidueCount atomicFailedPath=$BBUIAtomicFailedPath atomicSucceeded=$BBUIAtomicRemoveSucceeded"
      !insertmacro BB_CLEAR_INSTALL_REGISTRY "remove-failed-before-quit"
      !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} "event=session-end result=fail code=${BB_E_INSTALL_DIR_REMOVE_OR_LOCKED} phase=residual-delete-failed-no-atomic-proof fatal=1 firstFailed=$BBUIRemoveFirstFailedPath removeDirResult=$BBUIRemoveDirResult lockers=$BBUILockerList" "${BB_MSG_REMOVE_PREVIOUS_DIR_EN}" "${BB_MSG_REMOVE_PREVIOUS_DIR_ZH}" "${BB_MSG_CLOSE_INSTALL_DIR_ACTION_EN}" "${BB_MSG_CLOSE_INSTALL_DIR_ACTION_ZH}"
    ${endif}
  ${else}
    !insertmacro BB_LOG_EVENT "remove-final errors=0 instDir=$INSTDIR removeDirResult=$BBUIRemoveDirResult removeResidueCount=$BBUIRemoveResidueCount removeResidueRoot=$BBUIRemoveResidueRoot atomicFailedPath=$BBUIAtomicFailedPath atomicSucceeded=$BBUIAtomicRemoveSucceeded"
  ${endif}
!macroend

!macro customUnInit
  !insertmacro BB_LOG_EVENT "uninit instDir=$INSTDIR"
!macroend

!macro customUnInstall
  !insertmacro BB_LOG_EVENT "uninstall-section start instDir=$INSTDIR"
!macroend

!endif
