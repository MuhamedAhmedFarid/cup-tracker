export function Progress({ value = 0, className = "" }) {
  return (
    <div className={`w-full h-3 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
