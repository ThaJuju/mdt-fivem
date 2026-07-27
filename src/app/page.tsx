export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-sm tracking-[0.3em] text-muted-foreground uppercase">
          Los Santos
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">MDT</h1>
        <p className="text-muted-foreground">Terminal de données mobile</p>
      </div>
    </div>
  );
}
