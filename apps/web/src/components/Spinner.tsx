export default function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
  );
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Spinner />
    </div>
  );
}
