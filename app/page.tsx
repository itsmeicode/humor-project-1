import { supabase } from '@/lib/supabaseClient';

type ImageRow = {
  id: string | number;
  url: string;
};

export default async function Home() {
  const { data, error } = await supabase
    .from('images')
    .select('id, url') as unknown as { data: ImageRow[] | null; error: any };

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Images</h1>
        <p className="text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Images</h1>
        <p className="text-gray-600">No images found.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="mb-6 text-3xl font-bold">Images</h1>
      <div className="grid w-full max-w-4xl grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {data.map((img) => (
          <div
          key={img.id}
          className="rounded-lg border border-gray-200 bg-white p-2"
        >
          <img
            src={img.url}
            alt=""
            className="h-40 w-full rounded-md object-cover"
          />
        </div>
        ))}
      </div>
    </main>
  );
}
