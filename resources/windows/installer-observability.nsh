!ifndef BB_INSTALLER_OBSERVABILITY_NSH
!define BB_INSTALLER_OBSERVABILITY_NSH

!define BB_APP_EXECUTABLE_FILENAME "BBUI.exe"
!define BB_FALLBACK_LOG "bb-installer-${VERSION}-fallback-log.jsonl"

!pragma warning disable 6001
Var /GLOBAL BBUISessionId
Var /GLOBAL BBUIIsUpdated
Var /GLOBAL BBUISessionLogResult
Var /GLOBAL BBUISessionLogPath

!macro BB_SESSION_HEADER
  !insertmacro BB_SLOG "event=header arch=${BB_TARGET_ARCH} updated=$BBUIIsUpdated instDir=$INSTDIR version=${VERSION} log=$BBUISessionLogPath detail=customHeader"
!macroend

!macro BB_SLOG _MESSAGE
  Push $9
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$session = '$BBUISessionId'; \
    if (-not $$session) { $$session = 'uninitialized' }; \
    $$message = '${_MESSAGE}'; \
    $$event = 'log'; \
    if ($$message -match '(^|\s)event=([^\s]+)') { $$event = $$Matches[2] } else { $$first = @($$message -split '\s+', 2)[0]; if ($$first -and $$first -notmatch '=') { $$event = $$first } }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = $$session; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = $$event; message = $$message }; \
    $$json = $$payload | ConvertTo-Json -Compress -Depth 8; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value $$json \
  }"`
  Pop $9
  Pop $9
!macroend

!macro BB_LOG_EVENT _MESSAGE
  Push $9
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$session = '$BBUISessionId'; \
    if (-not $$session) { $$session = 'uninitialized' }; \
    $$message = '${_MESSAGE}'; \
    $$event = 'log'; \
    if ($$message -match '(^|\s)event=([^\s]+)') { $$event = $$Matches[2] } else { $$first = @($$message -split '\s+', 2)[0]; if ($$first -and $$first -notmatch '=') { $$event = $$first } }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = $$session; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = $$event; message = $$message }; \
    $$json = $$payload | ConvertTo-Json -Compress -Depth 8; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value $$json \
  }"`
  Pop $9
  Pop $9
!macroend

!macro BB_LOG_JSON_EVENT _EVENT _JSON_FIELDS
  Push $9
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$ErrorActionPreference = 'SilentlyContinue'; \
    $$log = '$BBUISessionLogPath'; \
    if (-not $$log) { $$log = Join-Path $$env:TEMP '${BB_FALLBACK_LOG}' }; \
    $$session = '$BBUISessionId'; \
    if (-not $$session) { $$session = 'uninitialized' }; \
    $$payload = [ordered]@{ schemaVersion = 1; ts = (Get-Date -Format o); session = $$session; version = '${VERSION}'; arch = '${BB_TARGET_ARCH}'; updated = ('$BBUIIsUpdated' -eq '1'); instDir = '$INSTDIR'; event = '${_EVENT}' }; \
    ${_JSON_FIELDS}; \
    $$json = $$payload | ConvertTo-Json -Compress -Depth 8; \
    Add-Content -LiteralPath $$log -Encoding UTF8 -Value $$json \
  }"`
  Pop $9
  Pop $9
!macroend

!macro BB_SESSION_BEGIN
  ${GetParameters} $R9
  ClearErrors
  ${GetOptions} $R9 "--installer-log=" $R8
  ${IfNot} ${Errors}
    StrCpy $BBUISessionLogPath $R8
  ${EndIf}
  ClearErrors
  ${GetOptions} $R9 "--installer-session=" $R8
  ${IfNot} ${Errors}
    StrCpy $BBUISessionId $R8
  ${EndIf}

  ${If} $BBUISessionLogPath == ""
    nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$$id = '$BBUISessionId'; if (-not $$id) { $$id = [guid]::NewGuid().ToString('N').Substring(0,12) }; $$stamp = Get-Date -Format 'yyyyMMdd'; $$name = 'bb-installer-${VERSION}-' + $$stamp + '-log.jsonl'; $$log = Join-Path $$env:TEMP $$name; [Console]::Out.Write($$id + '|' + $$log)"`
    Pop $BBUISessionLogResult
    Pop $BBUISessionLogResult
    StrCpy $BBUISessionId $BBUISessionLogResult 12
    StrCpy $BBUISessionLogPath $BBUISessionLogResult 1024 13
  ${ElseIf} $BBUISessionId == ""
    nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "[Console]::Out.Write([guid]::NewGuid().ToString('N').Substring(0,12))"`
    Pop $BBUISessionLogResult
    Pop $BBUISessionLogResult
    StrCpy $BBUISessionId $BBUISessionLogResult
  ${EndIf}

  ClearErrors
  ${GetOptions} $R9 "--updated" $R8
  StrCpy $BBUIIsUpdated "0"
  ${IfNot} ${Errors}
    StrCpy $BBUIIsUpdated "1"
  ${EndIf}

  !insertmacro BB_SLOG "event=session-begin detail=preInit"
!macroend

!macro BB_LOG_EXTRACT_RESULT _METHOD
  ${IfNot} ${FileExists} "$INSTDIR\BBUI.exe"
    !insertmacro BB_FAIL_UX \
      "${BB_E_EXTRACT_FAILED}" \
      "event=extract result=fail method=${_METHOD} missing=BBUI.exe" \
      "${BB_MSG_EXTRACT_FAILED_ZH}" \
      "${BB_MSG_EXTRACT_FAILED_EN}" \
      "${BB_MSG_EXTRACT_FAILED_ACTION_ZH}" \
      "${BB_MSG_EXTRACT_FAILED_ACTION_EN}" \
      "extract result=fail method=${_METHOD} missing=BBUI.exe instDir=$INSTDIR" \
      "extract result=fail method=${_METHOD} missing=BBUI.exe instDir=$INSTDIR"
  ${Else}
    !insertmacro BB_SLOG "event=extract result=ok method=${_METHOD} detail=customFiles_${BB_TARGET_ARCH}"
  ${EndIf}
!macroend

!macro BB_SESSION_SUCCESS
  !insertmacro BB_SLOG "event=session-end result=success detail=customInstall"
!macroend

!endif
