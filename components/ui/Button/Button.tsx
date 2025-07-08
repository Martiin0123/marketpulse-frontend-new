'use client';

import cn from 'classnames';
import React, { forwardRef, useRef, ButtonHTMLAttributes } from 'react';
import { mergeRefs } from 'react-merge-refs';

import LoadingDots from '@/components/ui/LoadingDots';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'slim' | 'flat';
  active?: boolean;
  width?: number;
  loading?: boolean;
  Component?: React.ComponentType;
}

const Button = forwardRef<HTMLButtonElement, Props>((props, buttonRef) => {
  const {
    className,
    variant = 'flat',
    children,
    active,
    width,
    loading = false,
    disabled = false,
    style = {},
    Component = 'button',
    ...rest
  } = props;
  const ref = useRef(null);

  const baseClasses =
    'bg-gradient-to-r from-blue-600 to-cyan-600 text-white cursor-pointer inline-flex px-8 rounded-full leading-6 transition-all duration-300 shadow-lg font-semibold text-center justify-center uppercase py-4 border border-transparent items-center hover:shadow-xl hover:scale-105 transform';
  const hoverClasses =
    'hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-700 hover:text-white hover:border-blue-500/50 hover:shadow-blue-500/25';
  const focusClasses =
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';
  const activeClasses =
    'active:scale-95 active:transition-transform active:duration-150';
  const slimClasses =
    variant === 'slim' ? 'py-3 px-6 transform-none normal-case text-sm' : '';
  const loadingClasses = loading
    ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-75'
    : '';
  const disabledClasses = disabled
    ? 'text-slate-400 border-slate-600 bg-slate-700 cursor-not-allowed opacity-50 grayscale'
    : '';

  const rootClassName = cn(
    baseClasses,
    hoverClasses,
    focusClasses,
    activeClasses,
    slimClasses,
    loadingClasses,
    disabledClasses,
    {
      'bg-gradient-to-r from-blue-700 to-cyan-700': active
    },
    className
  );

  return (
    <Component
      aria-pressed={active}
      data-variant={variant}
      ref={mergeRefs([ref, buttonRef])}
      className={rootClassName}
      disabled={disabled}
      style={{
        width,
        ...style
      }}
      {...rest}
    >
      {children}
      {loading && (
        <i className="flex pl-2 m-0">
          <LoadingDots />
        </i>
      )}
    </Component>
  );
});
Button.displayName = 'Button';

export default Button;
