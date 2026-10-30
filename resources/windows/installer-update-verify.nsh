!ifndef BB_INSTALLER_UPDATE_VERIFY_NSH
!define BB_INSTALLER_UPDATE_VERIFY_NSH

Var /GLOBAL BBUIUninstallHadErrors
Var /GLOBAL BBUIUninstallLogResult
Var /GLOBAL BBUIVerifyResourceResult
Var /GLOBAL BBUIUpdatedAppExitWaitResult
Var /GLOBAL BBUIActiveMarkerExecResult
Var /GLOBAL BBUIActiveMarkerResult

!define BB_ACTIVE_INSTALLER_MARKER "bb-installer-active.marker"

!macro BB_BRING_UPDATED_INSTALLER_TO_FRONT
  ${If} ${isUpdated}
    BringToFront
    !insertmacro BB_SLOG "event=updated-installer-foreground action=bring-to-front"
  ${EndIf}
!macroend

!macro BB_WAIT_FOR_UPDATED_APP_EXIT
  ${If} ${isUpdated}
    !insertmacro BB_SLOG "event=updated-app-exit-wait phase=start"
    StrCpy $BBUIUpdatedAppExitWaitResult "0"

    nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
      $$ErrorActionPreference = 'SilentlyContinue'; \
      $$deadline = (Get-Date).AddSeconds(10); \
      $$target = [System.IO.Path]::GetFullPath((Join-Path '$INSTDIR' '${BB_APP_EXECUTABLE_FILENAME}')); \
      do { \
        $$hits = @(Get-CimInstance -ClassName Win32_Process | Where-Object { \
          $$path = $$_.ExecutablePath; \
          if (-not $$path) { $$path = $$_.Path } \
          $$_.Name -ieq '${BB_APP_EXECUTABLE_FILENAME}' -and $$path -and \
          [string]::Equals([System.IO.Path]::GetFullPath($$path), $$target, [System.StringComparison]::CurrentCultureIgnoreCase) \
        }); \
        if ($$hits.Count -eq 0) { exit 0 }; \
        Start-Sleep -Milliseconds 500; \
      } while ((Get-Date) -lt $$deadline); \
      exit 1 \
    }"`
    Pop $BBUIUpdatedAppExitWaitResult

    ${If} $BBUIUpdatedAppExitWaitResult != 0
      !insertmacro BB_SLOG "event=updated-app-exit-wait phase=timeout action=stop"
      !insertmacro BB_STOP_APP_PROCESSES
    ${EndIf}

    !insertmacro BB_SLOG "event=updated-app-exit-wait phase=done result=$BBUIUpdatedAppExitWaitResult"
  ${EndIf}
!macroend

!macro BB_RECORD_ACTIVE_INSTALLER_MARKER
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$marker = Join-Path $$env:TEMP '${BB_ACTIVE_INSTALLER_MARKER}'; \
    if (-not (Test-Path -LiteralPath $$marker)) { Write-Output 'missing'; exit 0 }; \
    $$item = Get-Item -LiteralPath $$marker; \
    if ($$item.LastWriteTime -lt (Get-Date).AddHours(-2)) { Write-Output 'stale'; exit 0 }; \
    Write-Output 'active' \
  }"`
  Pop $BBUIActiveMarkerExecResult
  Pop $BBUIActiveMarkerResult
  ${If} $BBUIActiveMarkerResult == "active"
    !insertmacro BB_SLOG "event=installer-active-marker state=active"
  ${ElseIf} $BBUIActiveMarkerResult == "stale"
    !insertmacro BB_SLOG "event=installer-active-marker state=stale"
  ${Else}
    !insertmacro BB_SLOG "event=installer-active-marker state=missing"
  ${EndIf}
!macroend

!macro BB_WRITE_ACTIVE_INSTALLER_MARKER
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$marker = Join-Path $$env:TEMP '${BB_ACTIVE_INSTALLER_MARKER}'; \
    Set-Content -LiteralPath $$marker -Encoding UTF8 -Value ('pid=' + $$PID + ';session=$BBUISessionId;started=' + (Get-Date -Format o)) \
  }"`
  Pop $BBUIActiveMarkerResult
!macroend

!macro BB_CLEAR_ACTIVE_INSTALLER_MARKER
  !ifndef BUILD_UNINSTALLER
    nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
      $$ErrorActionPreference = 'SilentlyContinue'; \
      Remove-Item -LiteralPath (Join-Path $$env:TEMP '${BB_ACTIVE_INSTALLER_MARKER}') -Force \
    }"`
    Pop $BBUIActiveMarkerResult
  !endif
!macroend

!macro BB_OVERRIDE_SINGLE_INSTANCE
!macroend

!macro BB_OVERRIDE_APP_CANNOT_BE_CLOSED_MESSAGE
  !pragma warning disable 6030
  LangString appCannotBeClosed 1033 "${BB_MSG_APP_CANNOT_BE_CLOSED_ZH}$\r$\n$\r$\n${BB_MSG_BLOCK_SEPARATOR}$\r$\n$\r$\n${BB_MSG_APP_CANNOT_BE_CLOSED_EN}"
  LangString appCannotBeClosed 2052 "${BB_MSG_APP_CANNOT_BE_CLOSED_ZH}$\r$\n$\r$\n${BB_MSG_BLOCK_SEPARATOR}$\r$\n$\r$\n${BB_MSG_APP_CANNOT_BE_CLOSED_EN}"
  !pragma warning default 6030
!macroend

!macro BB_INSTALLER_CUSTOM_HEADER
  !insertmacro BB_OVERRIDE_SINGLE_INSTANCE
  !insertmacro BB_OVERRIDE_APP_CANNOT_BE_CLOSED_MESSAGE
!macroend

!macro BB_RELEASE_INSTALL_DIR_OUTDIR
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  StrCpy $BBUICurrentOutDir "$PLUGINSDIR"
!macroend

; Resolve the machine's real native architecture (arm64 / x64 / x86) for diagnostics.
; Backed by IsWow64Process2 (via x64.nsh), so it reports the true hardware arch even when
; the installer runs under x86/x64 emulation. Replaces the old hardcoded "non-arm64" detail.
!macro BB_DETECT_NATIVE_ARCH _OUT
  ${If} ${IsNativeARM64}
    StrCpy ${_OUT} "arm64"
  ${ElseIf} ${RunningX64}
    StrCpy ${_OUT} "x64"
  ${Else}
    StrCpy ${_OUT} "x86"
  ${EndIf}
!macroend

!macro BB_INSTALLER_PREINIT
  !ifdef BUILD_UNINSTALLER
    StrCpy $BBUISessionId ""
    StrCpy $BBUIIsUpdated "0"
    StrCpy $BBUISessionLogResult ""
    StrCpy $BBUISessionLogPath "$TEMP\${BB_FALLBACK_LOG}"
    StrCpy $BBUIUninstallHadErrors "0"
    StrCpy $BBUIUninstallLogResult ""
    StrCpy $BBUIVerifyResourceResult ""
    StrCpy $BBUIUpdatedAppExitWaitResult ""
    StrCpy $BBUIActiveMarkerExecResult ""
    StrCpy $BBUIActiveMarkerResult ""
    StrCpy $BBUIStopResult ""
    StrCpy $BBUILockerListZh ""
    StrCpy $BBUILockerListEn ""
  !else
    !insertmacro BB_RELEASE_INSTALL_DIR_OUTDIR
    !insertmacro BB_SESSION_BEGIN
    !insertmacro BB_SLOG "event=installer-outdir-release outDir=$BBUICurrentOutDir instDir=$INSTDIR"
    ; Guard target/machine architecture as early as possible: this runs before customInit's
    ; registry heal/clear/repair, so a wrong-arch installer aborts without mutating an existing
    ; correct-arch install's registry or uninstaller state. (Sentry ELECTRON-3BX / code E1040)
    !insertmacro BB_ASSERT_TARGET_ARCH
    !insertmacro BB_BRING_UPDATED_INSTALLER_TO_FRONT
    !insertmacro BB_RECORD_ACTIVE_INSTALLER_MARKER
    !insertmacro BB_WRITE_ACTIVE_INSTALLER_MARKER
  !endif
!macroend

!macro BB_VERIFY_REQUIRED_FILE _PATH _LABEL
  ${IfNot} ${FileExists} "${_PATH}"
    !insertmacro BB_LOG_EVENT "verify-required-file missing label=${_LABEL} path=${_PATH}"
    !insertmacro BB_FAIL_UX \
      "${BB_E_CORE_APP_FILES_INCOMPLETE}" \
      "verify-required-file missing label=${_LABEL} path=${_PATH}" \
      "${BB_MSG_VERIFY_REQUIRED_FILE_ZH} ${_LABEL}" \
      "${BB_MSG_VERIFY_REQUIRED_FILE_EN} ${_LABEL}" \
      "${BB_MSG_VERIFY_REQUIRED_FILE_ACTION_ZH}" \
      "${BB_MSG_VERIFY_REQUIRED_FILE_ACTION_EN}" \
      "verify-required-file missing label=${_LABEL} path=${_PATH}" \
      "verify-required-file missing label=${_LABEL} path=${_PATH}"
  ${Else}
    !insertmacro BB_LOG_EVENT "verify-required-file ok label=${_LABEL} path=${_PATH}"
  ${EndIf}
!macroend

!macro BB_VERIFY_CORE_APP_FILES
  !insertmacro BB_LOG_EVENT "verify-install start instDir=$INSTDIR"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\BBUI.exe" "BBUI.exe"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\ffmpeg.dll" "ffmpeg.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\libEGL.dll" "libEGL.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\libGLESv2.dll" "libGLESv2.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\d3dcompiler_47.dll" "d3dcompiler_47.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\dxcompiler.dll" "dxcompiler.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\dxil.dll" "dxil.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\vk_swiftshader.dll" "vk_swiftshader.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\vulkan-1.dll" "vulkan-1.dll"
  !insertmacro BB_VERIFY_REQUIRED_FILE "$INSTDIR\resources\app.asar" "resources\app.asar"
!macroend

!macro BB_VERIFY_BUNDLED_BBCORE_RESOURCES _RUNTIME_KEY
  InitPluginsDir
  File "/oname=$PLUGINSDIR\verify-bundled-bbcore-install.ps1" "${PROJECT_DIR}\resources\windows\support\verify-bundled-bbcore-install.ps1"
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\verify-bundled-bbcore-install.ps1" -InstallDir "$INSTDIR" -RuntimeKey "${_RUNTIME_KEY}" -LogPath "$BBUISessionLogPath"`
  Pop $BBUIVerifyResourceResult

  ${If} $BBUIVerifyResourceResult != 0
    !insertmacro BB_FAIL_UX \
      "${BB_E_BUNDLED_BBCORE_INCOMPLETE}" \
      "event=session-end result=fail code=${BB_E_BUNDLED_BBCORE_INCOMPLETE} detail=bundled-bbcore-incomplete runtime=${_RUNTIME_KEY} result=$BBUIVerifyResourceResult" \
      "${BB_MSG_BUNDLED_BBCORE_INCOMPLETE_ZH}" \
      "${BB_MSG_BUNDLED_BBCORE_INCOMPLETE_EN}" \
      "${BB_MSG_BUNDLED_BBCORE_INCOMPLETE_ACTION_ZH}" \
      "${BB_MSG_BUNDLED_BBCORE_INCOMPLETE_ACTION_EN}" \
      "bundled-bbcore-incomplete runtime=${_RUNTIME_KEY} result=$BBUIVerifyResourceResult instDir=$INSTDIR" \
      "bundled-bbcore-incomplete runtime=${_RUNTIME_KEY} result=$BBUIVerifyResourceResult instDir=$INSTDIR"
  ${EndIf}
!macroend

!macro customInstall
  !insertmacro BB_VERIFY_CORE_APP_FILES
  !insertmacro BB_VERIFY_BUNDLED_BBCORE_RESOURCES "${BB_RUNTIME_KEY}"
  !insertmacro BB_LOG_EVENT "verify-install ok instDir=$INSTDIR"
  !insertmacro BB_CLEAR_ACTIVE_INSTALLER_MARKER
  !insertmacro BB_SESSION_SUCCESS
!macroend

!endif
