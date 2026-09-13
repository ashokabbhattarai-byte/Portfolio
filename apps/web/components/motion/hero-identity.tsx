export function HeroIdentity({ name }: { name: string }) {
  return (
    <div className="hero-identity">
      <p className="hero-name">{name}</p>
    </div>
  );
}
