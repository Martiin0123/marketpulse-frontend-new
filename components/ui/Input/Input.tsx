import React, { InputHTMLAttributes, ChangeEvent } from 'react';
import cn from 'classnames';

interface Props extends Omit<InputHTMLAttributes<any>, 'onChange'> {
  className?: string;
  onChange: (value: string) => void;
}
const Input = (props: Props) => {
  const { className, children, onChange, ...rest } = props;

  const rootClassName = cn(
    'bg-black py-2 px-3 w-full appearance-none transition duration-150 ease-in-out border border-zinc-500 text-zinc-200 focus:outline-none',
    className
  );

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
    return null;
  };

  return (
    <label>
      <input
        className={rootClassName}
        onChange={handleOnChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        {...rest}
      />
    </label>
  );
};

export default Input;
