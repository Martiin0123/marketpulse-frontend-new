const LoadingDots = () => {
  return (
    <span className="inline-flex text-center items-center leading-7">
      <span
        className="bg-zinc-200 rounded-full h-2 w-2 animate-pulse"
        style={{ animationDelay: '0s' }}
      />
      <span
        className="bg-zinc-200 rounded-full h-2 w-2 animate-pulse"
        style={{ animationDelay: '0.2s' }}
      />
      <span
        className="bg-zinc-200 rounded-full h-2 w-2 animate-pulse"
        style={{ animationDelay: '0.4s' }}
      />
    </span>
  );
};

export default LoadingDots;
