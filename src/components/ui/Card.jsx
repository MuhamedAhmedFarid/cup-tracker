export function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
}
