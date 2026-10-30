; x64 architecture entry for the NSIS installer.

!include "x64.nsh"

!define BB_TARGET_ARCH "x64"
!define BB_RUNTIME_KEY "win32-x64"
!define BB_EXTRACT_METHOD "7z"

!addincludedir "${PROJECT_DIR}\resources\windows"
!include "installer-common.nsh"

!macro customHeader
  !insertmacro BB_INSTALLER_CUSTOM_HEADER
!macroend

!macro preInit
  !insertmacro BB_INSTALLER_PREINIT
!macroend

!macro customFiles_x64
  !insertmacro BB_LOG_EXTRACT_RESULT "7z"
!macroend

; Architecture guard. Inserted from BB_INSTALLER_PREINIT (preInit) so it runs before any
; registry mutation, replacing the old .onVerifyInstDir placement which fired after customInit
; had already healed/cleared/repaired an existing install's registry. (Sentry ELECTRON-3BX)
; Rejection policy is unchanged: an x64 build refuses both x86 and ARM64 machines.
!macro BB_ASSERT_TARGET_ARCH
  Var /GLOBAL BBUIActualArch
  ${If} ${IsNativeARM64}
    !insertmacro BB_DETECT_NATIVE_ARCH $BBUIActualArch
    !insertmacro BB_FAIL_UX \
      "${BB_E_ARCH_MISMATCH}" \
      "target=x64 actual=$BBUIActualArch" \
      "${BB_MSG_ARCH_MISMATCH_ZH}" \
      "${BB_MSG_ARCH_MISMATCH_EN}" \
      "${BB_MSG_ARCH_MISMATCH_ACTION_ZH}" \
      "${BB_MSG_ARCH_MISMATCH_ACTION_EN}" \
      "target=x64 actual=$BBUIActualArch" \
      "target=x64 actual=$BBUIActualArch"
  ${ElseIfNot} ${RunningX64}
    !insertmacro BB_DETECT_NATIVE_ARCH $BBUIActualArch
    !insertmacro BB_FAIL_UX \
      "${BB_E_ARCH_MISMATCH}" \
      "target=x64 actual=$BBUIActualArch" \
      "${BB_MSG_ARCH_MISMATCH_ZH}" \
      "${BB_MSG_ARCH_MISMATCH_EN}" \
      "${BB_MSG_ARCH_MISMATCH_ACTION_ZH}" \
      "${BB_MSG_ARCH_MISMATCH_ACTION_EN}" \
      "target=x64 actual=$BBUIActualArch" \
      "target=x64 actual=$BBUIActualArch"
  ${EndIf}
!macroend
