/**
 * @license
 * Copyright 2025 BBUI (bbui.dev)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BBUI 基础组件库统一导出 / BBUI base components unified exports
 *
 * 提供所有基础组件和类型的统一导出入口
 * Provides unified export entry for all base components and types
 */

// ==================== 组件导出 / Component Exports ====================

export { default as BbModal } from './BbModal';
export { default as BbCollapse } from './BbCollapse';
export { default as BbSelect } from './BbSelect';
export { default as BbScrollArea } from './BbScrollArea';
export { default as BbSteps } from './BbSteps';
export { default as BbSearchInput } from './BbSearchInput';
export { default as BbInlineSearchInput } from './BbInlineSearchInput';

// ==================== 类型导出 / Type Exports ====================

// BbModal 类型 / BbModal types
export type { ModalSize, ModalHeaderConfig, ModalFooterConfig, ModalContentStyleConfig, BbModalProps } from './BbModal';
export { MODAL_SIZES } from './BbModal';

// BbCollapse 类型 / BbCollapse types
export type { BbCollapseProps, BbCollapseItemProps } from './BbCollapse';

// BbSelect 类型 / BbSelect types
export type { BbSelectProps } from './BbSelect';

// BbSteps 类型 / BbSteps types
export type { BbStepsProps } from './BbSteps';

// BbSearchInput 类型 / BbSearchInput types
export type { BbSearchInputProps } from './BbSearchInput';

// BbInlineSearchInput 类型 / BbInlineSearchInput types
export type { BbInlineSearchInputProps } from './BbInlineSearchInput';
