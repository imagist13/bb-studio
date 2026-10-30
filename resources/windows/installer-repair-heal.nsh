!ifndef BB_INSTALLER_REPAIR_HEAL_NSH
!define BB_INSTALLER_REPAIR_HEAL_NSH

Var /GLOBAL BBUIRegistryInstallIsValid
Var /GLOBAL BBUIInnerFailureSummary
Var /GLOBAL BBUIInnerRootCode
Var /GLOBAL BBUIInnerFailureReadResult

!macro BB_READ_LAST_INNER_FAILURE
  InitPluginsDir
  StrCpy $BBUIInnerRootCode ""
  StrCpy $BBUIInnerFailureSummary "No specific locking process was identified. Close BBUI, terminals, editors, and file managers opened in the install folder."
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$logPath = '$BBUISessionLogPath'; \
    $$summary = 'No specific locking process was identified. Close BBUI, terminals, editors, and file managers opened in the install folder.'; \
    $$code = ''; \
    if ($$logPath -and (Test-Path -LiteralPath $$logPath)) { \
      $$events = @(Get-Content -LiteralPath $$logPath -ErrorAction SilentlyContinue | ForEach-Object { try { $$_ | ConvertFrom-Json } catch { $$null } } | Where-Object { $$_ }); \
      $$failure = @($$events | Where-Object { $$_.event -eq 'failure' -and $$_.updated -eq $$true } | Select-Object -Last 1)[0]; \
      if (-not $$failure) { $$failure = @($$events | Where-Object { $$_.event -eq 'failure' } | Select-Object -Last 1)[0] }; \
      if ($$failure) { \
        $$code = ([string]$$failure.code).Trim(); \
        $$phase = ([string]$$failure.phase).Trim(); \
        $$path = ([string]$$failure.failedPath).Trim(); \
        $$blocking = ''; \
        $$processes = @($$failure.blockingProcesses); \
        if ($$processes.Count -gt 0) { $$blocking = (@($$processes | ForEach-Object { if ($$_.pid) { [string]$$_.name + '(' + [string]$$_.pid + ')' } else { [string]$$_.name } }) -join ', ') }; \
        if (-not $$blocking) { $$blocking = ([string]$$failure.message).Trim() }; \
        if (-not $$blocking) { $$blocking = 'Windows did not identify a specific locking process. Close terminals, editors, and file managers opened in the install folder.' }; \
        $$parts = @('- Outer installer: previous uninstaller exited with code $R0', ('- Inner failure: ' + $$code + ' phase ' + $$phase)); \
        if ($$path) { $$parts += ('- File or folder: ' + $$path) }; \
        $$parts += ('- Blocking process: ' + $$blocking); \
        $$summary = $$parts -join [Environment]::NewLine; \
      } \
    }; \
    if (-not $$code) { $$code = '-----' }; \
    [Console]::Out.Write($$code + '|' + $$summary) \
  }"`
  Pop $BBUIInnerFailureReadResult
  Pop $BBUIInnerFailureReadResult
  StrCpy $BBUIInnerRootCode $BBUIInnerFailureReadResult 5
  ${If} $BBUIInnerRootCode == "-----"
    StrCpy $BBUIInnerRootCode ""
  ${EndIf}
  StrCpy $BBUIInnerFailureSummary $BBUIInnerFailureReadResult 4096 6
!macroend

!macro BB_LOG_UNINSTALLER_REPAIR _PHASE
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$path = '$INSTDIR\${UNINSTALL_FILENAME}'; \
    $$item = Get-Item -LiteralPath $$path -ErrorAction SilentlyContinue; \
    $$version = if ($$item) { $$item.VersionInfo.ProductVersion } else { '' }; \
    $$length = if ($$item) { $$item.Length } else { '' }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = '$BBUISessionId'; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = 'uninstaller-repair'; phase = '${_PHASE}'; path = $$path; exists = [bool]$$item; productVersion = $$version; length = $$length }; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value ($$payload | ConvertTo-Json -Compress -Depth 8) \
  }"`
  Pop $BBUIRepairLogResult
!macroend

!macro BB_REPAIR_INSTALLED_UNINSTALLER
  Var /GLOBAL BBUIInstalledUninstaller
  Var /GLOBAL BBUIBundledUninstaller
  Var /GLOBAL BBUIRepairLogResult

  !insertmacro BB_LOG_UNINSTALLER_REPAIR "before"
  StrCpy $BBUIInstalledUninstaller "$INSTDIR\${UNINSTALL_FILENAME}"

  InitPluginsDir
  StrCpy $BBUIBundledUninstaller "$PLUGINSDIR\BBUI-fixed-uninstaller.exe"
  SetOverwrite on
  File "/oname=$PLUGINSDIR\BBUI-fixed-uninstaller.exe" "${UNINSTALLER_OUT_FILE}"

  ${If} ${FileExists} "$BBUIInstalledUninstaller"
    ClearErrors
    CopyFiles /SILENT "$BBUIBundledUninstaller" "$BBUIInstalledUninstaller"
    ${If} ${Errors}
      !insertmacro BB_LOG_UNINSTALLER_REPAIR "copy-failed-retry"
      !insertmacro BB_STOP_APP_PROCESSES
      Sleep 1000

      ClearErrors
      CopyFiles /SILENT "$BBUIBundledUninstaller" "$BBUIInstalledUninstaller"
      ${If} ${Errors}
        ${If} ${FileExists} "$BBUIBundledUninstaller"
          !insertmacro BB_LOG_UNINSTALLER_REPAIR "copy-failed-using-bundled"
          !insertmacro BB_LOG_EVENT "event=uninstaller-repair phase=copy-failed-using-bundled"
        ${Else}
          !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_UNINSTALLER_COPY_OR_REBUILD_FAILED} "uninstaller-repair copy-failed-retry-bundled-missing" "${BB_MSG_UNINSTALLER_COPY_LOCKED_EN}" "${BB_MSG_UNINSTALLER_COPY_LOCKED_ZH}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_EN}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_ZH}"
        ${EndIf}
      ${Else}
        !insertmacro BB_LOG_UNINSTALLER_REPAIR "after-copy-retry"
      ${EndIf}
    ${Else}
      !insertmacro BB_LOG_UNINSTALLER_REPAIR "after-copy"
    ${EndIf}
  ${Else}
    ClearErrors
    CopyFiles /SILENT "$BBUIBundledUninstaller" "$BBUIInstalledUninstaller"
    ${If} ${Errors}
      !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_UNINSTALLER_COPY_OR_REBUILD_FAILED} "uninstaller-repair rebuild-failed" "${BB_MSG_UNINSTALLER_REBUILD_FAILED_EN}" "${BB_MSG_UNINSTALLER_REBUILD_FAILED_ZH}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_EN}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_ZH}"
    ${EndIf}

    ${IfNot} ${FileExists} "$BBUIInstalledUninstaller"
      !insertmacro BB_FAIL_REPORTABLE_BILINGUAL ${BB_E_UNINSTALLER_COPY_OR_REBUILD_FAILED} "uninstaller-repair rebuild-missing-after-copy" "${BB_MSG_UNINSTALLER_REBUILD_MISSING_EN}" "${BB_MSG_UNINSTALLER_REBUILD_MISSING_ZH}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_EN}" "${BB_MSG_UNINSTALLER_REPAIR_ACTION_ZH}"
    ${EndIf}

    !insertmacro BB_LOG_UNINSTALLER_REPAIR "rebuilt"
    !insertmacro BB_LOG_EVENT "event=uninstaller-repair phase=rebuilt"
  ${EndIf}
!macroend

!macro BB_HEAL_INSTALL_REGISTRY
  Var /GLOBAL BBUIRegInstallLocation
  Var /GLOBAL BBUIRegUninstallString
  Var /GLOBAL BBUIRegInstallExe

  StrCpy $BBUIRegistryInstallIsValid "0"

  ReadRegStr $BBUIRegInstallLocation SHCTX "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  ReadRegStr $BBUIRegUninstallString SHCTX "${UNINSTALL_REGISTRY_KEY}" "UninstallString"

  ${If} $BBUIRegInstallLocation == ""
    !insertmacro BB_LOG_EVENT "event=registry-heal phase=missing-install-location uninstallString=$BBUIRegUninstallString"
    !insertmacro BB_CLEAR_INSTALL_REGISTRY "missing-install-location"
  ${Else}
    StrCpy $BBUIRegInstallExe "$BBUIRegInstallLocation\${BB_APP_EXECUTABLE_FILENAME}"
    ${If} ${FileExists} "$BBUIRegInstallExe"
      StrCpy $INSTDIR "$BBUIRegInstallLocation"
      StrCpy $BBUIRegistryInstallIsValid "1"
      !insertmacro BB_LOG_EVENT "event=registry-heal phase=valid-install-location instDir=$INSTDIR uninstallString=$BBUIRegUninstallString"
    ${Else}
      !insertmacro BB_LOG_EVENT "event=registry-heal phase=stale-install-location installLocation=$BBUIRegInstallLocation uninstallString=$BBUIRegUninstallString"
      !insertmacro BB_CLEAR_INSTALL_REGISTRY "stale-install-location"
    ${EndIf}
  ${EndIf}
!macroend

!macro BB_LOG_UNINSTALL_RESULT _ROOT_KEY _HAD_ERRORS
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = '$BBUISessionId'; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = 'uninstall-result'; root = '${_ROOT_KEY}'; launchErrors = '${_HAD_ERRORS}'; exitCode = '$R0' }; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value ($$payload | ConvertTo-Json -Compress -Depth 8) \
  }"`
  Pop $BBUIUninstallLogResult
!macroend

!macro BB_HANDLE_UNINSTALL_RESULT _ROOT_KEY _LABEL_PREFIX
  ${If} ${Errors}
    StrCpy $BBUIUninstallHadErrors "1"
  ${Else}
    StrCpy $BBUIUninstallHadErrors "0"
  ${EndIf}

  !insertmacro BB_LOG_UNINSTALL_RESULT "${_ROOT_KEY}" "$BBUIUninstallHadErrors"

  ${If} $BBUIUninstallHadErrors == "1"
    DetailPrint `Uninstall was not successful. Not able to launch uninstaller!`
    Return
  ${EndIf}

  ${If} $R0 != 0
      DetailPrint `Uninstall was not successful. Uninstaller error code: $R0.`
      !insertmacro BB_READ_LAST_INNER_FAILURE
      ${If} $BBUILockerList != ""
        StrCpy $BBUIInnerFailureSummary "- Failure: previous uninstaller failed with exit code $R0$\r$\n- File or folder: $INSTDIR$\r$\n- Blocking process: $BBUILockerList"
      ${EndIf}
      !insertmacro BB_LOG_EVENT "event=old-uninstaller-failed action=report exitCode=$R0 lockers=$BBUILockerList uninstallerDetail=$BBUIInnerFailureSummary"
      ${If} $BBUIInnerRootCode != ""
        !insertmacro BB_FAIL_REPORTABLE_ROOTED_BILINGUAL_DIAGNOSTICS "$BBUIInnerRootCode" ${BB_E_OLD_UNINSTALL_FAILED} "old-uninstaller exitCode=$R0 lockers=$BBUILockerList uninstallerDetail=$BBUIInnerFailureSummary" "${BB_MSG_OLD_UNINSTALL_FAILED_EN}" "${BB_MSG_OLD_UNINSTALL_FAILED_ZH}" "${BB_MSG_OLD_UNINSTALL_ACTION_EN}" "${BB_MSG_OLD_UNINSTALL_ACTION_ZH}" "$BBUIInnerFailureSummary" "$BBUIInnerFailureSummary"
      ${Else}
        !insertmacro BB_FAIL_REPORTABLE_BILINGUAL_DIAGNOSTICS ${BB_E_OLD_UNINSTALL_FAILED} "old-uninstaller exitCode=$R0 lockers=$BBUILockerList uninstallerDetail=$BBUIInnerFailureSummary" "${BB_MSG_OLD_UNINSTALL_FAILED_EN}" "${BB_MSG_OLD_UNINSTALL_FAILED_ZH}" "${BB_MSG_OLD_UNINSTALL_ACTION_EN}" "${BB_MSG_OLD_UNINSTALL_ACTION_ZH}" "$BBUIInnerFailureSummary" "$BBUIInnerFailureSummary"
      ${EndIf}
  ${EndIf}
!macroend

!macro customInit
  !insertmacro BB_HEAL_INSTALL_REGISTRY
  ${If} $BBUIRegistryInstallIsValid == "1"
    !insertmacro BB_REPAIR_INSTALLED_UNINSTALLER
  ${EndIf}
!macroend

!macro customUnInstallCheck
  !insertmacro BB_HANDLE_UNINSTALL_RESULT "SHELL_CONTEXT" "shctx"
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro BB_HANDLE_UNINSTALL_RESULT "HKEY_CURRENT_USER" "hkcu"
!macroend

!endif
