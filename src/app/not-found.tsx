export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen surface-900">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <p className="text-2xl text-500 mt-4">Page Not Found</p>
      <a href="/" className="mt-6 text-primary hover:underline">
        Go back to home
      </a>
    </div>
  );
}
