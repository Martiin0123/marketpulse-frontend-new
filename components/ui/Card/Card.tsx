import { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function Card({ title, description, footer, children }: Props) {
  return (
    <div className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
      <div className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-gray-400 text-sm">{description}</p>
          )}
        </div>
        {children}
      </div>
      {footer && (
        <div className="px-8 py-6 border-t border-gray-700 bg-gray-800/30 rounded-b-xl">
          <div className="text-gray-400 text-sm text-center">{footer}</div>
        </div>
      )}
    </div>
  );
}
