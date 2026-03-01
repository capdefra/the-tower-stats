const BASE = import.meta.env.BASE_URL;

export default function EnemyIcon({ name, size = 20, className = '' }) {
  if (!name) return <span className="text-gray-500">—</span>;

  const slug = name.toLowerCase();
  const src = `${BASE}enemy-icons/${slug}.svg`;

  return (
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.insertAdjacentText('afterend', name);
      }}
    />
  );
}
