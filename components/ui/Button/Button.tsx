'use client';

import cn from 'classnames';
import React, { forwardRef, useRef, ButtonHTMLAttributes } from 'react';
import { mergeRefs } from 'react-merge-refs';

import LoadingDots from '@/components/ui/LoadingDots';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'slim' | 'flat';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  width?: number;
  loading?: boolean;
  Component?: React.ComponentType;
}

const Button = forwardRef<HTMLButtonElement, Props>((props, buttonRef) => {
  const {
    className,
    variant = 'primary',
    size = 'md',
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

  // Base classes for all buttons
  const baseClasses =
    'inline-flex items-center justify-center font-semibold text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 border border-transparent cursor-pointer';

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-lg',
    lg: 'px-8 py-4 text-lg rounded-xl',
    xl: 'px-10 py-5 text-xl rounded-xl'
  };

  // Variant classes
  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transform',
    secondary:
      'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transform',
    outline:
      'bg-transparent border-2 border-blue-500 hover:border-blue-400 text-blue-400 hover:text-white hover:bg-blue-500/10',
    ghost:
      'bg-transparent border-2 border-slate-600 hover:border-slate-500 text-white hover:bg-slate-700/50',
    slim: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transform-none normal-case text-sm px-4 py-2 rounded-lg',
    flat: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transform px-8 py-4 rounded-full leading-6 font-semibold text-center uppercase'
  };

  // Active state classes
  const activeClasses = active
    ? 'bg-gradient-to-r from-blue-700 to-cyan-700'
    : '';

  // Loading state classes
  const loadingClasses = loading
    ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-75'
    : '';

  // Disabled state classes
  const disabledClasses = disabled
    ? 'text-slate-400 border-slate-600 bg-slate-700 cursor-not-allowed opacity-50 grayscale'
    : '';

  const rootClassName = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    activeClasses,
    loadingClasses,
    disabledClasses,
    className
  );

  return (
    <Component
      aria-pressed={active}
      data-variant={variant}
      data-size={size}
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
